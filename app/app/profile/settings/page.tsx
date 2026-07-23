"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Save, User, Phone, Upload, Loader2, Mail, Crop as CropIcon } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image"
import Swal from "sweetalert2"
import { doc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { uploadFileToStorage } from "@/lib/storage-utils"
import { compressImage, getCroppedImg } from "@/lib/image-utils"
import Cropper from "react-easy-crop" // [!code highlight]
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhoneInput } from "@/components/ui/phone-input"
import { SUPPORTED_COUNTRIES, validatePhoneNumber } from "@/lib/phone-utils"
import { CountryCode } from "libphonenumber-js"

export default function ProfileSettingsPage() {
  const { currentUser, userData, loading: authLoading, refreshUserData } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Form State
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("LK")
  
  // Image Files (Final compressed files to upload)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState("")

  // --- CROPPER STATE ---
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [croppingTarget, setCroppingTarget] = useState<'profile' | 'cover' | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  // Load Initial Data
  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "")
      setPhone(userData.phoneNumber || "")
      setCountry(userData.country || "LK")
    }
  }, [userData])

  // --- 1. HANDLE FILE SELECTION ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      
      if (!validTypes.includes(file.type)) {
        Swal.fire({ icon: 'error', title: 'Unsupported File', text: 'Please upload a JPG, PNG, or WebP image.' })
        return
      }

      // Read file to URL for the Cropper
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null)
        setCroppingTarget(type)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setCropModalOpen(true)
      })
      reader.readAsDataURL(file)
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '' 
  }

  // --- 2. CROPPER UTILS ---
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels || !croppingTarget) return

      // 1. Get cropped blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (!croppedBlob) return

      // 2. Convert to File and Compress
      const fileName = `${croppingTarget}_temp.png`
      const fileToCompress = new File([croppedBlob], fileName, { type: "image/png" })
      const compressedFile = await compressImage(fileToCompress)
      const previewUrl = URL.createObjectURL(compressedFile)

      // 3. Set State based on target
      if (croppingTarget === 'profile') {
        setProfileFile(compressedFile)
        setProfilePreview(previewUrl)
      } else {
        setCoverFile(compressedFile)
        setCoverPreview(previewUrl)
      }

      // 4. Close Modal
      setCropModalOpen(false)
      setImageSrc(null)
    } catch (e) {
      console.error(e)
      Swal.fire({ icon: 'error', title: 'Crop Failed', text: 'Could not crop image.' })
    }
  }

  // --- SAVE LOGIC (Uploads to Firebase) ---
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setIsLoading(true)

    // Validate phone number against chosen country code if inputted
    if (phone) {
      const isValid = validatePhoneNumber(phone, country as CountryCode);
      if (!isValid) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: `The entered phone number is not valid for ${SUPPORTED_COUNTRIES.find(c => c.code === country)?.name || country}.`,
          confirmButtonColor: '#1C4D8D',
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const updates: any = {
        displayName: displayName,
        phoneNumber: phone,
        country: country,
      }

      const studioID = userData?.studioID
      const basePath = studioID
        ? `Studios/${studioID}/Users/${currentUser.uid}`
        : `Users/${currentUser.uid}`

      // Upload both images in parallel; use allSettled so one failure doesn't block the other
      const [profileResult, coverResult] = await Promise.allSettled([
        profileFile ? uploadFileToStorage(`${basePath}/profile.jpg`, profileFile) : Promise.resolve(null),
        coverFile   ? uploadFileToStorage(`${basePath}/cover.jpg`,   coverFile)   : Promise.resolve(null),
      ])

      if (profileResult.status === 'fulfilled' && profileResult.value) updates.photoURL  = profileResult.value
      if (coverResult.status   === 'fulfilled' && coverResult.value)   updates.coverURL  = coverResult.value

      const failedUploads = [profileResult, coverResult].filter(r => r.status === 'rejected')
      if (failedUploads.length > 0) {
        console.error("Some image uploads failed:", failedUploads)
      }

      await updateDoc(doc(db, "Users", currentUser.uid), updates)
      await refreshUserData()

      setIsLoading(false)

      const failedCount = [profileResult, coverResult].filter(r => r.status === 'rejected').length
      Swal.fire({
        title: failedCount > 0 ? 'Partially Updated' : 'Success!',
        text: failedCount > 0
          ? `Profile saved, but ${failedCount} image upload(s) failed. Please try re-uploading your images.`
          : 'Your profile has been updated successfully.',
        icon: failedCount > 0 ? 'warning' : 'success',
        confirmButtonColor: '#1C4D8D',
        confirmButtonText: 'OK'
      })

      setProfileFile(null)
      setCoverFile(null)
      
    } catch (error) {
      console.error("Update Error:", error)
      setIsLoading(false)
      Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Something went wrong.' })
    }
  }

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#1C4D8D]"/></div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* --- CROP MODAL --- */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Adjust {croppingTarget === 'profile' ? 'Profile Picture' : 'Cover Image'}</DialogTitle>
                <DialogDescription>Drag to position and use the slider to zoom.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[350px] bg-slate-900 rounded-md overflow-hidden">
                {imageSrc && (
                    <div className="absolute inset-0">
                        <Cropper 
                            image={imageSrc} 
                            crop={crop} 
                            zoom={zoom} 
                            // Profile = 1:1, Cover = 3:1 (Wide)
                            aspect={croppingTarget === 'profile' ? 1 : 3} 
                            onCropChange={setCrop} 
                            onCropComplete={onCropComplete} 
                            onZoomChange={setZoom} 
                            objectFit={croppingTarget === 'profile' ? 'contain' : 'horizontal-cover'}
                        />
                    </div>
                )}
            </div>
            <div className="py-4">
                <Label className="text-xs mb-2 block">Zoom</Label>
                <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCropModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCropSave} className="bg-[#1C4D8D] text-white">
                    <CropIcon className="w-4 h-4 mr-2" />Crop & Set
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold text-[#0F2854]">Edit Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and appearance.</p>
      </div>

      <form onSubmit={handleSaveChanges} className="space-y-6">
        
        {/* 1. IMAGES SECTION */}
        <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Pic */}
            <Card>
                <CardHeader><CardTitle className="text-base">Profile Picture</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="relative w-32 h-32">
                        <Avatar className="w-32 h-32 border-4 border-slate-100 shadow-sm">
                            <AvatarImage src={profilePreview || userData?.photoURL || ""} className="object-cover" />
                            <AvatarFallback className="bg-[#1C4D8D] text-white text-2xl">{(displayName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <label htmlFor="profile-upload" className="absolute bottom-0 right-0 p-2 bg-[#1C4D8D] text-white rounded-full cursor-pointer hover:bg-[#1C4D8D]/90 shadow-md transition-colors">
                            <Camera className="h-4 w-4" />
                            <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'profile')} />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 text-center">Click to crop and upload.<br/>JPG, PNG or GIF.</p>
                </CardContent>
            </Card>

            {/* Cover Pic */}
            <Card>
                <CardHeader><CardTitle className="text-base">Cover Image</CardTitle></CardHeader>
                <CardContent>
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                        <Image 
                            src={coverPreview || userData?.coverURL || "/images/background/profile-cover.jpg"} 
                            alt="Cover" 
                            fill 
                            className="object-cover transition-opacity group-hover:opacity-75" 
                        />
                        <label htmlFor="cover-upload" className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <div className="bg-white/90 px-3 py-1.5 rounded text-xs font-medium shadow flex items-center gap-2">
                                <Upload className="h-3 w-3"/> Change Cover
                            </div>
                            <input id="cover-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 text-center">Recommended size: 1200x400px.</p>
                </CardContent>
            </Card>
        </div>

        {/* 2. DETAILS SECTION */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#1C4D8D]"/> Basic Information</CardTitle>
                <CardDescription>Update your contact details visible to the team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Default Country</Label>
                        <Select value={country} onValueChange={(val) => setCountry(val)}>
                            <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-700 h-9">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {SUPPORTED_COUNTRIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        <span className="mr-2">{c.flag}</span>
                                        <span className="font-medium">{c.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <PhoneInput
                            id="phone"
                            value={phone}
                            onChange={(val) => setPhone(val)}
                            placeholder="Enter phone number"
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input value={userData?.email || ""} disabled className="pl-9 bg-slate-50 text-slate-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Email address is managed by the system admin.</p>
                </div>
            </CardContent>
        </Card>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" className="bg-[#1C4D8D] min-w-[140px]" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                Save Changes
            </Button>
        </div>

      </form>
    </div>
  )
}