"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, Search, Plus, MoreHorizontal, 
  Pencil, Ban, Check, Loader2, UserCog, AlertTriangle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Globe 
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Swal from "sweetalert2"
import { db, auth } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { logAuditAction } from "@/lib/logger"
import { format } from "date-fns"
import { safeDate } from "@/lib/date-utils"
import { validateSlug, isSlugAvailable } from "@/services/studio-service"

// --- CLOUD FUNCTION ENDPOINTS ---
const REGISTER_USER_API = process.env.NEXT_PUBLIC_CF_REGISTER_USER ?? "https://registeruser-g33n26zifq-uc.a.run.app"
const ENABLE_USER_API   = process.env.NEXT_PUBLIC_CF_ENABLE_USER   ?? "https://enableuser-g33n26zifq-uc.a.run.app"
const DISABLE_USER_API  = process.env.NEXT_PUBLIC_CF_DISABLE_USER  ?? "https://disableuser-g33n26zifq-uc.a.run.app"


// --- TYPES ---
interface StudioData {
  id: string
  name: string
  email: string
  slug?: string
  package: string // Display only
  status: "Active" | "Suspended"
  address: string
  phone?: string
  website?: string
  owner_uid: string
  regDate: string // Display only
  isMapped: boolean
}

interface StudioMember {
  uid: string
  name: string
  email: string
  role: string
}

interface WizardData {
  studioName: string
  studioSlug: string
  studioAddress: string
  studioPhone: string
  studioWebsite: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  ownerPhone: string
}

const INITIAL_WIZARD: WizardData = {
  studioName: "", studioSlug: "", studioAddress: "", studioPhone: "", studioWebsite: "",
  ownerName: "", ownerEmail: "", ownerPassword: "", ownerPhone: ""
}

const ITEMS_PER_PAGE = 20

export default function StudiosPage() {
  const { currentUser } = useAuth()
  const [studios, setStudios] = useState<StudioData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<WizardData>(INITIAL_WIZARD)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Slug validation state (shared between wizard and edit)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit & Transfer State
  const [editingStudio, setEditingStudio] = useState<StudioData | null>(null)
  const [editSlug, setEditSlug] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [availableMembers, setAvailableMembers] = useState<StudioMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const studiosSnap = await getDocs(collection(db, "Studios"))
        
        const fetchedStudios = await Promise.all(studiosSnap.docs.map(async (docSnap) => {
           const d = docSnap.data()
           const studioId = docSnap.id

           // Fetch Subscription Config to show package status in table
           // (Read-only for this page)
           const configRef = doc(db, `Studios/${studioId}/Subscription/config`)
           const configSnap = await getDoc(configRef)
           const config = configSnap.exists() ? configSnap.data() : null

           const isMapped = !!config
           const packageName = config?.packageName || "Unassigned"
           
           // Use mapped date if available, else created date
           const rawDate = config?.regDate || d.createdAt
           const displayRegDate = format(safeDate(rawDate), "MMM dd, yyyy")

           return {
             id: studioId,
             name: d.name || "Unnamed Studio",
             email: d.email || "",
             slug: d.slug || "",
             package: packageName,
             status: d.status || "Active", 
             address: d.address || "",
             phone: d.phone || "",
             website: d.website || "",
             owner_uid: d.owner_uid || "",
             regDate: displayRegDate,
             isMapped
           } as StudioData
        }))

        setStudios(fetchedStudios)
      } catch (e) {
        console.error("Fetch Error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- SLUG REAL-TIME CHECK ---
  const checkSlugRealtime = useCallback((slug: string, excludeStudioId?: string) => {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
    setSlugAvailable(null)

    const validationError = slug ? validateSlug(slug) : null
    setSlugError(validationError)
    if (!slug || validationError) {
      setSlugChecking(false)
      return
    }

    setSlugChecking(true)
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(slug, excludeStudioId)
        setSlugAvailable(available)
        if (!available) setSlugError("This subdomain is already taken")
        else setSlugError(null)
      } catch {
        setSlugError("Could not verify availability")
      } finally {
        setSlugChecking(false)
      }
    }, 500)
  }, [])

  const handleWizardSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setFormData(prev => ({ ...prev, studioSlug: normalized }))
    checkSlugRealtime(normalized)
  }

  const handleEditSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setEditSlug(normalized)
    checkSlugRealtime(normalized, editingStudio?.id)
  }

  // --- ACTIONS: REGISTRATION ---
  const handleInputChange = (field: keyof WizardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateStudioID = () => `STU_${Math.random().toString(36).substring(2, 8)}`

  const handleRegister = async () => {
    setIsSubmitting(true)
    const studioID = generateStudioID()

    try {
      if (!auth.currentUser) throw new Error("Authentication required")

      // Validate slug if provided
      if (formData.studioSlug) {
        const slugValidation = validateSlug(formData.studioSlug)
        if (slugValidation) {
          Swal.fire({ icon: 'error', title: 'Invalid Subdomain', text: slugValidation })
          setIsSubmitting(false)
          return
        }
        const available = await isSlugAvailable(formData.studioSlug)
        if (!available) {
          Swal.fire({ icon: 'error', title: 'Subdomain Taken', text: 'This subdomain is already in use.' })
          setIsSubmitting(false)
          return
        }
      }

      // 1. Create Root Studio Doc (Identity Only - No Billing Data)
      const studioRef = doc(db, "Studios", studioID)
      await setDoc(studioRef, {
        name: formData.studioName,
        slug: formData.studioSlug || null,
        address: formData.studioAddress,
        phone: formData.studioPhone,
        website: formData.studioWebsite,
        email: formData.ownerEmail,
        status: "Active",
        createdAt: serverTimestamp(),
      })

      // 2. Init Members Subcollection
      await setDoc(doc(db, `Studios/${studioID}/Members`, "MEM_LIST"), { ID_LIST: [] })
      
      // 3. Register Owner (Cloud Function)
      const response = await fetch(REGISTER_USER_API, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            email: formData.ownerEmail,
            password: formData.ownerPassword,
            displayName: formData.ownerName,
            phoneNumber: formData.ownerPhone,
            photoURL: "",
            role: "studio_manager",
            studioID: studioID,
            coverURL: ""
          }
        })
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error?.message || "User registration failed")
      }
      
      const result = await response.json()
      
      // 4. Link Owner to Studio
      await setDoc(studioRef, { owner_uid: result.userID }, { merge: true })

      if (currentUser) {
        await logAuditAction("CREATE_STUDIO", `Created studio ${formData.studioName} (${studioID})`, currentUser, "StudioManagement")
      }

      setStudios(prev => [...prev, {
        id: studioID,
        name: formData.studioName,
        email: formData.ownerEmail,
        slug: formData.studioSlug || undefined,
        package: "Unassigned",
        status: "Active",
        address: formData.studioAddress,
        phone: formData.studioPhone,
        website: formData.studioWebsite,
        owner_uid: result.userID,
        regDate: format(new Date(), "MMM dd, yyyy"),
        isMapped: false
      }])
      
      setIsWizardOpen(false)
      setFormData(INITIAL_WIZARD)
      setCurrentStep(1)
      Swal.fire('Success', 'Studio provisioned successfully. Go to Billing to map a package.', 'success')

    } catch (error: any) {
      console.error(error)
      Swal.fire('Error', error.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- ACTIONS: EDIT & OWNERSHIP TRANSFER ---

  const handleEditClick = async (studio: StudioData) => {
    setEditingStudio({ ...studio })
    setEditSlug(studio.slug || "")
    setSlugError(null)
    setSlugAvailable(null)
    setSlugChecking(false) 
    setIsEditOpen(true)
    setMembersLoading(true)
    setAvailableMembers([])

    try {
      const memRef = doc(db, `Studios/${studio.id}/Members/MEM_LIST`)
      const memSnap = await getDoc(memRef)
      
      let memberIds: string[] = []
      if (memSnap.exists()) {
        memberIds = memSnap.data().ID_LIST || []
      }

      if (studio.owner_uid && !memberIds.includes(studio.owner_uid)) {
        memberIds.push(studio.owner_uid)
      }

      if (memberIds.length > 0) {
        const memberData: StudioMember[] = []
        await Promise.all(memberIds.map(async (uid) => {
            const userSnap = await getDoc(doc(db, "Users", uid))
            if (userSnap.exists()) {
                const u = userSnap.data()
                memberData.push({
                    uid: uid,
                    name: u.displayName || u.name || "Unknown",
                    email: u.email || "",
                    role: u.role
                })
            }
        }))
        setAvailableMembers(memberData)
      }
    } catch (e) {
      console.error("Failed to load members", e)
    } finally {
      setMembersLoading(false)
    }
  }

  const handleUpdateStudio = async () => {
    if (!editingStudio) return
    
    const originalStudio = studios.find(s => s.id === editingStudio.id)
    if (!originalStudio) return

    const isTransferringOwnership = editingStudio.owner_uid !== originalStudio.owner_uid

    try {
      // Validate slug if changed
      if (editSlug) {
        const slugValidation = validateSlug(editSlug)
        if (slugValidation) {
          Swal.fire({ icon: 'error', title: 'Invalid Subdomain', text: slugValidation })
          return
        }
        const available = await isSlugAvailable(editSlug, editingStudio.id)
        if (!available) {
          Swal.fire({ icon: 'error', title: 'Subdomain Taken', text: 'This subdomain is already in use.' })
          return
        }
      }

      const studioRef = doc(db, "Studios", editingStudio.id)
      
      // Update Root Doc (Contact Info + Slug)
      await updateDoc(studioRef, {
        name: editingStudio.name,
        slug: editSlug || null,
        address: editingStudio.address,
        phone: editingStudio.phone,
        website: editingStudio.website,
        owner_uid: editingStudio.owner_uid
      })

      if (isTransferringOwnership) {
         if (originalStudio.owner_uid) {
            await updateDoc(doc(db, "Users", originalStudio.owner_uid), { role: "studio_crew" })
         }
         if (editingStudio.owner_uid) {
            await updateDoc(doc(db, "Users", editingStudio.owner_uid), { role: "studio_manager" })
         }
         if (currentUser) {
            await logAuditAction("OWNERSHIP_TRANSFER", `Transferred ownership of ${editingStudio.name}`, currentUser, "StudioManagement")
         }
      } else {
         if (currentUser) {
            await logAuditAction("UPDATE_STUDIO", `Updated details for ${editingStudio.name}`, currentUser, "StudioManagement")
         }
      }

      setStudios(prev => prev.map(s => s.id === editingStudio.id ? { ...editingStudio, slug: editSlug || undefined } : s))
      setIsEditOpen(false)
      
      Swal.fire({
        title: "Updated",
        text: "Studio details saved successfully.",
        icon: "success"
      })

    } catch (error) {
      console.error(error)
      Swal.fire("Error", "Failed to update studio.", "error")
    }
  }

  // --- ACTIONS: STATUS ---
  const handleToggleStatus = async (studio: StudioData) => {
    const isSuspended = studio.status === "Suspended"
    const newStatus = isSuspended ? "Active" : "Suspended"
    const action = isSuspended ? "Activate" : "Suspend"
    const apiEndpoint = isSuspended ? ENABLE_USER_API : DISABLE_USER_API

    Swal.fire({
      title: `${action} Studio?`,
      text: isSuspended ? "Restoring access." : "Disabling studio and all members.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isSuspended ? '#10b981' : '#d33',
      confirmButtonText: `Yes, ${action}`,
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await updateDoc(doc(db, "Studios", studio.id), { status: newStatus })
          
          const memListSnap = await getDoc(doc(db, `Studios/${studio.id}/Members/MEM_LIST`))
          let memberIds: string[] = memListSnap.exists() ? memListSnap.data().ID_LIST || [] : []
          if (studio.owner_uid && !memberIds.includes(studio.owner_uid)) memberIds.push(studio.owner_uid)

          if (memberIds.length > 0) {
            await Promise.all(memberIds.map(uid => 
                fetch(apiEndpoint, { 
                    method: "POST", 
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ data: { uid } }) 
                }).catch(console.error)
            ))
          }

          if (currentUser) {
            await logAuditAction("STUDIO_STATUS", `Set ${studio.name} to ${newStatus}`, currentUser, "StudioManagement")
          }
          return true
        } catch (error: any) {
          Swal.showValidationMessage(error.message)
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setStudios(prev => prev.map(s => s.id === studio.id ? { ...s, status: newStatus } : s))
        Swal.fire(isSuspended ? "Activated" : "Suspended", "Status updated.", "success")
      }
    })
  }

  // --- PAGINATION & FILTER LOGIC ---
  const filteredStudios = studios.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredStudios.length / ITEMS_PER_PAGE)
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE
  const currentItems = filteredStudios.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
        setCurrentPage(newPage)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Studio Management</h1>
          <p className="text-muted-foreground mt-1">Provision and manage tenant studios.</p>
        </div>
        
        {/* --- REGISTRATION WIZARD (Identity Only) --- */}
        <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90"><Plus className="h-4 w-4 mr-2" /> New Studio</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
             <DialogHeader>
              <DialogTitle>Register New Studio</DialogTitle>
              <DialogDescription>Step {currentStep} of 2</DialogDescription>
            </DialogHeader>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
               {/* Adjusted width for 2 steps */}
               <div className="h-full bg-[#1C4D8D] transition-all duration-300" style={{ width: `${(currentStep / 2) * 100}%` }} />
            </div>

            {currentStep === 1 && (
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Studio Name *</Label><Input value={formData.studioName} onChange={e => handleInputChange("studioName", e.target.value)} /></div>
                
                {/* Subdomain Slug */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[#1C4D8D]" />Subdomain URL</Label>
                  <div className="flex items-center gap-0">
                    <Input
                      value={formData.studioSlug}
                      onChange={e => handleWizardSlugChange(e.target.value)}
                      placeholder="my-studio"
                      className={`rounded-r-none font-mono text-sm ${
                        slugError ? 'border-red-400 focus-visible:ring-red-400' :
                        slugAvailable === true ? 'border-emerald-400 focus-visible:ring-emerald-400' : ''
                      }`}
                    />
                    <span className="inline-flex items-center px-3 h-9 border border-l-0 border-slate-200 rounded-r-md bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
                      .shutterstudio.com
                    </span>
                  </div>
                  {slugChecking && (
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Checking availability...</p>
                  )}
                  {slugError && !slugChecking && (
                    <p className="text-xs text-red-500">{slugError}</p>
                  )}
                  {slugAvailable === true && !slugError && !slugChecking && formData.studioSlug && (
                    <p className="text-xs text-emerald-600">✓ Available — {formData.studioSlug}.shutterstudio.com</p>
                  )}
                  {!formData.studioSlug && (
                    <p className="text-xs text-muted-foreground">Optional. Lowercase letters, numbers, and hyphens only.</p>
                  )}
                </div>

                <div className="space-y-2"><Label>Address</Label><Input value={formData.studioAddress} onChange={e => handleInputChange("studioAddress", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Phone</Label><Input value={formData.studioPhone} onChange={e => handleInputChange("studioPhone", e.target.value)} /></div>
                   <div className="space-y-2"><Label>Website</Label><Input value={formData.studioWebsite} onChange={e => handleInputChange("studioWebsite", e.target.value)} /></div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Owner Name *</Label><Input value={formData.ownerName} onChange={e => handleInputChange("ownerName", e.target.value)} /></div>
                <div className="space-y-2"><Label>Owner Email *</Label><Input type="email" value={formData.ownerEmail} onChange={e => handleInputChange("ownerEmail", e.target.value)} /></div>
                <div className="space-y-2"><Label>Password *</Label><Input type="password" value={formData.ownerPassword} onChange={e => handleInputChange("ownerPassword", e.target.value)} /></div>
                <div className="space-y-2"><Label>Owner Phone</Label><Input value={formData.ownerPhone} onChange={e => handleInputChange("ownerPhone", e.target.value)} /></div>
              </div>
            )}

            <div className="flex justify-between mt-4">
               {currentStep > 1 ? <Button variant="outline" onClick={() => setCurrentStep(p => p - 1)}>Back</Button> : <div />}
               {currentStep < 2
                 ? <Button className="bg-[#1C4D8D]" onClick={() => setCurrentStep(p => p + 1)}>Next</Button> 
                 : <Button className="bg-green-600 hover:bg-green-700" onClick={handleRegister} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : "Create Studio"}</Button>
               }
            </div>
          </DialogContent>
        </Dialog>

        {/* --- EDIT STUDIO DIALOG (Identity Only) --- */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Studio Identity</DialogTitle>
              <DialogDescription>Modify details for {editingStudio?.name}</DialogDescription>
            </DialogHeader>
            {editingStudio && (
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Studio Name</Label><Input value={editingStudio.name} onChange={e => setEditingStudio({...editingStudio, name: e.target.value})} /></div>
                
                {/* Subdomain Slug (Edit) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[#1C4D8D]" />Subdomain URL</Label>
                  <div className="flex items-center gap-0">
                    <Input
                      value={editSlug}
                      onChange={e => handleEditSlugChange(e.target.value)}
                      placeholder="my-studio"
                      className={`rounded-r-none font-mono text-sm ${
                        slugError ? 'border-red-400 focus-visible:ring-red-400' :
                        slugAvailable === true ? 'border-emerald-400 focus-visible:ring-emerald-400' : ''
                      }`}
                    />
                    <span className="inline-flex items-center px-3 h-9 border border-l-0 border-slate-200 rounded-r-md bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
                      .shutterstudio.com
                    </span>
                  </div>
                  {slugChecking && (
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Checking...</p>
                  )}
                  {slugError && !slugChecking && (
                    <p className="text-xs text-red-500">{slugError}</p>
                  )}
                  {slugAvailable === true && !slugError && !slugChecking && editSlug && (
                    <p className="text-xs text-emerald-600">✓ Available — {editSlug}.shutterstudio.com</p>
                  )}
                </div>

                <div className="space-y-2"><Label>Address</Label><Input value={editingStudio.address} onChange={e => setEditingStudio({...editingStudio, address: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Phone</Label><Input value={editingStudio.phone} onChange={e => setEditingStudio({...editingStudio, phone: e.target.value})} /></div>
                   <div className="space-y-2"><Label>Website</Label><Input value={editingStudio.website} onChange={e => setEditingStudio({...editingStudio, website: e.target.value})} /></div>
                </div>

                <Separator className="my-2" />

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <UserCog className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-800">Transfer Ownership</span>
                    </div>
                    {membersLoading ? (
                        <div className="text-xs text-amber-600 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Loading available members...</div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="text-amber-800">Select New Owner</Label>
                            <Select value={editingStudio.owner_uid} onValueChange={v => setEditingStudio({...editingStudio, owner_uid: v})}>
                                <SelectTrigger className="bg-white border-amber-200"><SelectValue placeholder="Select a member..." /></SelectTrigger>
                                <SelectContent>
                                    {availableMembers.map(member => (
                                        <SelectItem key={member.uid} value={member.uid}>{member.name} ({member.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editingStudio.owner_uid !== studios.find(s => s.id === editingStudio.id)?.owner_uid && (
                                <div className="text-xs text-amber-700 flex items-start gap-1 mt-2">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>Warning: Saving will promote the selected user to <b>Studio Manager</b> and demote the previous owner to <b>Crew</b>.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button className="bg-[#1C4D8D]" onClick={handleUpdateStudio}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- SEARCH BAR --- */}
      <Card className="border-none shadow-md mb-6">
        <CardContent className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Studio Name, ID, or Owner Email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
        </CardContent>
      </Card>

      {/* --- STUDIO LIST TABLE --- */}
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
           {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
           ) : (
             <>
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50 hover:bg-slate-50">
                   <TableHead>Studio Name</TableHead>
                   <TableHead>Package (Read-Only)</TableHead>
                   <TableHead>Registration Date</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Primary Contact</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {currentItems.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No studios found.</TableCell></TableRow>
                 ) : (
                    currentItems.map(studio => (
                        <TableRow key={studio.id}>
                           <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <div>{studio.name}<p className="text-xs text-muted-foreground font-mono">{studio.id}</p></div>
                              </div>
                           </TableCell>
                           <TableCell>
                                {studio.isMapped ? <Badge variant="secondary">{studio.package}</Badge> : <span className="text-xs text-red-400 italic">Unassigned</span>}
                           </TableCell>
                           <TableCell className="text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-3 w-3 text-slate-400"/>
                                    {studio.regDate}
                                </div>
                           </TableCell>
                           <TableCell>
                              <Badge variant="outline" className={studio.status === 'Active' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                                {studio.status}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-sm text-slate-600">{studio.email}</TableCell>
                           <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditClick(studio)}><Pencil className="mr-2 h-4 w-4" /> Edit & Transfer</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleToggleStatus(studio)} className={studio.status === 'Active' ? "text-red-600" : "text-green-600"}>
                                    {studio.status === 'Active' ? <><Ban className="mr-2 h-4 w-4" /> Suspend</> : <><Check className="mr-2 h-4 w-4" /> Activate</>}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </TableCell>
                        </TableRow>
                    ))
                 )}
               </TableBody>
             </Table>
             
             {/* PAGINATION */}
             {totalPages > 1 && (
                 <div className="border-t p-4 flex items-center justify-between bg-slate-50/30">
                     <p className="text-xs text-muted-foreground">
                        Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStudios.length)} of {filteredStudios.length} studios
                     </p>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                     </div>
                 </div>
             )}
             </>
           )}
        </CardContent>
      </Card>
    </div>
  )
}