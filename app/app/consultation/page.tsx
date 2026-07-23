"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import {
    fetchEvents, fetchPackagesList, fetchStudioSettingsList, fetchPackageConfig,
    EventData, PackageData, PackageConfigParameter
} from "@/services/event-service"
import {
    saveConsultation, fetchConsultations, deleteConsultation, convertToEvent,
    ConsultationData, CustomItem
} from "@/services/consultation-service"
import { format } from "date-fns"

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Icons
import {
    Loader2, ChevronRight, ChevronLeft, Save, CheckCircle,
    Maximize2, Minimize2, MapPin, Calendar as CalendarIcon, DollarSign,
    Image as ImageIcon, Plus, Trash2, User, Play, X, ZoomIn, ZoomOut, Info, LayoutTemplate, Search,
    Sparkles, FileText, Phone, Mail, Tag, SlidersHorizontal, Package, Star, ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
})
import { PhoneInput } from "@/components/ui/phone-input"
import { validatePhoneNumber, parseE164 } from "@/lib/phone-utils"
import { CountryCode } from "libphonenumber-js"
import { safeDate } from "@/lib/date-utils"

// --- TYPES ---
interface ExtendedConfigParam extends PackageConfigParameter {
    type?: 'boolean' | 'numeric' | 'text';
}

interface ExtendedConsultationData extends Omit<ConsultationData, 'package'> {
    package: {
        selectedPackageId?: string;
        customItems: CustomItem[];
        customBaseItems: CustomItem[];
        totalEstimate: number;
    }
}

// --- STEPPER ---
const steps = ["Requirements", "Inspiration", "Packages", "Review"]

const ConsultationStepper = ({ currentStep }: { currentStep: number }) => {
    if (currentStep <= 0.5) return null
    const displayIndex = currentStep - 1

    return (
        <div className="flex items-center gap-1">
            {steps.map((label, idx) => (
                <div key={label} className="flex items-center">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                        displayIndex === idx
                            ? "bg-[#1C4D8D] text-white shadow-md shadow-blue-200"
                            : displayIndex > idx
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "text-slate-400"
                    )}>
                        {displayIndex > idx
                            ? <CheckCircle className="w-3 h-3" />
                            : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]"
                                style={{ borderColor: displayIndex === idx ? 'white' : '#cbd5e1' }}>
                                {idx + 1}
                              </span>
                        }
                        <span className="hidden sm:inline">{label}</span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div className={cn("w-6 h-px mx-1", displayIndex > idx ? "bg-emerald-300" : "bg-slate-200")} />
                    )}
                </div>
            ))}
        </div>
    )
}

// --- SECTION LABEL ---
const SectionLabel = ({ icon: Icon, label }: { icon: React.ElementType, label: string }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#1C4D8D]" />
        </div>
        <span className="font-semibold text-slate-700 text-sm">{label}</span>
    </div>
)

export default function ConsultationPage() {
    const { userData } = useAuth()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [currency, setCurrency] = useState("LKR")

    const [drafts, setDrafts] = useState<ConsultationData[]>([])
    const [loadingDrafts, setLoadingDrafts] = useState(false)
    const [draftPage, setDraftPage] = useState(1)
    const [draftSearch, setDraftSearch] = useState("")
    const DRAFTS_PER_PAGE = 10

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [showInfoPanel, setShowInfoPanel] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(1)

    const [events, setEvents] = useState<EventData[]>([])
    const [packages, setPackages] = useState<PackageData[]>([])
    const [configParams, setConfigParams] = useState<ExtendedConfigParam[]>([])
    const [eventTypes, setEventTypes] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])

    const [consultation, setConsultation] = useState<ExtendedConsultationData>({
        studioId: "",
        status: "draft",
        client: { name: "", mobile: "", email: "" },
        requirements: {
            eventType: "Weddings",
            budgetRange: [150000, 400000],
            locations: [],
            styleTags: [],
            deliverables: { photo: true, video: true, album: true, drone: false },
            notes: ""
        },
        inspiration: { matchedEventIds: [], selectedEventIds: [] },
        package: { customItems: [], customBaseItems: [], totalEstimate: 0 }
    })

    useEffect(() => {
        if (!userData?.studioID) return
        const init = async () => {
            try {
                const [evtList, pkgList, types, params, currencySetting] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchPackagesList(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES'),
                    fetchPackageConfig(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'CURRENCY' as any)
                ])

                setEvents(evtList)
                setPackages(pkgList)
                setConfigParams(params as ExtendedConfigParam[])
                setEventTypes(types.length ? types : ["Weddings", "Homecoming", "Preshoot", "Birthday", "Corporate"])

                if (currencySetting && currencySetting.length > 0) {
                    setCurrency(currencySetting[0])
                }

                const tags = new Set<string>()
                evtList.forEach(e => e.tags?.forEach(t => tags.add(t)))
                setAvailableTags(Array.from(tags).sort())

                setConsultation(prev => ({ ...prev, studioId: userData.studioID! }))
            } catch (e) {
                console.error("Init failed", e)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [userData])

    const matchedEvents = useMemo(() => {
        return events.filter(e => {
            const typeMatch = e.eventType === consultation.requirements.eventType
            const tagMatch = consultation.requirements.styleTags.length === 0 ||
                (e.tags && e.tags.some(t => consultation.requirements.styleTags.includes(t)))
            const hasImages = e.couplePhotoUrl || (e.galleryUrls && e.galleryUrls.length > 0)
            return typeMatch && tagMatch && hasImages
        }).slice(0, 20)
    }, [events, consultation.requirements.eventType, consultation.requirements.styleTags])

    const matchedPackages = useMemo(() => {
        const maxBudget = consultation.requirements.budgetRange[1]
        return packages.filter(p => {
            return !p.disabled && Number(p.price) <= (maxBudget * 1.25)
        }).sort((a, b) => Number(a.price) - Number(b.price))
    }, [packages, consultation.requirements.budgetRange])

    useEffect(() => {
        let basePrice = 0

        if (consultation.package.selectedPackageId === 'custom') {
            basePrice = consultation.package.customBaseItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
        } else if (consultation.package.selectedPackageId) {
            const p = packages.find(pkg => pkg.id === consultation.package.selectedPackageId)
            if (p) basePrice = Number(p.price)
        }

        const addons = consultation.package.customItems.reduce((acc, item) => acc + (item.price * item.qty), 0)

        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, totalEstimate: basePrice + addons }
        }))
    }, [consultation.package.selectedPackageId, consultation.package.customItems, consultation.package.customBaseItems, packages])

    const createNewItem = (param?: PackageConfigParameter): CustomItem => {
        return param
            ? { name: param.name, qty: 1, unit: param.unit || "", price: param.defaultPrice || 0 }
            : { name: "", qty: 1, unit: "", price: 0 }
    }

    const addAddonItem = (param?: PackageConfigParameter) => {
        const newItem = createNewItem(param)
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customItems: [...prev.package.customItems, newItem] }
        }))
    }

    const updateAddonItem = (index: number, field: keyof CustomItem, value: any) => {
        const newItems = consultation.package.customItems.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        )
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customItems: newItems }
        }))
    }

    const removeAddonItem = (index: number) => {
        const newItems = consultation.package.customItems.filter((_, i) => i !== index)
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customItems: newItems }
        }))
    }

    const addBaseItem = (param?: PackageConfigParameter) => {
        const newItem = createNewItem(param)
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customBaseItems: [...prev.package.customBaseItems, newItem] }
        }))
    }

    const updateBaseItem = (index: number, field: keyof CustomItem, value: any) => {
        const newItems = consultation.package.customBaseItems.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        )
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customBaseItems: newItems }
        }))
    }

    const removeBaseItem = (index: number) => {
        const newItems = consultation.package.customBaseItems.filter((_, i) => i !== index)
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customBaseItems: newItems }
        }))
    }

    const toggleConfigParam = (param: ExtendedConfigParam, active: boolean) => {
        if (active) {
            const newItem = createNewItem(param)
            setConsultation(prev => ({
                ...prev,
                package: { ...prev.package, customBaseItems: [...prev.package.customBaseItems, newItem] }
            }))
        } else {
            setConsultation(prev => ({
                ...prev,
                package: { ...prev.package, customBaseItems: prev.package.customBaseItems.filter(i => i.name !== param.name) }
            }))
        }
    }

    const updateConfigParamValue = (paramName: string, field: 'qty' | 'price', value: number) => {
        setConsultation(prev => ({
            ...prev,
            package: {
                ...prev.package,
                customBaseItems: prev.package.customBaseItems.map(item =>
                    item.name === paramName ? { ...item, [field]: value } : item
                )
            }
        }))
    }

    const handleLightboxNext = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev < matchedEvents.length - 1 ? prev + 1 : 0))
        setZoomLevel(1)
    }, [matchedEvents.length])

    const handleLightboxPrev = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : matchedEvents.length - 1))
        setZoomLevel(1)
    }, [matchedEvents.length])

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (lightboxIndex === null) return
        if (e.key === "ArrowRight") handleLightboxNext()
        if (e.key === "ArrowLeft") handleLightboxPrev()
        if (e.key === "Escape") setLightboxIndex(null)
    }, [lightboxIndex, handleLightboxNext, handleLightboxPrev])

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [handleKeyDown])

    const handleAutoSave = async (silent = true) => {
        if (!userData?.studioID) return
        setIsSaving(true)
        try {
            const saved = await saveConsultation(userData.studioID, consultation as unknown as ConsultationData)
            if (!consultation.id) setConsultation(prev => ({ ...prev, id: saved.id }))
            if (!silent) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true })
                Toast.fire({ icon: 'success', title: 'Consultation saved' })
            }
        } catch (e) {
            console.error("Save failed", e)
            if (!silent) Swal.fire({ icon: 'error', title: 'Save Failed', text: 'Could not save the draft.' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleLoadDrafts = async () => {
        if (!userData?.studioID) return
        setLoadingDrafts(true)
        setStep(0.5)
        setDraftPage(1)
        try {
            const data = await fetchConsultations(userData.studioID, 'draft')
            const extendedData = data.map(d => ({
                ...d,
                package: {
                    ...d.package,
                    customBaseItems: (d.package as any).customBaseItems || []
                }
            }))
            setDrafts(extendedData)
        } catch (e) { console.error(e) }
        finally { setLoadingDrafts(false) }
    }

    const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation()
        if (!userData?.studioID) return
        const confirm = await Swal.fire({ title: 'Delete Draft?', text: "This cannot be undone!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete it!' })
        if (confirm.isConfirmed) {
            try {
                await deleteConsultation(userData.studioID, draftId)
                setDrafts(prev => prev.filter(d => d.id !== draftId))
                Swal.fire('Deleted!', 'Draft has been removed.', 'success')
            } catch (error) { Swal.fire('Error', 'Failed to delete draft.', 'error') }
        }
    }

    const selectDraft = (draft: ConsultationData) => {
        const extendedDraft = {
            ...draft,
            package: {
                ...draft.package,
                customBaseItems: (draft.package as any).customBaseItems || []
            }
        } as ExtendedConsultationData

        setConsultation(extendedDraft)
        setStep(1)
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
        Toast.fire({ icon: 'success', title: 'Draft Loaded' })
    }

    const handleConvertToEvent = async () => {
        const result = await Swal.fire({ title: 'Convert to Event?', text: `Create "${consultation.requirements.eventType}" event for ${consultation.client.name}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, Create', confirmButtonColor: '#1C4D8D' })
        if (!result.isConfirmed || !userData?.studioID) return

        setLoading(true)
        try {
            await convertToEvent(userData.studioID, consultation as unknown as ConsultationData, packages)
            Swal.fire({ title: 'Success!', text: 'Event created successfully.', icon: 'success', timer: 1500 })
            router.push('/app/events')
        } catch (e) {
            console.error(e)
            Swal.fire('Error', 'Failed to convert consultation.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const filteredDrafts = useMemo(() => {
        return drafts.filter(d =>
            d.client.name?.toLowerCase().includes(draftSearch.toLowerCase()) ||
            d.requirements.eventType?.toLowerCase().includes(draftSearch.toLowerCase())
        )
    }, [drafts, draftSearch])

    const paginatedDrafts = useMemo(() => {
        const startIndex = (draftPage - 1) * DRAFTS_PER_PAGE
        return filteredDrafts.slice(startIndex, startIndex + DRAFTS_PER_PAGE)
    }, [filteredDrafts, draftPage])

    const totalPages = Math.ceil(filteredDrafts.length / DRAFTS_PER_PAGE)

    const handleNext = () => {
        if (step === 1) {
            if (!consultation.client.name) {
                return Swal.fire({ icon: 'warning', title: 'Required', text: 'Client name is missing.' })
            }
            if (consultation.client.mobile) {
                const parsed = parseE164(consultation.client.mobile)
                const countryToValidate = parsed ? parsed.countryCode : ((userData?.country || "LK") as any)
                const isValid = validatePhoneNumber(consultation.client.mobile, countryToValidate)
                if (!isValid) {
                    return Swal.fire({ icon: 'warning', title: 'Invalid Phone Number', text: 'Please enter a valid phone number for the client.' })
                }
            }
        }
        if (step > 0) handleAutoSave()
        setStep(s => Math.min(s + 1, 4))
    }

    const currentLightboxEvent = lightboxIndex !== null ? matchedEvents[lightboxIndex] : null

    const selectedPackage = packages.find(p => p.id === consultation.package.selectedPackageId)

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#1C4D8D]" />
                <p className="text-sm text-slate-500">Loading consultation...</p>
            </div>
        </div>
    )

    return (
        <div className={cn("h-full bg-slate-50 flex flex-col overflow-hidden w-full")}>
            {/* Header */}
            <header className="shrink-0 h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1C4D8D] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-[#0F2854] text-sm">Consultation</span>
                    </div>
                    {step > 0.5 && <div className="hidden sm:block w-px h-5 bg-slate-200" />}
                    <ConsultationStepper currentStep={step} />
                </div>
                <div className="flex items-center gap-2">
                    {step > 0.5 && (
                        isSaving
                            ? <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                            : <span className="text-xs text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Saved</span>
                    )}
                    <Button
                        variant="ghost" size="icon"
                        className="w-8 h-8 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                            if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullScreen(true) }
                            else { document.exitFullscreen(); setIsFullScreen(false) }
                        }}
                    >
                        {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-700" onClick={() => setStep(0)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1">
                        <div className="p-6 pb-28 max-w-5xl mx-auto w-full">

                            {/* STEP 0: WELCOME */}
                            {step === 0 && (
                                <div className="flex flex-col items-center justify-center min-h-[65vh] animate-in fade-in zoom-in-95 duration-500">
                                    <div className="text-center mb-10">
                                        <div className="w-16 h-16 rounded-2xl bg-[#1C4D8D] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                                            <Sparkles className="w-8 h-8 text-white" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-[#0F2854]">Consultation Studio</h1>
                                        <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
                                            Walk clients through a guided flow to capture requirements, find inspiration, and build a quote.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
                                        <button
                                            onClick={() => {
                                                setConsultation({
                                                    studioId: userData?.studioID || "", status: "draft",
                                                    client: { name: "", mobile: "", email: "" },
                                                    requirements: { eventType: "Weddings", budgetRange: [150000, 400000], locations: [], styleTags: [], deliverables: { photo: true, video: true, album: true, drone: false }, notes: "" },
                                                    inspiration: { matchedEventIds: [], selectedEventIds: [] },
                                                    package: { customItems: [], customBaseItems: [], totalEstimate: 0 }
                                                })
                                                setStep(1)
                                            }}
                                            className="group relative bg-white rounded-2xl border border-slate-200 p-7 text-left hover:border-[#1C4D8D] hover:shadow-lg hover:shadow-blue-100 transition-all duration-200"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-[#1C4D8D] transition-colors">
                                                <Play className="w-6 h-6 text-[#1C4D8D] group-hover:text-white ml-0.5 transition-colors" />
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-base">New Consultation</h3>
                                            <p className="text-slate-500 text-sm mt-1">Start fresh with a new client</p>
                                            <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-[#1C4D8D] group-hover:translate-x-1 transition-all" />
                                        </button>

                                        <button
                                            onClick={handleLoadDrafts}
                                            className="group relative bg-white rounded-2xl border border-slate-200 p-7 text-left hover:border-slate-400 hover:shadow-md transition-all duration-200"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-slate-100 transition-colors">
                                                <Save className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-base">Resume Draft</h3>
                                            <p className="text-slate-500 text-sm mt-1">Continue a saved consultation</p>
                                            <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 0.5: DRAFTS */}
                            {step === 0.5 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-[#0F2854]">Saved Drafts</h2>
                                            <p className="text-slate-500 text-xs mt-0.5">Select a consultation to resume</p>
                                        </div>
                                        <div className="relative w-60">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <Input
                                                placeholder="Search by client or event..."
                                                className="pl-8 h-9 bg-white text-sm"
                                                value={draftSearch}
                                                onChange={(e) => setDraftSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/70">
                                                    <TableHead className="font-semibold text-slate-600">Client</TableHead>
                                                    <TableHead className="font-semibold text-slate-600">Event Type</TableHead>
                                                    <TableHead className="font-semibold text-slate-600">Target Date</TableHead>
                                                    <TableHead className="text-right font-semibold text-slate-600">Estimate ({currency})</TableHead>
                                                    <TableHead className="text-right font-semibold text-slate-600">Last Updated</TableHead>
                                                    <TableHead className="w-12" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loadingDrafts ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                                            <span className="text-sm">Loading drafts...</span>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : paginatedDrafts.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                                                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                            <p className="text-sm">No drafts found.</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : paginatedDrafts.map((draft) => (
                                                    <TableRow key={draft.id} className="cursor-pointer hover:bg-slate-50 group transition-colors" onClick={() => selectDraft(draft)}>
                                                        <TableCell className="font-medium text-slate-800">{draft.client.name || "Untitled"}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs font-normal">{draft.requirements.eventType}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {draft.requirements.date ? format(safeDate(draft.requirements.date), "MMM dd, yyyy") : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-slate-700 text-sm">
                                                            {draft.package.totalEstimate.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-slate-400">
                                                            {draft.updatedAt ? format(safeDate(draft.updatedAt), "MMM dd, hh:mm a") : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                                                                onClick={(e) => handleDeleteDraft(e, draft.id!)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {totalPages > 1 && (
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious onClick={() => setDraftPage(p => Math.max(1, p - 1))} className={draftPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"} />
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <span className="text-xs text-slate-500 px-4">Page {draftPage} of {totalPages}</span>
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationNext onClick={() => setDraftPage(p => Math.min(totalPages, p + 1))} className={draftPage === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"} />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )}

                                    <Button variant="outline" size="sm" onClick={() => setStep(0)} className="text-slate-600">
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                </div>
                            )}

                            {/* STEP 1: REQUIREMENTS */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#0F2854]">Client Requirements</h2>
                                        <p className="text-slate-500 text-sm mt-0.5">Capture the client's details and event preferences</p>
                                    </div>

                                    {/* Client Info */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <SectionLabel icon={User} label="Client Information" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Client Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={consultation.client.name}
                                                    onChange={e => setConsultation({ ...consultation, client: { ...consultation.client, name: e.target.value } })}
                                                    className="h-10 bg-slate-50 border-slate-200"
                                                    placeholder="e.g. Amantha & Nethmi"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Mobile</Label>
                                                <PhoneInput
                                                    value={consultation.client.mobile || ""}
                                                    onChange={val => setConsultation({ ...consultation, client: { ...consultation.client, mobile: val } })}
                                                    placeholder="Phone Number"
                                                />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label className="text-xs font-medium text-slate-600">Email</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        value={consultation.client.email}
                                                        onChange={e => setConsultation({ ...consultation, client: { ...consultation.client, email: e.target.value } })}
                                                        className="h-10 pl-9 bg-slate-50 border-slate-200"
                                                        placeholder="email@example.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Event Details */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <SectionLabel icon={CalendarIcon} label="Event Details" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Event Type</Label>
                                                <Select value={consultation.requirements.eventType} onValueChange={v => setConsultation({ ...consultation, requirements: { ...consultation.requirements, eventType: v } })}>
                                                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-600">Event Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full h-10 justify-start text-left font-normal bg-slate-50 border-slate-200 text-slate-700">
                                                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                            {consultation.requirements.date ? format(consultation.requirements.date, "PPP") : <span className="text-slate-400">Select Date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={consultation.requirements.date} onSelect={(d) => setConsultation({ ...consultation, requirements: { ...consultation.requirements, date: d } })} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Budget */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <SectionLabel icon={DollarSign} label="Budget Range" />
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-500">Maximum budget</span>
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                                                    <span className="font-mono font-bold text-[#1C4D8D] text-sm">
                                                        {currency} {consultation.requirements.budgetRange[1].toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <Slider
                                                defaultValue={[consultation.requirements.budgetRange[1]]}
                                                max={2000000}
                                                step={25000}
                                                onValueChange={(val) => setConsultation({ ...consultation, requirements: { ...consultation.requirements, budgetRange: [0, val[0]] } })}
                                                className="py-2"
                                            />
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>0</span>
                                                <span>{currency} 2,000,000</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: INSPIRATION */}
                            {step === 2 && (
                                <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-[#0F2854]">Inspiration Gallery</h2>
                                            <p className="text-slate-500 text-sm mt-0.5">Browse matching work to inspire the client</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-normal">
                                                {matchedEvents.length} matches
                                            </Badge>
                                            {consultation.inspiration.selectedEventIds.length > 0 && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                                                    {consultation.inspiration.selectedEventIds.length} selected
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {availableTags.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {availableTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        const tags = consultation.requirements.styleTags
                                                        setConsultation({ ...consultation, requirements: { ...consultation.requirements, styleTags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] } })
                                                    }}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                                                        consultation.requirements.styleTags.includes(tag)
                                                            ? "bg-[#1C4D8D] text-white border-[#1C4D8D]"
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                                    )}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {matchedEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400">
                                            <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                                            <p className="text-sm">No matching events found.</p>
                                        </div>
                                    ) : (
                                        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                                            {matchedEvents.map((event, idx) => (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setLightboxIndex(idx)}
                                                    className={cn(
                                                        "break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                                                        consultation.inspiration.selectedEventIds.includes(event.id!)
                                                            ? "border-[#1C4D8D] ring-2 ring-blue-200"
                                                            : "border-transparent hover:border-slate-300"
                                                    )}
                                                >
                                                    <img src={event.couplePhotoUrl || "/placeholder.jpg"} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" alt={event.eventName} />
                                                    <button
                                                        className={cn(
                                                            "absolute top-2 right-2 rounded-full p-1.5 shadow-md z-10 transition-all",
                                                            consultation.inspiration.selectedEventIds.includes(event.id!)
                                                                ? "bg-[#1C4D8D] text-white scale-110"
                                                                : "bg-white/80 text-slate-400 hover:bg-white hover:text-[#1C4D8D]"
                                                        )}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const current = consultation.inspiration.selectedEventIds
                                                            const newIds = current.includes(event.id!) ? current.filter(id => id !== event.id) : [...current, event.id!]
                                                            setConsultation({ ...consultation, inspiration: { ...consultation.inspiration, selectedEventIds: newIds } })
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                        <p className="text-white font-medium text-xs truncate">{event.eventName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: PACKAGES */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#0F2854]">Package Selection</h2>
                                        <p className="text-slate-500 text-sm mt-0.5">Select a base package or build a custom one</p>
                                    </div>

                                    {/* Package Cards */}
                                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                        {matchedPackages.map((pkg, i) => {
                                            const isSelected = consultation.package.selectedPackageId === pkg.id
                                            return (
                                                <button
                                                    key={pkg.id}
                                                    onClick={() => setConsultation({ ...consultation, package: { ...consultation.package, selectedPackageId: pkg.id } })}
                                                    className={cn(
                                                        "min-w-[260px] w-[280px] snap-center rounded-2xl border-2 text-left transition-all duration-200 flex flex-col overflow-hidden shrink-0",
                                                        isSelected
                                                            ? "border-[#1C4D8D] shadow-lg shadow-blue-100"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                                                    )}
                                                >
                                                    <div className={cn("p-5 transition-colors", isSelected ? "bg-[#1C4D8D]" : "bg-slate-50")}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={cn("text-xs font-medium uppercase tracking-wider", isSelected ? "text-blue-200" : "text-slate-400")}>
                                                                Package {i + 1}
                                                            </span>
                                                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <p className={cn("font-bold text-lg leading-tight", isSelected ? "text-white" : "text-slate-800")}>{pkg.name}</p>
                                                        <p className={cn("font-mono text-2xl font-bold mt-1", isSelected ? "text-blue-100" : "text-[#1C4D8D]")}>
                                                            {Number(pkg.price).toLocaleString()}
                                                            <span className={cn("text-xs font-normal ml-1", isSelected ? "text-blue-300" : "text-slate-400")}>{currency}</span>
                                                        </p>
                                                    </div>
                                                    <div className="p-5 bg-white flex-1">
                                                        <ul className="space-y-2">
                                                            {pkg.featuresList?.slice(0, 5).map((f, fi) => (
                                                                <li key={fi} className="flex items-start gap-2 text-xs text-slate-600">
                                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                                    {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </button>
                                            )
                                        })}

                                        {/* Custom Package Card */}
                                        <button
                                            onClick={() => setConsultation({ ...consultation, package: { ...consultation.package, selectedPackageId: 'custom' } })}
                                            className={cn(
                                                "min-w-[220px] w-[240px] snap-center rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 shrink-0 transition-all duration-200",
                                                consultation.package.selectedPackageId === 'custom'
                                                    ? "border-[#1C4D8D] bg-blue-50"
                                                    : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", consultation.package.selectedPackageId === 'custom' ? "bg-[#1C4D8D]" : "bg-slate-100")}>
                                                <Plus className={cn("w-6 h-6", consultation.package.selectedPackageId === 'custom' ? "text-white" : "text-slate-400")} />
                                            </div>
                                            <div className="text-center">
                                                <p className={cn("font-bold text-sm", consultation.package.selectedPackageId === 'custom' ? "text-[#1C4D8D]" : "text-slate-600")}>Custom Package</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Build from scratch</p>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Custom Package Builder */}
                                    {consultation.package.selectedPackageId === 'custom' && (
                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
                                                <LayoutTemplate className="w-4 h-4 text-[#1C4D8D]" />
                                                <h3 className="font-semibold text-slate-800 text-sm">Package Configuration</h3>
                                            </div>
                                            <div className="p-6 space-y-2">
                                                {configParams.map((param, idx) => {
                                                    const isActive = consultation.package.customBaseItems.some(i => i.name === param.name)
                                                    const currentItem = consultation.package.customBaseItems.find(i => i.name === param.name)
                                                    const isBoolean = param.type === 'boolean' || param.name.toLowerCase().startsWith('include')

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                                                                isActive ? "bg-blue-50/50 border-blue-100" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">{param.name}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">{currency} {param.defaultPrice?.toLocaleString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {isActive && !isBoolean && (
                                                                    <div className="flex items-center gap-1.5 animate-in fade-in">
                                                                        <Input type="number" className="w-14 h-7 text-center text-xs border-slate-200" value={currentItem?.qty ?? 1} onChange={(e) => updateConfigParamValue(param.name, 'qty', Number(e.target.value))} />
                                                                        <span className="text-xs text-slate-400">×</span>
                                                                        <Input type="number" className="w-24 h-7 text-right text-xs border-slate-200" value={currentItem?.price ?? param.defaultPrice ?? 0} onChange={(e) => updateConfigParamValue(param.name, 'price', Number(e.target.value))} />
                                                                    </div>
                                                                )}
                                                                {isBoolean
                                                                    ? <Switch checked={isActive} onCheckedChange={(checked) => toggleConfigParam(param, checked)} />
                                                                    : !isActive
                                                                        ? <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => toggleConfigParam(param, true)}>Add</Button>
                                                                        : <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => toggleConfigParam(param, false)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center">
                                                <span className="text-xs text-slate-500">Base Package Total</span>
                                                <span className="font-bold text-sm text-[#1C4D8D]">{currency} {consultation.package.customBaseItems.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add-ons */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Plus className="w-4 h-4 text-[#1C4D8D]" />
                                                <h3 className="font-semibold text-slate-800 text-sm">Add-ons & Extras</h3>
                                            </div>
                                            <Select onValueChange={(val) => {
                                                if (val === 'custom_new') addAddonItem()
                                                else {
                                                    const param = configParams.find(p => p.name === val)
                                                    addAddonItem(param)
                                                }
                                            }}>
                                                <SelectTrigger className="w-44 h-8 text-xs bg-white border-slate-200">
                                                    <SelectValue placeholder="Add item..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="custom_new" className="text-blue-600 font-medium text-xs">Custom Item...</SelectItem>
                                                    <Separator className="my-1" />
                                                    {configParams.map((p, idx) => (<SelectItem key={idx} value={p.name} className="text-xs">{p.name}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="p-6">
                                            {consultation.package.customItems.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">No add-ons added. Use the dropdown above to add extras.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                                                        <span className="col-span-5 text-xs text-slate-400 font-medium">Item</span>
                                                        <span className="col-span-2 text-xs text-slate-400 font-medium text-center">Qty</span>
                                                        <span className="col-span-4 text-xs text-slate-400 font-medium text-right">Price ({currency})</span>
                                                    </div>
                                                    {consultation.package.customItems.map((item, idx) => (
                                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-5">
                                                                <Input value={item.name} onChange={(e) => updateAddonItem(idx, 'name', e.target.value)} className="h-8 text-xs border-slate-200" placeholder="Item name" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Input type="number" value={item.qty ?? 1} onChange={(e) => updateAddonItem(idx, 'qty', Number(e.target.value))} className="h-8 text-xs text-center border-slate-200" />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <Input type="number" value={item.price ?? 0} onChange={(e) => updateAddonItem(idx, 'price', Number(e.target.value))} className="h-8 text-xs text-right border-slate-200" />
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => removeAddonItem(idx)}>
                                                                    <Trash2 className="h-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {consultation.package.customItems.length > 0 && (
                                            <div className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center">
                                                <span className="text-xs text-slate-500">Add-ons Total</span>
                                                <span className="font-bold text-sm text-slate-800">
                                                    {currency} {consultation.package.customItems.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: REVIEW */}
                            {step === 4 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="text-center py-2">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle className="w-7 h-7 text-emerald-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Final Review</h2>
                                        <p className="text-slate-500 text-sm mt-1">Review all details before converting to an event</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Client Card */}
                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                            <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-500" />
                                                <span className="font-semibold text-slate-700 text-sm">Client Details</span>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                {[
                                                    { label: "Name", value: consultation.client.name || "—" },
                                                    { label: "Mobile", value: consultation.client.mobile || "—" },
                                                    { label: "Email", value: consultation.client.email || "—" },
                                                    { label: "Event Type", value: consultation.requirements.eventType },
                                                    { label: "Date", value: consultation.requirements.date ? format(consultation.requirements.date, "PPP") : "—" },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                                                        <span className="text-xs text-slate-400">{label}</span>
                                                        <span className="text-sm font-medium text-slate-700">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Estimate Card */}
                                        <div className="bg-white rounded-2xl border border-[#1C4D8D]/20 overflow-hidden">
                                            <div className="px-5 py-4 border-b bg-blue-50 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-[#1C4D8D]" />
                                                <span className="font-semibold text-[#0F2854] text-sm">Estimate Summary</span>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                {selectedPackage && (
                                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                        <span className="text-xs text-slate-400">Package</span>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-slate-700">{selectedPackage.name}</p>
                                                            <p className="text-xs text-slate-400 font-mono">{currency} {Number(selectedPackage.price).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {consultation.package.selectedPackageId === 'custom' && consultation.package.customBaseItems.length > 0 && (
                                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                        <span className="text-xs text-slate-400">Custom Base</span>
                                                        <span className="text-sm font-mono text-slate-700">{currency} {consultation.package.customBaseItems.reduce((a, i) => a + i.price * i.qty, 0).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {consultation.package.customItems.length > 0 && (
                                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                        <span className="text-xs text-slate-400">Add-ons ({consultation.package.customItems.length})</span>
                                                        <span className="text-sm font-mono text-slate-700">{currency} {consultation.package.customItems.reduce((a, i) => a + i.price * i.qty, 0).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="pt-2">
                                                    <div className="bg-[#1C4D8D] rounded-xl p-4 flex items-center justify-between">
                                                        <span className="text-blue-200 text-sm font-medium">Total Estimate</span>
                                                        <span className="font-mono font-bold text-white text-2xl">{consultation.package.totalEstimate.toLocaleString()}<span className="text-blue-300 text-sm ml-1">{currency}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                        <Label className="text-xs font-semibold text-slate-600 mb-2 block">Final Notes</Label>
                                        <Textarea
                                            placeholder="Any final notes for this consultation..."
                                            value={consultation.requirements.notes}
                                            onChange={e => setConsultation({ ...consultation, requirements: { ...consultation.requirements, notes: e.target.value } })}
                                            className="h-24 bg-slate-50 border-slate-200 resize-none text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer Navigation */}
                    {step > 0.5 && (
                        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                            <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.max(s - 1, 0))} className="text-slate-500 hover:text-slate-800">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm" onClick={() => handleAutoSave(false)} disabled={isSaving} className="border-slate-200 text-slate-600 text-xs">
                                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Draft
                                </Button>
                                {step < 4
                                    ? <Button size="sm" className="bg-[#1C4D8D] hover:bg-[#153a6b] px-6 text-xs" onClick={handleNext}>
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                    : <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 text-xs" onClick={handleConvertToEvent}>
                                        <CheckCircle className="w-4 h-4 mr-1.5" /> Convert to Event
                                    </Button>
                                }
                            </div>
                        </div>
                    )}
                </main>

                {/* Sidebar Summary */}
                {step > 0.5 && (
                    <aside className="w-72 bg-white border-l border-slate-200 hidden lg:flex flex-col z-40 shrink-0">
                        <div className="px-5 py-4 border-b">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Summary</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Client */}
                            {consultation.client.name && (
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Client</p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-[#1C4D8D]">{consultation.client.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 leading-tight">{consultation.client.name}</p>
                                            <p className="text-xs text-slate-400">{consultation.requirements.eventType}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Date & Budget */}
                            <div className="space-y-2">
                                {consultation.requirements.date && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                        {format(consultation.requirements.date, "MMM dd, yyyy")}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                    Budget up to {currency} {consultation.requirements.budgetRange[1].toLocaleString()}
                                </div>
                            </div>

                            {/* Inspiration */}
                            {consultation.inspiration.selectedEventIds.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Inspiration</p>
                                    <p className="text-xs text-slate-600">{consultation.inspiration.selectedEventIds.length} event(s) selected</p>
                                </div>
                            )}

                            {/* Package */}
                            {consultation.package.selectedPackageId && (
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Package</p>
                                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                                        {consultation.package.selectedPackageId === 'custom' ? (
                                            <p className="text-xs font-medium text-slate-700">Custom Build</p>
                                        ) : (
                                            <p className="text-xs font-medium text-slate-700">{selectedPackage?.name}</p>
                                        )}
                                        {consultation.package.selectedPackageId === 'custom' && consultation.package.customBaseItems.map((item, i) => (
                                            <div key={i} className="flex justify-between text-[11px] text-slate-500">
                                                <span>{item.name} ×{item.qty}</span>
                                                <span>{(item.price * item.qty).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add-ons */}
                            {consultation.package.customItems.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Add-ons</p>
                                    <div className="space-y-1">
                                        {consultation.package.customItems.map((add, i) => (
                                            <div key={i} className="flex justify-between text-[11px] text-slate-500">
                                                <span>{add.name} ×{add.qty}</span>
                                                <span>+{(add.price * add.qty).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className="p-5 border-t shrink-0">
                            <div className="bg-[#1C4D8D] rounded-xl p-4">
                                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">Total Estimate</p>
                                <p className="font-mono font-bold text-white text-xl">
                                    {consultation.package.totalEstimate.toLocaleString()}
                                    <span className="text-blue-300 text-xs ml-1">{currency}</span>
                                </p>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && currentLightboxEvent && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex animate-in fade-in duration-200">
                    <div className="flex-1 relative flex items-center justify-center h-full">
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                            <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-full w-9 h-9" onClick={() => setZoomLevel(z => Math.min(z + 0.5, 3))}>
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-full w-9 h-9" onClick={() => setZoomLevel(1)}>
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="icon" className={cn("bg-white/10 text-white hover:bg-white/20 border-0 rounded-full w-9 h-9", showInfoPanel && "text-blue-400")} onClick={() => setShowInfoPanel(!showInfoPanel)}>
                                <Info className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-full w-9 h-9" onClick={() => setLightboxIndex(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="absolute left-4 z-40 text-white hover:bg-white/10 rounded-full w-11 h-11" onClick={(e) => { e.stopPropagation(); handleLightboxPrev() }}>
                            <ChevronLeft className="w-7 h-7" />
                        </Button>
                        <Button variant="ghost" size="icon" className="absolute right-4 z-40 text-white hover:bg-white/10 rounded-full w-11 h-11" onClick={(e) => { e.stopPropagation(); handleLightboxNext() }}>
                            <ChevronRight className="w-7 h-7" />
                        </Button>
                        <div className="w-full h-full flex items-center justify-center p-16 overflow-hidden" onClick={() => setZoomLevel(1)}>
                            <img src={currentLightboxEvent.couplePhotoUrl} alt="Full View" className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg" style={{ transform: `scale(${zoomLevel})` }} />
                        </div>
                    </div>

                    {showInfoPanel && (
                        <div className="w-72 bg-white border-l border-slate-200 shrink-0 h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
                            <div className="p-5 border-b">
                                <h2 className="text-lg font-bold text-[#0F2854] leading-tight">{currentLightboxEvent.eventName}</h2>
                                <Badge className="mt-2 bg-blue-50 text-blue-700 border-blue-200 font-normal text-xs">{currentLightboxEvent.eventType}</Badge>
                            </div>
                            <div className="p-5 space-y-4 flex-1">
                                <div className="flex items-start gap-3">
                                    <CalendarIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-600">Date</p>
                                        <p className="text-sm text-slate-500 mt-0.5">{currentLightboxEvent.days?.[0] ? format(safeDate(currentLightboxEvent.days[0].date), "PPP") : "N/A"}</p>
                                    </div>
                                </div>
                                {currentLightboxEvent.locations?.[0] && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-medium text-slate-600">Location</p>
                                            <p className="text-sm text-slate-500 mt-0.5 truncate">{currentLightboxEvent.locations[0].name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t">
                                <Button
                                    className={cn("w-full text-sm", consultation.inspiration.selectedEventIds.includes(currentLightboxEvent.id!)
                                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                        : "bg-[#1C4D8D] hover:bg-[#153a6b]"
                                    )}
                                    onClick={() => {
                                        const current = consultation.inspiration.selectedEventIds
                                        const newIds = current.includes(currentLightboxEvent.id!) ? current.filter(id => id !== currentLightboxEvent.id) : [...current, currentLightboxEvent.id!]
                                        setConsultation({ ...consultation, inspiration: { ...consultation.inspiration, selectedEventIds: newIds } })
                                    }}
                                >
                                    {consultation.inspiration.selectedEventIds.includes(currentLightboxEvent.id!)
                                        ? <><Trash2 className="w-4 h-4 mr-1.5" /> Remove</>
                                        : <><CheckCircle className="w-4 h-4 mr-1.5" /> Select as Inspiration</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
