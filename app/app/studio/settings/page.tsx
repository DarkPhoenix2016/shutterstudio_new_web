"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Building2, Save, Phone, Mail, Globe, MapPin, Upload, Camera, Crop as CropIcon, 
    Loader2, Plus, Trash2, Briefcase, FileText, Hash, TrendingUp, Users, Wrench,
    CreditCard, ShieldCheck
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import Swal from "sweetalert2"
import { doc, updateDoc } from "firebase/firestore"
import { validateSlug, isSlugAvailable } from "@/services/studio-service"
import { db } from "@/lib/firebase"
import { PhoneInput } from "@/components/ui/phone-input"
import { validatePhoneNumber, parseE164 } from "@/lib/phone-utils"
import { runStudioPhoneMigration } from "@/lib/migration-utils"
import { uploadFileToStorage } from "@/lib/storage-utils"
import { compressImage, getCroppedImg } from "@/lib/image-utils"
import Cropper from "react-easy-crop"

export default function StudioSettingsPage() {
  const { userData, studioData, loading: authLoading, refreshUserData } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // --- GENERAL TAB STATE ---
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [address, setAddress] = useState("")

  // --- SUBDOMAIN SLUG STATE ---
  const [slug, setSlug] = useState("")
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  
  // --- CREW TAB STATE ---
  const [designations, setDesignations] = useState<string[]>([])
  const [newDesignation, setNewDesignation] = useState("")

  // --- FINANCE TAB STATE ---
  const [invoicePrefix, setInvoicePrefix] = useState("INV")
  const [nextInvoiceNum, setNextInvoiceNum] = useState("1000")
  const [totalInvoices, setTotalInvoices] = useState("0") // Read-only

  // --- BANKING TAB STATE ---
  const [bankName, setBankName] = useState("")
  const [branchName, setBranchName] = useState("")
  const [accName, setAccName] = useState("")
  const [accNumber, setAccNumber] = useState("")

  // --- POLICIES TAB STATE ---
  const [policyNotice, setPolicyNotice] = useState("")

  // --- IMAGE STATE ---
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState("")

  // --- SYSTEM UTILITIES STATE ---
  const [migrationLogs, setMigrationLogs] = useState<string[]>([])
  const [migrating, setMigrating] = useState(false)

  // --- CROPPER STATE ---
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [croppingTarget, setCroppingTarget] = useState<'logo' | 'cover' | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  // 1. Check Permissions & Load Data
  useEffect(() => {
    if (!authLoading) {
      const allowedRoles = ['studio_manager', 'super_admin', 'Administrator']
      if (!userData || !allowedRoles.includes(userData.role)) {
        router.push('/app/studio/profile')
        return
      }

      if (studioData) {
        // General
        setName(studioData.name || "")
        setPhone(studioData.phone || "")
        setEmail(studioData.email || "")
        setWebsite(studioData.website || "")
        setAddress(studioData.address || "")
        setSlug(studioData.slug || "")
        
        // Crew
        setDesignations(studioData.designations || [])
        
        // Finance
        setInvoicePrefix(studioData.invoice_text || "INV")
        setNextInvoiceNum(studioData.invoice_number || "1000")
        setTotalInvoices(studioData.invoice_current || "0")

        // Banking Details
        const banking = studioData.banking_details || {}
        setBankName(banking.bank_name || "")
        setBranchName(banking.branch || "")
        setAccName(banking.account_name || "")
        setAccNumber(banking.account_number || "")

        // Policies
        setPolicyNotice(studioData.privacy_policy_notice || "")
      }
    }
  }, [userData, studioData, authLoading, router])

  // --- SLUG HANDLERS ---
  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setSlug(normalized)
    setSlugAvailable(null)
    const error = normalized ? validateSlug(normalized) : null
    setSlugError(error)
  }

  const handleSlugBlur = async () => {
    if (!slug || slugError) return
    setSlugChecking(true)
    try {
      const available = await isSlugAvailable(slug, userData?.studioID)
      setSlugAvailable(available)
      if (!available) setSlugError("This subdomain is already taken")
    } catch {
      setSlugError("Could not verify availability")
    } finally {
      setSlugChecking(false)
    }
  }

  // --- HANDLERS ---

  const handleAddDesignation = () => {
    if (!newDesignation.trim()) return;
    if (designations.includes(newDesignation.trim())) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Designation already exists', showConfirmButton: false, timer: 3000 });
        return;
    }
    setDesignations([...designations, newDesignation.trim()]);
    setNewDesignation("");
  };

  const handleRemoveDesignation = (indexToRemove: number) => {
    setDesignations(designations.filter((_, index) => index !== indexToRemove));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        Swal.fire({ icon: 'error', title: 'Unsupported File', text: 'Please use JPG or PNG images.' })
        return
      }
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
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels || !croppingTarget) return
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (!croppedBlob) return

      const fileName = `${croppingTarget}_temp.png`
      const fileToCompress = new File([croppedBlob], fileName, { type: "image/png" })
      const compressedFile = await compressImage(fileToCompress)
      const previewUrl = URL.createObjectURL(compressedFile)

      if (croppingTarget === 'logo') {
        setLogoFile(compressedFile)
        setLogoPreview(previewUrl)
      } else {
        setCoverFile(compressedFile)
        setCoverPreview(previewUrl)
      }
      setCropModalOpen(false)
      setImageSrc(null)
    } catch (e) {
      console.error(e)
      Swal.fire({ icon: 'error', title: 'Crop Failed', text: 'Could not process image.' })
    }
  }

  // SAVE TO FIREBASE
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData?.studioID) return

    if (phone) {
      const parsed = parseE164(phone)
      const countryToValidate = parsed ? parsed.countryCode : ((userData?.country || "LK") as any)
      const isValid = validatePhoneNumber(phone, countryToValidate)
      if (!isValid) {
        Swal.fire({ icon: 'warning', title: 'Invalid Phone Number', text: 'Please enter a valid phone number for the studio.' })
        return
      }
    }

    setIsLoading(true)
    try {
      const studioID = userData.studioID
      // Validate slug before saving if it was set
      if (slug) {
        const slugValidation = validateSlug(slug)
        if (slugValidation) {
          Swal.fire({ icon: 'error', title: 'Invalid Subdomain', text: slugValidation })
          setIsLoading(false)
          return
        }
        const available = await isSlugAvailable(slug, studioID)
        if (!available) {
          Swal.fire({ icon: 'error', title: 'Subdomain Taken', text: 'This subdomain is already in use by another studio.' })
          setIsLoading(false)
          return
        }
      }

      const updates: any = {
        name,
        phone,
        email,
        website,
        address,
        slug: slug || null,
        designations,
        invoice_text: invoicePrefix,
        invoice_number: nextInvoiceNum,
        banking_details: {
          bank_name: bankName,
          branch: branchName,
          account_name: accName,
          account_number: accNumber
        },
        privacy_policy_notice: policyNotice
      }

      if (logoFile) {
        const path = `Studios/${studioID}/logo.jpg`
        updates.logo_url = await uploadFileToStorage(path, logoFile)
      }

      if (coverFile) {
        const path = `Studios/${studioID}/cover.jpg`
        updates.cover_url = await uploadFileToStorage(path, coverFile)
      }

      await updateDoc(doc(db, "Studios", studioID), updates)
      await refreshUserData()

      setIsLoading(false)
      Swal.fire({
        title: 'Settings Saved',
        text: 'Studio configuration has been updated.',
        icon: 'success',
        confirmButtonColor: '#1C4D8D'
      })
      setLogoFile(null)
      setCoverFile(null)

    } catch (error) {
      console.error("Save Error:", error)
      setIsLoading(false)
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save changes.' })
    }
  }

  const handleMigratePhones = async () => {
    if (!userData?.studioID) return
    const result = await Swal.fire({
      title: 'Run Phone Migration?',
      text: "This script will inspect all stored events and consultations for this studio and convert any valid regional/local numbers into standard E.164 format. Continue?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, run migration',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) return

    setMigrating(true)
    setMigrationLogs(["Initializing database migration..."])
    try {
      const defaultCountry = userData.country || "LK"
      const { migratedEvents, migratedConsultations } = await runStudioPhoneMigration(
        userData.studioID,
        defaultCountry,
        (msg) => {
          setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
        }
      )
      Swal.fire({
        title: 'Success!',
        text: `Migration completed: Updated ${migratedEvents} events and ${migratedConsultations} consultations.`,
        icon: 'success'
      })
    } catch (err: any) {
      console.error(err)
      setMigrationLogs(prev => [...prev, `ERROR: ${err.message}`])
      Swal.fire('Error', 'Migration failed. Check log output below.', 'error')
    } finally {
      setMigrating(false)
    }
  }

  if (authLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#1C4D8D]" /></div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* CROP MODAL */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Adjust {croppingTarget === 'logo' ? 'Logo' : 'Cover Image'}</DialogTitle>
                <DialogDescription>Drag to position and use slider to zoom.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[350px] bg-slate-900 rounded-md overflow-hidden">
                {imageSrc && (
                    <div className="absolute inset-0">
                        <Cropper 
                            image={imageSrc} 
                            crop={crop} 
                            zoom={zoom} 
                            aspect={croppingTarget === 'logo' ? 1 : 3} 
                            onCropChange={setCrop} 
                            onCropComplete={onCropComplete} 
                            onZoomChange={setZoom} 
                            objectFit={croppingTarget === 'logo' ? 'contain' : 'horizontal-cover'}
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
                <Button onClick={handleCropSave} className="bg-[#1C4D8D] text-white"><CropIcon className="w-4 h-4 mr-2" />Crop & Set</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#0F2854]">Studio Settings</h1>
            <p className="text-muted-foreground">Manage studio identity and configurations.</p>
        </div>
        <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSaveChanges} className="bg-[#1C4D8D] min-w-[140px]" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                Save Changes
            </Button>
        </div>
      </div>

      {/* TABS CONFIGURATION */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
          <TabsTrigger value="general" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">General Profile</TabsTrigger>
          <TabsTrigger value="crew" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Crew Management</TabsTrigger>
          <TabsTrigger value="finance" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Finance & Config</TabsTrigger>
          <TabsTrigger value="banking" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Banking Details</TabsTrigger>
          <TabsTrigger value="policies" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Policies & Terms</TabsTrigger>
          <TabsTrigger value="maintenance" className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">System Utilities</TabsTrigger>
        </TabsList>

        {/* ================= GENERAL TAB ================= */}
        <TabsContent value="general" className="space-y-6">
            
            {/* IMAGES CARD */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle className="text-base">Studio Logo</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-4 group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm relative bg-white">
                                <Image 
                                    src={logoPreview || studioData?.logo_url || "/images/avatar/avatar.jpg"} 
                                    alt="Logo" 
                                    fill 
                                    className="object-cover" 
                                />
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-[#1C4D8D] text-white rounded-full cursor-pointer hover:bg-[#1C4D8D]/90 shadow-lg transition-transform hover:scale-105">
                                <Camera className="h-4 w-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'logo')} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 text-center">Square format (1:1)</p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-base">Cover Banner</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                            <Image 
                                src={coverPreview || studioData?.cover_url || "/images/background/profile-cover.jpg"} 
                                alt="Cover" 
                                fill 
                                className="object-cover transition-opacity group-hover:opacity-75" 
                            />
                            <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                <div className="bg-white/90 px-3 py-1.5 rounded text-xs font-medium shadow flex items-center gap-2">
                                    <Upload className="h-3 w-3"/> Change Cover
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-4">Wide banner format (3:1). Used on invoices/portals.</p>
                    </CardContent>
                </Card>
            </div>

            {/* INFO CARD */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#1C4D8D]"/> Studio Information</CardTitle>
                    <CardDescription>Public details for clients.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Studio Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Contact Number</Label>
                            <PhoneInput
                                value={phone}
                                onChange={val => setPhone(val)}
                                placeholder="Contact Number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Business Email</Label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Physical Address</Label>
                        <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            {/* SUBDOMAIN CARD */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-[#1C4D8D]"/>Subdomain URL</CardTitle>
                    <CardDescription>Your registered custom subdomain. This field is read-only to prevent URL breakage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="slug">Subdomain Slug</Label>
                        <div className="flex items-center gap-0">
                            <Input
                                id="slug"
                                value={slug}
                                placeholder="my-studio"
                                disabled
                                className="rounded-r-none font-mono text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                            <span className="inline-flex items-center px-3 h-9 border border-l-0 border-slate-205 rounded-r-md bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
                                .shutterstudio.com
                            </span>
                        </div>
                        {slug && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Your studio page is available at: <strong className="text-[#1C4D8D]">{slug}.shutterstudio.com</strong>
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* ================= CREW MANAGEMENT TAB ================= */}
        <TabsContent value="crew" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#1C4D8D]"/> Job Designations</CardTitle>
                    <CardDescription>Define the list of job titles available for your staff members (e.g., Senior Editor, Lead Photographer).</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                value={newDesignation}
                                onChange={(e) => setNewDesignation(e.target.value)}
                                placeholder="Enter designation (e.g. Senior Editor)"
                                className="max-w-md"
                            />
                            <Button type="button" onClick={handleAddDesignation} variant="secondary">
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 min-h-[60px]">
                            {designations.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No designations added. Add one above.</p>
                            ) : (
                                designations.map((role, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-sm">
                                        <span>{role}</span>
                                        <button type="button" onClick={() => handleRemoveDesignation(index)} className="text-slate-400 hover:text-red-500">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#1C4D8D]"/> Team Settings</CardTitle>
                    <CardDescription>Additional team configuration options will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-muted-foreground">You can manage individual user accounts and permissions from the "Crew Manager" page.</p>
                </CardContent>
            </Card>
        </TabsContent>

        {/* ================= FINANCE TAB ================= */}
        <TabsContent value="finance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#1C4D8D]"/> Invoice Configuration
                        </CardTitle>
                        <CardDescription>Customize how your invoice numbers are generated.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label htmlFor="prefix">Invoice Prefix</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="prefix" 
                                        value={invoicePrefix} 
                                        onChange={e => setInvoicePrefix(e.target.value.toUpperCase())} 
                                        className="pl-9 font-mono uppercase" 
                                        placeholder="INV"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Appears before the number (e.g., <strong>INV</strong>-1001)</p>
                            </div>
                            
                            <div className="space-y-3">
                                <Label htmlFor="nextNum">Next Invoice Number</Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="nextNum" 
                                        type="number"
                                        value={nextInvoiceNum} 
                                        onChange={e => setNextInvoiceNum(e.target.value)} 
                                        className="pl-9 font-mono" 
                                        placeholder="1000"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">The ID for your next generated invoice.</p>
                            </div>
                        </div>

                        {/* Preview Box */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Preview next invoice:</span>
                            <span className="text-lg font-bold font-mono text-[#1C4D8D]">
                                {invoicePrefix}-{nextInvoiceNum}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                            Total Invoices Generated
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-slate-900">{totalInvoices}</div>
                                <div className="text-xs text-emerald-600 font-medium mt-1">Lifetime total</div>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100">
                             <div className="text-xs text-slate-400">
                                This count is automatic and cannot be edited manually.
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        
        {/* ================= BANKING DETAILS TAB ================= */}
        <TabsContent value="banking" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-[#1C4D8D]"/> Banking Settings</CardTitle>
                    <CardDescription>Setup bank deposit details for your clients to settle invoices.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank / Institution</Label>
                            <Input 
                              id="bankName" 
                              placeholder="e.g. Commercial Bank" 
                              value={bankName} 
                              onChange={e => setBankName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branchName">Branch Name</Label>
                            <Input 
                              id="branchName" 
                              placeholder="e.g. Ambalantota" 
                              value={branchName} 
                              onChange={e => setBranchName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accName">Account Holder Name</Label>
                            <Input 
                              id="accName" 
                              placeholder="e.g. MGCPK KUMARA" 
                              value={accName} 
                              onChange={e => setAccName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accNumber">Account Number</Label>
                            <Input 
                              id="accNumber" 
                              placeholder="e.g. 8008334288" 
                              value={accNumber} 
                              onChange={e => setAccNumber(e.target.value)} 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* ================= POLICIES & TERMS TAB ================= */}
        <TabsContent value="policies" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#1C4D8D]"/> Terms & Policy Agreement</CardTitle>
                    <CardDescription>Specify the terms of services, booking policies, and conditions shown on the client portal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="policyNotice">Terms Agreement Text</Label>
                        <Textarea
                            id="policyNotice"
                            value={policyNotice}
                            onChange={e => setPolicyNotice(e.target.value)}
                            placeholder="Write your terms of service, payment deadlines, deposit refunds rules here..."
                            rows={12}
                            className="min-h-[250px]"
                        />
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* ================= MAINTENANCE TAB ================= */}
        <TabsContent value="maintenance" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-[#1C4D8D]" />
                        System Maintenance Utilities
                    </CardTitle>
                    <CardDescription>
                        Perform database schema migrations and validation operations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-[#0F2854]">Normalize & Format Phone Numbers to E.164</h4>
                            <p className="text-xs text-slate-500 max-w-xl">
                                This will parse all events and consultations for this studio, check phone number fields, and convert them to the standardized international E.164 format. Unparseable phone numbers will be skipped to protect your data.
                            </p>
                        </div>
                        <Button 
                            type="button"
                            onClick={handleMigratePhones} 
                            disabled={migrating}
                            className="bg-[#1C4D8D] text-white hover:bg-[#163b6b] shrink-0 self-start md:self-center"
                        >
                            {migrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
                            Run Migration
                        </Button>
                    </div>

                    {migrationLogs.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-650 font-bold">Migration Console Log Output</Label>
                            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs h-72 overflow-y-auto space-y-1 border border-slate-800">
                                {migrationLogs.map((log, index) => (
                                    <div key={index} className={log.includes("ERROR") ? "text-rose-400" : log.includes("finished") ? "text-emerald-400 font-bold" : ""}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}