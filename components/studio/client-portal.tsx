"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { format } from "date-fns"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Lock, Phone, Key, ArrowRight, LogOut, Loader2, Calendar as CalendarIcon, 
  MapPin, User, Mail, DollarSign, CreditCard, ShieldCheck, Plus, AlertCircle, 
  Download, Maximize2, ChevronLeft, ChevronRight, X, CheckCircle, Info, ExternalLink, 
  ChevronDown, MessageSquare, Camera
} from "lucide-react"
import Swal from "sweetalert2"
import { safeDate } from "@/lib/date-utils"

// UI components
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PhoneInput } from "@/components/ui/phone-input"
import { validatePhoneNumber, parseE164 } from "@/lib/phone-utils"
import { CountryCode } from "libphonenumber-js"

interface EventDay {
  date: any
  cost: number
  type: "package" | "custom"
  packageId?: string
  customItems?: { name: string; quantity: number; price: number }[]
}

interface EventLocation {
  name: string
  date: any
  mapUrl?: string
  time?: string
  note?: string
}

interface EventContact {
  name: string
  role: string
  phone: string
  note?: string
}

interface EventTransaction {
  amount: number
  type: "income" | "expense"
  date: any
  method: string
}

interface EventApproval {
  customer_confirmed: boolean
  customer_email?: string
  customer_phone?: string
  customer_id?: string
  confirmedAt?: any
  verification_type?: string
  verification_document_number?: string
}

interface ClientEventData {
  id: string
  displayId?: string
  eventName: string
  eventType: string
  status: string
  customerName: string
  customerEmail: string
  customerMobile: string
  couplePhotoUrl?: string
  galleryUrls?: string[]
  dayCount: number
  days: EventDay[]
  totalBudget: number
  discount: number
  discountType: "fixed" | "percentage"
  finalBudget: number
  transactions: EventTransaction[]
  approval?: EventApproval
  locations?: EventLocation[]
  contacts?: EventContact[]
  additionalServices?: { name: string; quantity: number; total: number; pricePerUnit: number }[]
  notes?: string
}

interface StudioBranding {
  name: string
  logo_url: string
  cover_url: string
  address: string
  phone: string
  email: string
  website: string
  banking_details?: {
    account_name: string
    account_number: string
    bank_name: string
    branch: string
    mobile_number?: string
  } | null
  privacy_policy_notice?: string
}

interface ClientPortalProps {
  studioId: string
  studioSlug: string
  initialStudioName: string
}

type TabType = "overview" | "itinerary" | "finance" | "approval"

export default function ClientPortal({ studioId, studioSlug, initialStudioName }: ClientPortalProps) {
  // Auth state
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"phone" | "otp" | "portal">("phone")
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // Portal data state
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  const [events, setEvents] = useState<ClientEventData[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [studio, setStudio] = useState<StudioBranding>({
    name: initialStudioName,
    logo_url: "",
    cover_url: "",
    address: "",
    phone: "",
    email: "",
    website: ""
  })
  
  // Portal navigation
  const [activeEvent, setActiveEvent] = useState<ClientEventData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const tabs: TabType[] = ["overview", "itinerary", "finance", "approval"]

  // Lightbox & swipes
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStart = useRef<number | null>(null)
  const touchEnd = useRef<number | null>(null)

  // Approval state
  const [verifType, setVerifType] = useState<string>("id")
  const [verifDocNum, setVerifDocNum] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check persistent session
  useEffect(() => {
    const cachedToken = localStorage.getItem(`client_token_${studioId}`)
    const cachedPhone = localStorage.getItem(`client_phone_${studioId}`)
    
    if (cachedToken && cachedPhone) {
      setSessionToken(cachedToken)
      fetchPortalData(cachedToken)
    }
  }, [studioId])

  // Fetch verified portal data
  const fetchPortalData = async (token: string) => {
    setLoading(true)
    setAuthError(null)
    try {
      const res = await fetch(`/api/client-portal/events?studioId=${studioId}&sessionToken=${token}`)
      const data = await res.json()
      
      if (res.ok && data.success) {
        setEvents(data.events)
        setPackages(data.packages)
        if (data.studio) {
          setStudio(data.studio)
        }
        setStep("portal")
        // If only 1 event, auto-select it
        if (data.events.length === 1) {
          setActiveEvent(data.events[0])
        }
      } else {
        // Session expired or invalid
        localStorage.removeItem(`client_token_${studioId}`)
        localStorage.removeItem(`client_phone_${studioId}`)
        setSessionToken(null)
        setStep("phone")
        setAuthError(data.error || "Session expired. Please verify your number again.")
      }
    } catch (e) {
      console.error(e)
      setAuthError("Failed to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  // Request SMS verification code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) return

    const parsed = parseE164(phoneNumber)
    const countryToValidate = parsed ? parsed.countryCode : "LK"
    const isValid = validatePhoneNumber(phoneNumber, countryToValidate)
    if (!isValid) {
      setAuthError("Please enter a valid phone number.")
      return
    }
    
    setLoading(true)
    setAuthError(null)
    try {
      const res = await fetch("/api/client-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId, phone: phoneNumber })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setStep("otp")
      } else {
        setAuthError(data.error || "Verification request failed.")
      }
    } catch (e) {
      console.error(e)
      setAuthError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode) return
    
    setLoading(true)
    setAuthError(null)
    try {
      const res = await fetch("/api/client-portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId, phone: phoneNumber, code: otpCode })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        localStorage.setItem(`client_token_${studioId}`, data.sessionToken)
        localStorage.setItem(`client_phone_${studioId}`, data.phone)
        setSessionToken(data.sessionToken)
        fetchPortalData(data.sessionToken)
      } else {
        setAuthError(data.error || "Incorrect validation code.")
      }
    } catch (e) {
      console.error(e)
      setAuthError("Authentication error.")
    } finally {
      setLoading(false)
    }
  }

  // Log Out / Clear session
  const handleLogOut = () => {
    localStorage.removeItem(`client_token_${studioId}`)
    localStorage.removeItem(`client_phone_${studioId}`)
    setSessionToken(null)
    setEvents([])
    setActiveEvent(null)
    setPhoneNumber("")
    setOtpCode("")
    setStep("phone")
    setAuthError(null)
  }

  // Verify Identity & Sign Quotation
  const handleApproveEvent = async () => {
    if (!activeEvent) return
    if (!verifType || !verifDocNum) {
      return Swal.fire("Validation Error", "Please fill in all verification fields.", "warning")
    }

    setIsSubmitting(true)
    try {
      const eventRef = doc(db, "Studios", studioId, "Events", activeEvent.id)
      const approvalData = {
        customer_confirmed: true,
        confirmedAt: serverTimestamp(),
        verification_type: verifType === "id" ? "National ID" : "Passport",
        verification_document_number: verifDocNum,
        customer_email: activeEvent.customerEmail || "",
        customer_phone: activeEvent.customerMobile
      }

      await updateDoc(eventRef, {
        status: "Scheduled",
        approval: approvalData
      })

      // Update in local state
      const updatedApprovedData = {
        ...approvalData,
        confirmedAt: new Date()
      }

      const updatedEvents = events.map(e => e.id === activeEvent.id ? {
        ...e,
        status: "Scheduled",
        approval: updatedApprovedData
      } : e)

      setEvents(updatedEvents)
      setActiveEvent({
        ...activeEvent,
        status: "Scheduled",
        approval: updatedApprovedData
      })

      Swal.fire({
        title: "Success",
        text: "Event quotation approved and signed!",
        icon: "success",
        confirmButtonColor: "#1C4D8D"
      })
    } catch (e) {
      console.error(e)
      Swal.fire("Error", "Could not process approval.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Event financial calculations
  const financials = useMemo(() => {
    if (!activeEvent) return {
      baseCost: 0, servicesCost: 0, totalBudget: 0,
      discountAmount: 0, finalBudget: 0, paid: 0, due: 0, currency: "LKR"
    }

    const paid = activeEvent.transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0
    const baseCost = activeEvent.days?.reduce((acc, day) => acc + (day.cost || 0), 0) || 0
    const servicesCost = activeEvent.additionalServices?.reduce((acc, s) => acc + (s.total || 0), 0) || 0
    const totalBudget = baseCost + servicesCost

    let discountAmount = 0
    if (activeEvent.discountType === 'percentage') {
      discountAmount = totalBudget * ((activeEvent.discount || 0) / 100)
    } else {
      discountAmount = Number(activeEvent.discount || 0)
    }

    const finalBudget = Math.max(0, totalBudget - discountAmount)

    return {
      baseCost, servicesCost, totalBudget, discountAmount,
      finalBudget, paid, due: finalBudget - paid, currency: "LKR"
    }
  }, [activeEvent])

  const allImages = useMemo(() => {
    if (!activeEvent) return []
    const imgs = []
    if (activeEvent.couplePhotoUrl) imgs.push(activeEvent.couplePhotoUrl)
    if (activeEvent.galleryUrls && Array.isArray(activeEvent.galleryUrls)) imgs.push(...activeEvent.galleryUrls)
    return imgs
  }, [activeEvent])

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `gallery-photo-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  // --- SWIPE HANDLERS ---
  const minSwipeDistance = 50
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }
  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX
  }
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return
    const distance = touchStart.current - touchEnd.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.indexOf(activeTab)
      let newIndex = currentIndex

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        newIndex = currentIndex + 1
      } else if (isRightSwipe && currentIndex > 0) {
        newIndex = currentIndex - 1
      }

      if (newIndex !== currentIndex) {
        setActiveTab(tabs[newIndex])
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  // RENDER PHONE SCREEN
  if (step === "phone") {
    return (
      <div className="light min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Soft Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-slate-200/80 shadow-xl rounded-2xl p-7 md:p-8 relative overflow-hidden z-10">
          <div className="text-center pb-6">
            {studio.logo_url && (
              <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 border border-slate-100 bg-slate-50 relative flex items-center justify-center shadow-xs">
                <img src={studio.logo_url} alt={studio.name} className="object-contain max-h-full max-w-full" />
              </div>
            )}
            <h2 className="text-xl text-slate-900 font-extrabold tracking-tight">{studio.name}</h2>
            <p className="text-blue-600 text-[10px] uppercase tracking-wider font-bold mt-1.5 font-mono">Client Portal Verification</p>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleRequestOtp} className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs text-slate-500 font-bold uppercase tracking-wider">Registered Phone Number</Label>
                <div>
                  <PhoneInput
                    value={phoneNumber}
                    onChange={(val) => setPhoneNumber(val)}
                    placeholder="Registered Phone Number"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">Enter the phone number registered with your shoot events.</p>
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-red-805">Verification Error</h5>
                    <p className="text-xs text-red-700 mt-0.5">{authError}</p>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 text-xs font-bold bg-[#1C4D8D] hover:bg-[#153B6C] text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Send Verification Code
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // RENDER OTP SCREEN
  if (step === "otp") {
    return (
      <div className="light min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Soft Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-slate-200/80 shadow-xl rounded-2xl p-7 md:p-8 relative overflow-hidden z-10">
          <div className="text-center pb-6">
            <div className="mx-auto bg-blue-50 border border-blue-105 w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl text-slate-900 font-extrabold tracking-tight">Security Check</h2>
            <p className="text-slate-500 text-xs mt-1">We sent a 6-digit confirmation code via SMS to your phone.</p>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-xs text-slate-500 font-bold uppercase tracking-wider">SMS Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="h-12 text-center text-xl tracking-[0.3em] font-bold font-mono border-slate-200 bg-slate-50 text-slate-800 focus-visible:ring-blue-600 rounded-xl"
                />
              </div>

              {authError && (
                <div className="bg-red-55 border border-red-100 text-red-800 rounded-xl p-4 flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-red-805">Verification Error</h5>
                    <p className="text-xs text-red-700 mt-0.5">{authError}</p>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 text-xs font-bold bg-[#1C4D8D] hover:bg-[#153B6C] text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirm & Access Portal
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setStep("phone")} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">Change phone number</button>
              <button type="button" onClick={handleRequestOtp} className="text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer">Resend Code</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // RENDER CUSTOMER PORTAL
  return (
    <div className="light min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 md:pb-10 print:bg-white print:pb-0">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {studio.logo_url && (
              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-100">
                <img src={studio.logo_url} alt={studio.name} className="object-contain max-h-full max-w-full" />
              </div>
            )}
            <span className="font-bold text-[#1a3869] text-base md:text-lg">{studio.name} Clients</span>
          </div>
          
          <div className="flex items-center gap-3">
            {activeEvent && events.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => setActiveEvent(null)} className="h-9 gap-1 text-slate-600 border-slate-200 text-xs">
                Back to Events
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogOut} className="h-9 gap-1.5 text-red-600 hover:text-red-700 hover:bg-slate-50 text-xs select-none">
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      {activeEvent ? (
        activeEvent.couplePhotoUrl ? (
          <div className="relative w-full h-72 md:h-80 bg-slate-900 print:h-52">
            <img src={activeEvent.couplePhotoUrl} alt="Cover" className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-5 md:p-8 max-w-7xl mx-auto flex items-end justify-between">
              <div className="space-y-2 text-white">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge className="bg-blue-650 text-white uppercase text-[10px] tracking-wider font-bold border-0 px-2 py-0.5">{activeEvent.eventType}</Badge>
                  <Badge variant="outline" className="text-white border-white/40 backdrop-blur-md px-2 py-0.5">{activeEvent.status}</Badge>
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{activeEvent.eventName}</h1>
                <p className="text-slate-350 text-sm md:text-base flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="w-4 h-4 text-blue-400" />
                  {activeEvent.days?.length > 0 ? format(safeDate(activeEvent.days[0].date), 'MMMM do, yyyy') : 'Date TBD'}
                </p>
              </div>
              
              <div className="hidden sm:block">
                {activeEvent.approval?.customer_confirmed ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-250 hover:bg-emerald-100 gap-1.5 px-3 py-1">
                    <CheckCircle className="w-3.5 h-3.5"/> Signed & Approved
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-250 hover:bg-amber-100 px-3 py-1 font-semibold">
                    Awaiting Signing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full bg-linear-to-r from-blue-50 to-indigo-50/50 border-b border-slate-200 py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="space-y-2 text-slate-800">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 uppercase text-[10px] tracking-wider font-bold px-2 py-0.5">{activeEvent.eventType}</Badge>
                  <Badge variant="outline" className="text-slate-650 border-slate-350 px-2 py-0.5">{activeEvent.status}</Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{activeEvent.eventName}</h1>
                <p className="text-slate-500 text-sm md:text-base flex items-center gap-1.5 font-medium animate-none">
                  <CalendarIcon className="w-4 h-4 text-blue-600 animate-none" />
                  {activeEvent.days?.length > 0 ? format(safeDate(activeEvent.days[0].date), 'MMMM do, yyyy') : 'Date TBD'}
                </p>
              </div>
              
              <div>
                {activeEvent.approval?.customer_confirmed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 px-3 py-1">
                    <CheckCircle className="w-3.5 h-3.5"/> Signed & Approved
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 px-3 py-1 font-semibold">
                    Awaiting Signing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-linear-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/60 py-12 md:py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 animate-none">Your Event Portal</h1>
            <p className="text-slate-500 text-sm md:text-base animate-none">Welcome back! Manage and review all events registered with {studio.name}.</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 relative">
        
        {/* VIEW: ALL EVENTS LIST */}
        {!activeEvent ? (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-2 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-[#1C4D8D]"/> Registered Events</h2>
            
            {events.length === 0 ? (
              <Card className="text-center py-10 bg-white">
                <CardContent className="space-y-2">
                  <p className="text-slate-400 italic">No events currently found.</p>
                  <p className="text-xs text-slate-400">If this is an error, please interface with studio operations.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((evt) => {
                  const dayText = evt.days?.length > 0 ? format(safeDate(evt.days[0].date), 'MMM dd, yyyy') : "TBD"
                  return (
                    <Card key={evt.id} className="hover:shadow-lg transition-shadow border-slate-200 bg-white flex flex-col justify-between overflow-hidden">
                      <div className="relative h-40 bg-slate-900">
                        {evt.couplePhotoUrl ? (
                          <img src={evt.couplePhotoUrl} alt={evt.eventName} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="absolute inset-0 bg-[#1C4D8D]/20 flex items-center justify-center"><Camera className="h-10 w-10 text-slate-300" /></div>
                        )}
                        <div className="absolute top-3 right-3">
                          {evt.approval?.customer_confirmed ? (
                            <Badge className="bg-green-600 text-white select-none border-0">Approved</Badge>
                          ) : (
                            <Badge className="bg-amber-600 text-white select-none border-0 font-semibold">Verify & Sign</Badge>
                          )}
                        </div>
                      </div>
                      
                      <CardHeader className="p-5 pb-2">
                        <span className="text-[10px] uppercase font-bold text-[#1C4D8D]">{evt.eventType}</span>
                        <CardTitle className="text-base line-clamp-1 font-bold text-slate-800">{evt.eventName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <CalendarIcon className="w-3 w-3" /> {dayText}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-100">
                          <span className="text-slate-400">Status</span>
                          <span className="font-semibold text-slate-700">{evt.status}</span>
                        </div>
                        
                        <Button onClick={() => { setActiveEvent(evt); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="w-full bg-[#1C4D8D] hover:bg-[#163b6b] text-white py-2 h-10 text-xs font-semibold mt-2">
                          View details
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* VIEW: EVENT CORE INFO (Similar to quote view) */
          <div 
            className={`${activeEvent?.couplePhotoUrl ? '-mt-12' : 'mt-4 md:mt-6'} relative z-10 print:mt-0 print:p-0`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
              
              {/* LEFT COLUMN: Itinerary & Overview */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. OVERVIEW SECTION */}
                <div className={`${activeTab === 'overview' ? 'block' : 'hidden lg:block'} print:block`}>
                  <div className="space-y-6">
                    {/* GALLERY */}
                    {allImages.length > 0 && (
                      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
                        <CardHeader className="bg-white border-b border-slate-100 py-3.5">
                          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Maximize2 className="w-4 h-4 text-[#1C4D8D]"/> Event Gallery ({allImages.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {allImages.slice(0, 4).map((img, idx) => (
                              <div 
                                key={idx} 
                                className="relative group aspect-square rounded-md overflow-hidden cursor-pointer bg-slate-100"
                                onClick={() => setLightboxIndex(idx)}
                              >
                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 w-5 h-5 drop-shadow-md transition-opacity"/>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* CONTACT CARD */}
                    <Card className="shadow-sm border-slate-200 bg-white">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5"><CardTitle className="text-sm font-bold text-slate-700">Client Information</CardTitle></CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400 uppercase">Primary client name</Label>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><User className="w-4 h-4 text-slate-400"/> {activeEvent.customerName}</div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400 uppercase">Phone Number</Label>
                              <div className="flex items-center gap-2 text-sm text-slate-700 font-mono"><Phone className="w-3.5 h-3.5 text-slate-400"/> {activeEvent.customerMobile}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400 uppercase">Email Address</Label>
                              <div className="flex items-center gap-2 text-sm text-slate-700"><Mail className="w-3.5 h-3.5 text-slate-400"/> {activeEvent.customerEmail || "N/A"}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* LOCATIONS */}
                    <div className="grid grid-cols-1 gap-6">
                      <Card className="shadow-sm border-slate-200 h-full bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5"><CardTitle className="text-sm font-bold text-slate-700">Shooting Locations</CardTitle></CardHeader>
                        <CardContent className="p-0">
                          {activeEvent.locations && activeEvent.locations.length > 0 ? (
                            activeEvent.locations.map((l, i) => (
                              <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50/50">
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5"/>
                                  <div>
                                    <div className="font-semibold text-slate-800 text-sm">{l.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{format(safeDate(l.date), 'MMM dd')} {l.time && `@ ${l.time}`}</div>
                                  </div>
                                </div>
                                {l.mapUrl && <a href={l.mapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"><ExternalLink className="h-3 w-3"/> Directions</a>}
                              </div>
                            ))
                          ) : <p className="p-5 text-sm text-slate-400 italic">No locations configured.</p>}
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-slate-200 h-full bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5"><CardTitle className="text-sm font-bold text-slate-700">Contacts list</CardTitle></CardHeader>
                        <CardContent className="p-0">
                          {activeEvent.contacts && activeEvent.contacts.length > 0 ? (
                            <div className="divide-y">
                              {activeEvent.contacts.map((c, i) => (
                                <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                                  <div>
                                    <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                                    <div className="text-xs text-slate-500">{c.role}</div>
                                  </div>
                                  <div className="text-sm font-mono text-slate-600">{c.phone}</div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="p-5 text-sm text-slate-400 italic">No contacts added.</p>}
                        </CardContent>
                      </Card>
                    </div>

                    {/* NOTES */}
                    <Card className="shadow-sm border-slate-200 bg-white">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5"><CardTitle className="text-sm font-bold text-slate-700">Additional Instructions & Notes</CardTitle></CardHeader>
                      <CardContent className="p-5">
                        {activeEvent.notes ? <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{activeEvent.notes}</p> : <p className="text-sm text-slate-400 italic">No instructions logged.</p>}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* 2. ITINERARY SECTION */}
                <div className={`${activeTab === 'itinerary' ? 'block' : 'hidden lg:block'} print:block`}>
                  <div className="lg:mt-4 space-y-6">
                    <Card className="shadow-sm border-slate-200 bg-white">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5">
                        <CardTitle className="text-sm font-bold text-slate-700">Detailed Packages & Coverages</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-5 space-y-5">
                        {activeEvent.days?.map((day, idx) => {
                          const pkg = day.type === 'package' && day.packageId ? packages.find(p => p.id === day.packageId) : null
                          return (
                            <div key={idx} className="border rounded-xl bg-white overflow-hidden shadow-xs border-slate-200">
                              <div className="p-5 pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-bold text-base text-slate-900">Day {idx + 1}</h3>
                                    <p className="text-slate-500 text-xs mt-0.5">{day.date ? format(safeDate(day.date), 'MMMM do, yyyy') : "TBD"}</p>
                                  </div>
                                  <Badge variant="outline" className={day.type === 'package' ? "text-blue-600 border-blue-200 bg-blue-50/50 text-xs" : "text-amber-600 border-amber-200 bg-amber-50/50 text-xs"}>
                                    {day.type === 'package' ? 'Package Plan' : 'Custom Coverage'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="px-5 py-3">
                                {day.type === 'package' && pkg && (
                                  <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="font-bold text-slate-800 text-sm">{pkg.name}</span>
                                      <span className="font-bold text-slate-700 text-sm">{financials.currency} {Number(pkg.price).toLocaleString()}</span>
                                    </div>
                                    {pkg.parameters && (
                                      <ul className="space-y-2">
                                        {Object.entries(pkg.parameters).map(([key, value], i) => {
                                          if (value === false) return null
                                          return (
                                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                              <span className="text-green-500 font-bold shrink-0">✓</span>
                                              <span>{key}{typeof value !== 'boolean' ? `: ${value}` : ''}</span>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                )}
                                {day.type === 'custom' && (
                                  <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-4">
                                    <div className="space-y-2">
                                      {day.customItems?.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs text-slate-700">
                                          <span>{item.name} <span className="text-slate-400 text-[10px] ml-1">× {item.quantity}</span></span>
                                          <span className="font-semibold">{(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                      ))}
                                      {!day.customItems?.length && <p className="text-slate-400 italic text-xs">Custom requirements package.</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-600">Day Total</span>
                                <span className="font-bold text-slate-800 text-sm">{financials.currency} {day.cost.toLocaleString()}</span>
                              </div>
                            </div>
                          )
                        })}

                        {activeEvent.additionalServices && activeEvent.additionalServices.length > 0 && (
                          <div className="pt-3">
                            <h4 className="font-bold text-slate-700 flex items-center gap-1.5 mb-3 text-sm"><Plus className="w-4 h-4 text-blue-600" /> Additional Add-ons</h4>
                            <div className="border rounded-xl bg-white overflow-hidden shadow-xs border-slate-200">
                              <div className="p-4">
                                <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-4">
                                  <div className="space-y-2">
                                    {activeEvent.additionalServices.map((svc, i) => (
                                      <div key={i} className="flex justify-between items-center text-xs text-slate-700">
                                        <span>{svc.name} <span className="text-slate-400 text-[10px] ml-1">× {svc.quantity}</span></span>
                                        <span className="font-semibold">{svc.total.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-600">Additional Services Total</span>
                                <span className="font-bold text-slate-850 text-sm">{financials.servicesCost.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Actionable & Financial */}
              <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
                
                {/* 3. FINANCE SECTION */}
                <div className={`${activeTab === 'finance' ? 'block' : 'hidden lg:block'} print:block print:break-inside-avoid`}>
                  <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5"><CardTitle className="text-sm font-bold text-slate-700">Financial Breakdown</CardTitle></CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-3 w-full text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Quoted charges</span>
                          <span className="font-semibold text-slate-800">{financials.currency} {financials.totalBudget.toLocaleString()}</span>
                        </div>
                        {financials.discountAmount > 0 && (
                          <div className="flex justify-between text-red-650 font-medium">
                            <span>Promo Discount {activeEvent.discountType === 'percentage' ? `(${activeEvent.discount}%)` : ''}</span>
                            <span>- {financials.currency} {financials.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-base font-bold text-[#1C4D8D]">
                          <span>Net Budget</span>
                          <span>{financials.currency} {financials.finalBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50/50 py-1.5 px-2 rounded border border-emerald-100/50">
                          <span>Receipts Paid</span>
                          <span>{financials.currency} {financials.paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-650 font-bold bg-rose-50/70 p-3 rounded-lg border border-red-100">
                          <span>Outstanding Balance</span>
                          <span>{financials.currency} {financials.due.toLocaleString()}</span>
                        </div>
                      </div>

                      {studio.banking_details && (
                        <div className="bg-[#1C4D8D]/5 border border-[#1C4D8D]/10 rounded-xl p-4.5 mt-2 space-y-2.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-[#1C4D8D] flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5"/> Direct Banking Deposit</Label>
                          <div className="text-xs space-y-1.5 text-slate-650">
                            <div className="flex justify-between border-b border-[#1C4D8D]/10 pb-1"><span>Bank / Institution</span><span className="font-semibold text-slate-800">{studio.banking_details.bank_name}</span></div>
                            <div className="flex justify-between border-b border-[#1C4D8D]/10 pb-1"><span>Branch Name</span><span>{studio.banking_details.branch}</span></div>
                            <div className="flex justify-between border-b border-[#1C4D8D]/10 pb-1"><span>Acc Name</span><span>{studio.banking_details.account_name}</span></div>
                            <div className="flex justify-between pt-1"><span>Account Number</span><span className="font-mono font-bold text-[#1C4D8D]">{studio.banking_details.account_number}</span></div>
                          </div>
                        </div>
                      )}

                      {studio.privacy_policy_notice && (
                        <div className="border border-slate-205 rounded-xl p-3.5 text-[10px] text-slate-500 leading-relaxed bg-slate-50/40">
                          <div className="font-bold text-slate-600 mb-1 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5"/> Terms Agreement</div>
                          <div className="whitespace-pre-line leading-relaxed text-justify">{studio.privacy_policy_notice}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 4. APPROVAL SIGNING SECTION */}
                <div className={`${activeTab === 'approval' ? 'block' : 'hidden lg:block'} print:block print:break-inside-avoid`}>
                  {activeEvent.approval?.customer_confirmed ? (
                    <Card className="bg-green-50 border-green-200 shadow-sm text-center">
                      <CardContent className="p-6 space-y-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                        <h2 className="text-lg font-bold text-green-800">Quotation Signed</h2>
                        <p className="text-green-700 text-xs">Electronically signed on the client portal.</p>
                        <div className="bg-white/60 rounded-lg p-3 text-xs text-left max-w-sm mx-auto space-y-1.5 border border-green-100 mt-2">
                          <div className="flex justify-between"><span className="text-slate-500">Signatory:</span><span className="font-semibold text-slate-800">{activeEvent.customerName}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span><span className="font-semibold text-slate-800">{activeEvent.approval?.confirmedAt ? format(safeDate(activeEvent.approval.confirmedAt), "PPP p") : 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Document Type:</span><span className="font-semibold text-slate-800">{activeEvent.approval?.verification_type}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">ID Ref:</span><span className="font-mono font-semibold text-slate-800">{activeEvent.approval?.verification_document_number}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-t-4 border-t-[#1C4D8D] shadow-md bg-white">
                      <CardHeader className="py-4 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-700">Digital Verification Signing</CardTitle>
                        <CardDescription className="text-xs">Provide credentials to electronically sign this event proposal.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3 text-xs">
                          <div className="space-y-1.5"><Label className="text-slate-500">Full Name</Label><Input value={activeEvent.customerName} disabled className="bg-slate-50 h-9 text-xs"/></div>
                          <div className="space-y-2">
                            <Label className="text-slate-500">Verify With <span className="text-red-500">*</span></Label>
                            <Select value={verifType} onValueChange={setVerifType}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select verification type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="id">National Identiy Card (NIC)</SelectItem>
                                <SelectItem value="passport">Passport Identifier</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-500">{verifType === 'id' ? 'NIC Number' : 'Passport Number'} <span className="text-red-500">*</span></Label>
                            <Input placeholder={verifType === 'id' ? "e.g. 199012345678" : "Enter Passport Ref"} value={verifDocNum} onChange={(e) => setVerifDocNum(e.target.value.toUpperCase())} className="h-9 text-xs" />
                          </div>
                          <p className="text-[10px] text-slate-400">{verifType === 'id' ? "Old (9 digits + V/X) or New (12 digits)." : "Valid international passport."}</p>
                        </div>
                        
                        <Alert className="bg-blue-50/50 border-blue-100 p-3">
                          <AlertCircle className="h-3.5 w-3.5 text-blue-600 mt-0.5" />
                          <AlertDescription className="text-blue-750 text-[10px] leading-tight">By submitting, you declare the contents of this quote represent final parameters of operations and sign electronically.</AlertDescription>
                        </Alert>
                        
                        <Button onClick={handleApproveEvent} className="w-full bg-[#1C4D8D] hover:bg-[#163b6b] h-10 text-xs font-semibold text-white" disabled={isSubmitting}>
                          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Executing...</> : "Verify & Sign Proposal"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* LIGHTBOX OVERLAY */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-300 print:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-6 h-6"/>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-16 text-white hover:bg-white/20 z-50 rounded-full"
            onClick={() => downloadImage(allImages[lightboxIndex])}
            title="Download Image"
          >
            <Download className="w-6 h-6"/>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : allImages.length - 1) }}
          >
            <ChevronLeft className="w-8 h-8"/>
          </Button>

          <img 
            src={allImages[lightboxIndex]} 
            alt="Full View" 
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
          />

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev < allImages.length - 1 ? prev + 1 : 0) }}
          >
            <ChevronRight className="w-8 h-8"/>
          </Button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
            {lightboxIndex + 1} / {allImages.length}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Only when active event selected) */}
      {activeEvent && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 lg:hidden z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
          <div className="flex justify-around items-center h-16">
            <button 
              onClick={() => { setActiveTab('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'overview' ? 'text-[#1C4D8D]' : 'text-slate-400'}`}
            >
              <Info className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Overview</span>
              {activeTab === 'overview' && <span className="absolute top-0 w-8 h-1 bg-[#1C4D8D] rounded-b-full" />}
            </button>
            
            <button 
              onClick={() => { setActiveTab('itinerary'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'itinerary' ? 'text-[#1C4D8D]' : 'text-slate-400'}`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Itinerary</span>
              {activeTab === 'itinerary' && <span className="absolute top-0 w-8 h-1 bg-[#1C4D8D] rounded-b-full" />}
            </button>
            
            <button 
              onClick={() => { setActiveTab('finance'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'finance' ? 'text-[#1C4D8D]' : 'text-slate-400'}`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Finance</span>
              {activeTab === 'finance' && <span className="absolute top-0 w-8 h-1 bg-[#1C4D8D] rounded-b-full" />}
            </button>
            
            <button 
              onClick={() => { setActiveTab('approval'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'approval' ? 'text-[#1C4D8D]' : 'text-slate-400'}`}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Approval</span>
              {activeTab === 'approval' && <span className="absolute top-0 w-8 h-1 bg-[#1C4D8D] rounded-b-full" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
