"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Camera, Upload, Mail, User, Shield, Plus, Calendar, 
  Loader2, Crop as CropIcon, Lock, ChevronLeft, ChevronRight, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import Swal from 'sweetalert2'
import Cropper from "react-easy-crop"
import { getCroppedImg, compressImage } from "@/lib/image-utils"
import { uploadFileToStorage } from "@/lib/storage-utils"
import { logAuditAction } from "@/lib/logger"

interface SecondaryAdmin {
  id: string
  name: string
  email: string
  enabled: boolean
  addedAt: string
  lastLogin?: string
}

export default function RootAdminProfile() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profilePicPreview, setProfilePicPreview] = useState("")
  const [accountCreated, setAccountCreated] = useState<string>(new Date().toISOString())

  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")

  const [adminsList, setAdminsList] = useState<SecondaryAdmin[]>([])
  
  const [activeTab, setActiveTab] = useState<"active" | "disabled">("active")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [readyToUploadFile, setReadyToUploadFile] = useState<File | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        setProfileEmail(user.email || "")
        try {
          let userDocRef = doc(db, "SuperAdmins", user.uid)
          let userSnap = await getDoc(userDocRef)
          if (userSnap.exists()) {
            const data = userSnap.data()
            setProfileName(data.name || "")
            setProfilePicPreview(data.profileImage || "")
            if (data.createdAt) {
               setAccountCreated(data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt)
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const fetchAdmins = useCallback(async () => {
    try {
      const q = query(collection(db, "SuperAdmins"), where("type", "==", "admin_profile"))
      const querySnapshot = await getDocs(q)
      
      const fetchedAdmins: SecondaryAdmin[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedAdmins.push({
          id: doc.id,
          name: data.name || data.displayName || "Unknown",
          email: data.email || "",
          enabled: data.disabled !== true, 
          addedAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          lastLogin: data.lastLogin || null
        })
      })
      setAdminsList(fetchedAdmins)
    } catch (error) {
      console.error("Error fetching admins:", error)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleSaveProfile = async () => {
    if (!currentUser) return
    setSaving(true)
    try {
      let downloadURL = profilePicPreview
      if (readyToUploadFile) {
        const storagePath = `Admin/profile/${currentUser.uid}/profile_image.jpg` 
        downloadURL = await uploadFileToStorage(storagePath, readyToUploadFile, { contentType: 'image/jpeg' })
      }
      
      const userDocRef = doc(db, "SuperAdmins", currentUser.uid)
      await setDoc(userDocRef, {
        name: profileName,
        profileImage: downloadURL,
      }, { merge: true })

      await logAuditAction(
        "UPDATE_PROFILE",
        `Updated root profile name to ${profileName}`,
        currentUser,
        "AdminProfile"
      )

      Swal.fire({ icon: 'success', title: 'Profile Updated', text: 'Changes saved successfully.', timer: 2000, showConfirmButton: false })
      setReadyToUploadFile(null)
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to save profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddSecondaryAdmin = async () => {
    if (!newAdminEmail || !newAdminName || !newAdminPassword) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in Name, Email, and Password.' })
      return
    }

    Swal.fire({
      title: 'Creating Admin...',
      text: 'Please wait while we register the account.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() }
    })

    try {
      if (!auth.currentUser) throw new Error("You are not logged in.");
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("https://registeradmin-g33n26zifq-uc.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          data: { 
            email: newAdminEmail,
            password: newAdminPassword,
            name: newAdminName,
            role: "admin"
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        let errorMessage = "Failed to create admin";
        if (data.message) errorMessage = data.message;
        else if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
        }
        throw new Error(errorMessage)
      }

      await logAuditAction(
        "CREATE_ADMIN",
        `Created new secondary admin: ${newAdminEmail} (${newAdminName})`,
        currentUser,
        "AdminManagement"
      )

      await fetchAdmins()
      setNewAdminEmail("")
      setNewAdminName("")
      setNewAdminPassword("")
      Swal.fire({ icon: 'success', title: 'Admin Added', text: 'The secondary admin account has been created successfully.' })

    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Registration Failed', text: error.message })
    }
  }

  const handleToggleStatus = async (id: string, currentlyEnabled: boolean) => {
    const setDbDisabled = currentlyEnabled; 
    const actionLabel = currentlyEnabled ? "Disable" : "Enable";

    Swal.fire({
      title: `${actionLabel} Access?`,
      text: currentlyEnabled ? "This admin will no longer be able to log in." : "This admin will regain access.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: currentlyEnabled ? '#d33' : '#10b981',
      confirmButtonText: `Yes, ${actionLabel}`
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const userRef = doc(db, "SuperAdmins", id);
          await updateDoc(userRef, {
            disabled: setDbDisabled
          });

          if (currentUser) {
              await logAuditAction(
                currentlyEnabled ? "DISABLE_ADMIN" : "ENABLE_ADMIN",
                `Changed status for admin ID ${id} to ${currentlyEnabled ? "Disabled" : "Active"}`,
                currentUser,
                "AdminManagement"
              )
          }

          setAdminsList(prev => prev.map(admin => 
            admin.id === id ? { ...admin, enabled: !currentlyEnabled } : admin
          ))
          
          Swal.fire('Success', `User access updated.`, 'success');
        } catch (e: any) {
          console.error(e);
          Swal.fire('Error', 'Could not update database.', 'error');
        }
      }
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        Swal.fire({ icon: 'error', title: 'Unsupported File', text: 'Please upload a JPG, PNG, or WebP image.', confirmButtonColor: '#1C4D8D' })
        return
      }
      const imageDataUrl = URL.createObjectURL(file)
      setImageSrc(imageDataUrl)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
      setCropModalOpen(true)
    }
  }
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => { setCroppedAreaPixels(croppedAreaPixels) }, [])
  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedBlob) {
        const fileToCompress = new File([croppedBlob], "profile_temp.png", { type: "image/png" })
        const compressedFile = await compressImage(fileToCompress)
        setReadyToUploadFile(compressedFile)
        setProfilePicPreview(URL.createObjectURL(compressedFile))
        setCropModalOpen(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredAdmins = adminsList.filter(admin => 
    activeTab === "active" ? admin.enabled : !admin.enabled
  )
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredAdmins.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage)

  const handleTabChange = (tab: "active" | "disabled") => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
  }

  return (
    <div className="flex-1 space-y-8 p-8 max-w-7xl mx-auto">
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Adjust Profile Picture</DialogTitle>
                <DialogDescription>Drag to position and use the slider to zoom.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[300px] bg-slate-900 rounded-md overflow-hidden">
                {imageSrc && (<div className="absolute inset-0"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} objectFit="contain" /></div>)}
            </div>
            <div className="py-4"><Label className="text-xs mb-2 block">Zoom</Label><Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} /></div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCropModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCropSave} className="bg-[#1C4D8D] text-white"><CropIcon className="w-4 h-4 mr-2" />Crop & Preview</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Root Admin Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your administrator account and access levels.</p>
        </div>
        <Badge variant="outline" className="bg-[#1C4D8D] text-white border-[#1C4D8D] px-4 py-2 text-sm">
          <Shield className="h-4 w-4 mr-2" /> Super Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1 border-none shadow-lg h-fit">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#1C4D8D]" /> Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className={cn("w-32 h-32 rounded-full border-4 border-[#1C4D8D]/20 overflow-hidden flex items-center justify-center relative", profilePicPreview ? "bg-slate-100" : "bg-gradient-to-br from-[#1C4D8D] to-[#4988C4]")}>
                  {profilePicPreview ? <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-white">{profileName ? profileName.charAt(0).toUpperCase() : "A"}</span>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="h-8 w-8 text-white/80" /></div>
                </div>
                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 p-2 bg-[#1C4D8D] rounded-full cursor-pointer hover:bg-[#4988C4] transition-colors shadow-lg z-10">
                  <Camera className="h-4 w-4 text-white" />
                  <input id="profile-upload" type="file" accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" onChange={handleFileSelect} onClick={(e: any) => { e.target.value = null }} />
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="email">Primary Email</Label><Input id="email" value={profileEmail} disabled className="bg-slate-50" /></div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full bg-[#1C4D8D] hover:bg-[#4988C4] text-white" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Upload className="h-4 w-4 mr-2" />Save Changes</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 border-none shadow-lg h-fit">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-[#1C4D8D]" /> Create New Admin</CardTitle>
            <CardDescription>Grant full administrative privileges to a new user.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label htmlFor="new-admin-name">Full Name <span className="text-red-500">*</span></Label><Input id="new-admin-name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Jane Doe" /></div>
                <div className="space-y-2"><Label htmlFor="new-admin-email">Email Address <span className="text-red-500">*</span></Label><Input id="new-admin-email" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@shutterstudio.com" /></div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="new-admin-password">Temporary Password <span className="text-red-500">*</span></Label>
                    <div className="relative"><Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="new-admin-password" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="••••••••" className="pl-10" /></div>
                    <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters.</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleAddSecondaryAdmin} disabled={!newAdminEmail || !newAdminName || !newAdminPassword} className="bg-[#1C4D8D] hover:bg-[#4988C4] text-white"><Plus className="h-4 w-4 mr-2" /> Create Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-slate-50/50 pb-0">
          <CardTitle className="flex items-center gap-2 mb-4"><Shield className="h-5 w-5 text-[#1C4D8D]" /> Admin Directory</CardTitle>
          <div className="flex space-x-6">
             <button onClick={() => handleTabChange("active")} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", activeTab === "active" ? "border-[#1C4D8D] text-[#1C4D8D]" : "border-transparent text-muted-foreground")}>
                <div className="w-2 h-2 rounded-full bg-green-500" />Active Admins
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{adminsList.filter(a => a.enabled).length}</Badge>
             </button>
             <button onClick={() => handleTabChange("disabled")} className={cn("pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", activeTab === "disabled" ? "border-slate-500 text-slate-600" : "border-transparent text-muted-foreground")}>
                <div className="w-2 h-2 rounded-full bg-slate-300" />Disabled / Suspended
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{adminsList.filter(a => !a.enabled).length}</Badge>
             </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[300px]">
            {filteredAdmins.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground"><Mail className="h-10 w-10 mb-2 opacity-20" /><p>No {activeTab} admins found.</p></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Admin Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Added Date</th><th className="px-6 py-4">Last Login</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Access Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map((admin) => (
                                <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#1C4D8D]/10 flex items-center justify-center text-[#1C4D8D] font-bold text-xs">{admin.name.charAt(0).toUpperCase()}</div>{admin.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{admin.email}</td>
                                    <td className="px-6 py-4 text-slate-500"><div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(admin.addedAt).toLocaleDateString()}</div></td>
                                    <td className="px-6 py-4 text-slate-500"><div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() + " " + new Date(admin.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Never"}</div></td>
                                    <td className="px-6 py-4 text-center"><Badge variant="outline" className={cn("font-normal", admin.enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{admin.enabled ? "Active" : "Revoked"}</Badge></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2"><Label htmlFor={`switch-${admin.id}`} className="text-xs text-muted-foreground mr-2 cursor-pointer">{admin.enabled ? "Enabled" : "Disabled"}</Label><Switch id={`switch-${admin.id}`} checked={admin.enabled} onCheckedChange={() => handleToggleStatus(admin.id, admin.enabled)} /></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between bg-slate-50/30">
                <p className="text-xs text-muted-foreground">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAdmins.length)} of {filteredAdmins.length}</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium px-2">Page {currentPage}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}