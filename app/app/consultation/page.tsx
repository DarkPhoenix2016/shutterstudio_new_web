"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { 
    fetchEvents, fetchPackagesList, fetchStudioSettingsList, fetchPackageConfig,
    createEvent, EventData, PackageData, PackageConfigParameter 
} from "@/services/event-service"
import { 
    saveConsultation, fetchConsultations, convertConsultationStatus, 
    ConsultationData 
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// Icons
import {
    Loader2, ChevronRight, ChevronLeft, Save, CheckCircle, 
    Maximize2, Minimize2, MapPin, Calendar as CalendarIcon, DollarSign,
    Image as ImageIcon, Plus, Trash2, User, Video, Camera, LayoutTemplate, 
    ArrowRight, Play, X, ZoomIn, ZoomOut, Info, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// --- COMPONENTS ---

const ConsultationStepper = ({ currentStep }: { currentStep: number }) => {
    if (currentStep === 0) return null;
    const steps = ["Requirements", "Inspiration", "Packages", "Review"];
    const displayIndex = currentStep - 1; 

    return (
        <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar">
            {steps.map((label, idx) => (
                <div key={label} className="flex items-center shrink-0">
                    <div className={cn(
                        "px-3 py-1 rounded-full border transition-colors text-xs md:text-sm whitespace-nowrap",
                        displayIndex === idx 
                            ? "bg-[#1C4D8D] text-white border-[#1C4D8D] font-medium" 
                            : displayIndex > idx 
                                ? "bg-green-100 text-green-700 border-green-200" 
                                : "text-slate-400 border-slate-200"
                    )}>
                        {idx + 1}. {label}
                    </div>
                    {idx < steps.length - 1 && <div className="w-4 h-[1px] bg-slate-200 mx-2" />}
                </div>
            ))}
        </div>
    );
};

// --- HELPER: SAFE DATE ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (typeof dateInput.toDate === 'function') return dateInput.toDate();
        return new Date(dateInput);
    } catch { return new Date(); }
};

export default function ConsultationPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // --- STATE ---
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(0) 
    const [isSaving, setIsSaving] = useState(false)
    const [isFullScreen, setIsFullScreen] = useState(false)

    // Draft Loading
    const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
    const [drafts, setDrafts] = useState<ConsultationData[]>([])
    const [loadingDrafts, setLoadingDrafts] = useState(false)

    // Lightbox State
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [showInfoPanel, setShowInfoPanel] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(1)

    // Master Data
    const [events, setEvents] = useState<EventData[]>([])
    const [packages, setPackages] = useState<PackageData[]>([])
    const [configParams, setConfigParams] = useState<PackageConfigParameter[]>([]) // [!code highlight]
    const [eventTypes, setEventTypes] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])

    // Consultation Data
    const [consultation, setConsultation] = useState<ConsultationData>({
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
        package: { customItems: [], totalEstimate: 0 }
    });

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!userData?.studioID) return;
        const init = async () => {
            try {
                const [evtList, pkgList, types, params] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchPackagesList(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES'),
                    fetchPackageConfig(userData.studioID) // [!code highlight] Fetch Params
                ]);
                
                setEvents(evtList);
                setPackages(pkgList);
                setConfigParams(params as PackageConfigParameter[]);
                setEventTypes(types.length ? types : ["Weddings", "Homecoming", "Preshoot", "Birthday", "Corporate"]);
                
                const tags = new Set<string>();
                evtList.forEach(e => e.tags?.forEach(t => tags.add(t)));
                setAvailableTags(Array.from(tags).sort());
                
                setConsultation(prev => ({ ...prev, studioId: userData.studioID! }));
            } catch (e) {
                console.error("Init failed", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userData]);

    // --- MATCHING LOGIC ---
    const matchedEvents = useMemo(() => {
        return events.filter(e => {
            const typeMatch = e.eventType === consultation.requirements.eventType;
            const tagMatch = consultation.requirements.styleTags.length === 0 || 
                             (e.tags && e.tags.some(t => consultation.requirements.styleTags.includes(t)));
            const hasImages = e.couplePhotoUrl || (e.galleryUrls && e.galleryUrls.length > 0);
            return typeMatch && tagMatch && hasImages;
        }).slice(0, 20);
    }, [events, consultation.requirements.eventType, consultation.requirements.styleTags]);

    const matchedPackages = useMemo(() => {
        const maxBudget = consultation.requirements.budgetRange[1];
        return packages.filter(p => {
            return !p.disabled && Number(p.price) <= (maxBudget * 1.25);
        }).sort((a,b) => Number(a.price) - Number(b.price));
    }, [packages, consultation.requirements.budgetRange]);

    useEffect(() => {
        let basePrice = 0;
        if (consultation.package.selectedPackageId && consultation.package.selectedPackageId !== 'custom') {
            const p = packages.find(pkg => pkg.id === consultation.package.selectedPackageId);
            if (p) basePrice = Number(p.price);
        }
        const addons = consultation.package.customItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, totalEstimate: basePrice + addons }
        }));
    }, [consultation.package.selectedPackageId, consultation.package.customItems, packages]);

    // --- CUSTOM ITEM HANDLERS (From EventForm) ---
    const addCustomItem = (param?: PackageConfigParameter) => {
        const newItem = param 
            ? { name: param.name, qty: 1, price: param.defaultPrice || 0 }
            : { name: "", qty: 1, price: 0 };
        
        setConsultation(prev => ({
            ...prev,
            package: {
                ...prev.package,
                customItems: [...prev.package.customItems, newItem]
            }
        }));
    };

    const updateCustomItem = (index: number, field: 'name' | 'qty' | 'price', value: any) => {
        const newItems = [...consultation.package.customItems];
        // @ts-ignore
        newItems[index][field] = value;
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customItems: newItems }
        }));
    };

    const removeCustomItem = (index: number) => {
        const newItems = consultation.package.customItems.filter((_, i) => i !== index);
        setConsultation(prev => ({
            ...prev,
            package: { ...prev.package, customItems: newItems }
        }));
    };

    // --- LIGHTBOX ACTIONS ---
    const handleLightboxNext = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev < matchedEvents.length - 1 ? prev + 1 : 0));
        setZoomLevel(1);
    }, [matchedEvents.length]);

    const handleLightboxPrev = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : matchedEvents.length - 1));
        setZoomLevel(1);
    }, [matchedEvents.length]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (lightboxIndex === null) return;
        if (e.key === "ArrowRight") handleLightboxNext();
        if (e.key === "ArrowLeft") handleLightboxPrev();
        if (e.key === "Escape") setLightboxIndex(null);
    }, [lightboxIndex, handleLightboxNext, handleLightboxPrev]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // --- MAIN ACTIONS ---
    const handleAutoSave = async (silent = true) => {
        if (!userData?.studioID) return;
        setIsSaving(true);
        try {
            const saved = await saveConsultation(userData.studioID, consultation);
            if (!consultation.id) setConsultation(prev => ({ ...prev, id: saved.id }));
            if (!silent) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true });
                Toast.fire({ icon: 'success', title: 'Consultation saved' });
            }
        } catch (e) {
            console.error("Save failed", e);
            if (!silent) Swal.fire({ icon: 'error', title: 'Save Failed', text: 'Could not save the draft.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadDrafts = async () => {
        if (!userData?.studioID) return;
        setLoadingDrafts(true);
        setIsLoadDialogOpen(true);
        try {
            const data = await fetchConsultations(userData.studioID, 'draft');
            setDrafts(data);
        } catch (e) { console.error(e); } 
        finally { setLoadingDrafts(false); }
    };

    const selectDraft = (draft: ConsultationData) => {
        setConsultation(draft);
        setIsLoadDialogOpen(false);
        setStep(1);
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Draft Loaded' });
    };

    const handleNext = () => {
        if (step === 1 && !consultation.client.name) {
            return Swal.fire({ icon: 'warning', title: 'Client Name Required', text: 'Please enter a client name.' });
        }
        if (step > 0) handleAutoSave(); 
        setStep(s => Math.min(s + 1, 4));
    };

    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const handleConvertToEvent = async () => {
        const result = await Swal.fire({
            title: 'Convert to Event?',
            text: `Create "${consultation.requirements.eventType}" event for ${consultation.client.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Create',
            confirmButtonColor: '#1C4D8D'
        });

        if (!result.isConfirmed || !userData?.studioID) return;

        setLoading(true);
        try {
            const newEvent: EventData = {
                eventName: `${consultation.requirements.eventType} - ${consultation.client.name}`,
                customerName: consultation.client.name,
                customerMobile: consultation.client.mobile,
                customerEmail: consultation.client.email,
                eventType: consultation.requirements.eventType,
                status: "Inquiry",
                inquiryDate: new Date(),
                dayCount: 1,
                days: consultation.requirements.date ? [{ 
                    date: consultation.requirements.date, 
                    type: consultation.package.selectedPackageId === 'custom' ? 'custom' : 'package',
                    packageId: consultation.package.selectedPackageId !== 'custom' ? consultation.package.selectedPackageId : undefined,
                    cost: consultation.package.totalEstimate,
                    customItems: [] 
                }] : [],
                totalBudget: consultation.package.totalEstimate,
                discountType: 'fixed',
                discount: 0,
                finalBudget: consultation.package.totalEstimate,
                advancePaid: 0,
                assignedCrew: [],
                assignedEquipment: [],
                tags: consultation.requirements.styleTags,
                notes: `Consultation Notes:\n${consultation.requirements.notes || "None"}`,
                additionalServices: consultation.package.customItems.map(item => ({
                    id: crypto.randomUUID(),
                    name: item.name,
                    type: 'custom',
                    quantity: item.qty,
                    pricePerUnit: item.price,
                    total: item.price * item.qty
                }))
            };

            await createEvent(userData.studioID, newEvent);
            if (consultation.id) await convertConsultationStatus(userData.studioID, consultation.id);

            Swal.fire({ title: 'Success!', text: 'Event created.', icon: 'success', timer: 1500 });
            router.push('/app/events');
        } catch (e) {
            Swal.fire('Error', 'Failed to convert consultation.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const currentLightboxEvent = lightboxIndex !== null ? matchedEvents[lightboxIndex] : null;

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className={cn("h-full bg-slate-50 flex flex-col overflow-hidden w-full", isFullScreen ? "p-0" : "")}>
            
            {/* 1. HEADER */}
            <header className="shrink-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-50">
                <div className="flex items-center gap-6">
                    <div className="hidden md:block font-bold text-[#0F2854] text-lg">Consultation</div>
                    <ConsultationStepper currentStep={step} />
                </div>
                <div className="flex items-center gap-3">
                    {step > 0 && (
                        isSaving ? (
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Saving...</span>
                        ) : (
                            <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Saved</span>
                        )
                    )}
                    <Button variant="ghost" size="icon" onClick={toggleFullScreen} title="Toggle Focus Mode">
                        {isFullScreen ? <Minimize2 className="w-4 h-4 text-slate-500" /> : <Maximize2 className="w-4 h-4 text-slate-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/app/dashboard')}>
                        <X className="w-4 h-4 text-slate-500" />
                    </Button>
                </div>
            </header>

            {/* 2. BODY LAYOUT */}
            <div className="flex flex-1 overflow-hidden w-full">
                
                {/* 2A. LEFT: Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
                    <ScrollArea className="flex-1 w-full">
                        <div className="p-6 pb-24 max-w-6xl mx-auto w-full"> 
                            
                            {/* --- STEP 0: WELCOME --- */}
                            {step === 0 && (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-bold text-[#0F2854]">Welcome</h2>
                                        <p className="text-slate-500 text-lg">Start a new consultation session or load a draft.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                                        <Card className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group" onClick={() => {
                                            setConsultation({
                                                studioId: userData?.studioID || "",
                                                status: "draft",
                                                client: { name: "", mobile: "", email: "" },
                                                requirements: { eventType: "Weddings", budgetRange: [150000, 400000], locations: [], styleTags: [], deliverables: { photo: true, video: true, album: true, drone: false }, notes: "" },
                                                inspiration: { matchedEventIds: [], selectedEventIds: [] },
                                                package: { customItems: [], totalEstimate: 0 }
                                            });
                                            setStep(1);
                                        }}>
                                            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800">New Consultation</h3>
                                                    <p className="text-slate-500 mt-1">Start fresh with a new client.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group" onClick={handleLoadDrafts}>
                                            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                    <Save className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800">Load Saved</h3>
                                                    <p className="text-slate-500 mt-1">Resume a previous draft.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 1: REQUIREMENTS (Keep existing UI) --- */}
                            {step === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="text-center mb-4">
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Client Requirements</h2>
                                        <p className="text-slate-500 mt-1">Gather the key details to start matching.</p>
                                    </div>
                                    <Card className="border-0 shadow-md">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Client Name *</Label>
                                                    <Input value={consultation.client.name} onChange={e => setConsultation({...consultation, client: {...consultation.client, name: e.target.value}})} className="h-12 text-lg bg-slate-50" placeholder="e.g. Amantha & Nethmi"/>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Event Type</Label>
                                                    <Select value={consultation.requirements.eventType} onValueChange={v => setConsultation({...consultation, requirements: {...consultation.requirements, eventType: v}})}>
                                                        <SelectTrigger className="h-12 text-lg bg-slate-50"><SelectValue /></SelectTrigger>
                                                        <SelectContent>{eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Preferred Date</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="w-full h-12 justify-start text-left font-normal text-lg">
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {consultation.requirements.date ? format(consultation.requirements.date, "PPP") : "Select Date"}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={consultation.requirements.date} onSelect={(d) => setConsultation({...consultation, requirements: {...consultation.requirements, date: d}})} initialFocus/></PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Contact Mobile</Label>
                                                    <Input value={consultation.client.mobile} onChange={e => setConsultation({...consultation, client: {...consultation.client, mobile: e.target.value}})} className="h-12 text-lg bg-slate-50" placeholder="07x xxxxxxx"/>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-end">
                                                        <Label className="text-base">Budget Range</Label>
                                                        <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded">Up to {consultation.requirements.budgetRange[1].toLocaleString()} LKR</span>
                                                    </div>
                                                    <Slider defaultValue={[consultation.requirements.budgetRange[1]]} max={2000000} step={25000} onValueChange={(val) => setConsultation({...consultation, requirements: {...consultation.requirements, budgetRange: [0, val[0]]}})} className="py-4"/>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-base">Style Preferences</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {availableTags.slice(0, 12).map(tag => (
                                                            <Badge key={tag} variant={consultation.requirements.styleTags.includes(tag) ? "default" : "outline"} className={cn("cursor-pointer px-3 py-1.5", consultation.requirements.styleTags.includes(tag) ? "bg-[#1C4D8D]" : "text-slate-600")} onClick={() => {
                                                                const tags = consultation.requirements.styleTags;
                                                                const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
                                                                setConsultation({...consultation, requirements: {...consultation.requirements, styleTags: newTags}});
                                                            }}>{tag}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* --- STEP 2: INSPIRATION (Keep existing UI) --- */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="flex justify-between items-end border-b pb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-[#0F2854]">Inspiration Gallery</h2>
                                            <p className="text-slate-500">Events matching "{consultation.requirements.eventType}"</p>
                                        </div>
                                        <Badge variant="secondary" className="text-base px-3 py-1">{matchedEvents.length} Matches</Badge>
                                    </div>
                                    {matchedEvents.length > 0 ? (
                                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                            {matchedEvents.map((event, idx) => (
                                                <div key={event.id} onClick={() => setLightboxIndex(idx)} className={cn("break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all bg-slate-100", consultation.inspiration.selectedEventIds.includes(event.id!) ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent")}>
                                                    <img src={event.couplePhotoUrl || "/placeholder.jpg"} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" alt={event.eventName}/>
                                                    {consultation.inspiration.selectedEventIds.includes(event.id!) && <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-md z-10"><CheckCircle className="w-4 h-4" /></div>}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3"><p className="text-white font-bold text-xs truncate">{event.eventName}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                                            <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                                            <p className="text-slate-500 font-medium">No matching events found.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- STEP 3: PACKAGES (Updated with Advanced Builder) --- */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Package Selection</h2>
                                        <p className="text-slate-500">Packages within budget ({consultation.requirements.budgetRange[1].toLocaleString()} LKR)</p>
                                    </div>

                                    {/* 1. Package Slider */}
                                    <div className="flex gap-4 overflow-x-auto pb-6 snap-x no-scrollbar">
                                        {matchedPackages.map(pkg => (
                                            <Card 
                                                key={pkg.id} 
                                                className={cn(
                                                    "min-w-[300px] w-[320px] snap-center cursor-pointer transition-all border-2 relative hover:shadow-lg flex flex-col",
                                                    consultation.package.selectedPackageId === pkg.id 
                                                        ? "border-blue-500 shadow-xl scale-105 z-10" 
                                                        : "border-slate-100 hover:border-blue-200"
                                                )}
                                                onClick={() => setConsultation({...consultation, package: {...consultation.package, selectedPackageId: pkg.id}})}
                                            >
                                                {consultation.package.selectedPackageId === pkg.id && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">
                                                        Selected
                                                    </div>
                                                )}
                                                <CardHeader className="pb-2 bg-slate-50/50">
                                                    <CardTitle className="text-xl font-bold text-slate-800">{pkg.name}</CardTitle>
                                                    <div className="font-mono text-blue-700 font-bold text-2xl">
                                                        {Number(pkg.price).toLocaleString()} <span className="text-xs text-slate-400 font-normal">LKR</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="text-sm space-y-4 pt-4 flex-1">
                                                    <p className="text-slate-500 text-xs line-clamp-3">{pkg.description || "No description."}</p>
                                                    <Separator />
                                                    <ul className="space-y-2">
                                                        {pkg.featuresList?.slice(0,6).map((f, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-slate-600">
                                                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                                <span className="text-xs font-medium">{f}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {/* Custom Card */}
                                        <Card 
                                            className={cn(
                                                "min-w-[300px] w-[320px] snap-center cursor-pointer border-dashed border-2 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors",
                                                consultation.package.selectedPackageId === 'custom' ? "border-blue-500 bg-blue-50" : "border-slate-300"
                                            )}
                                            onClick={() => setConsultation({...consultation, package: {...consultation.package, selectedPackageId: 'custom'}})}
                                        >
                                            <div className="text-center p-6 text-slate-400">
                                                <div className="bg-white p-4 rounded-full inline-flex mb-3 shadow-sm"><Plus className="w-8 h-8 text-slate-400" /></div>
                                                <p className="font-bold text-slate-600">Build Custom Package</p>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* 2. Package Details (If Standard Package Selected) */}
                                    {consultation.package.selectedPackageId && consultation.package.selectedPackageId !== 'custom' && (
                                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl space-y-4">
                                            <h3 className="font-bold text-[#0F2854]">Included in Base Package</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                                                {matchedPackages.find(p => p.id === consultation.package.selectedPackageId)?.featuresList?.map((feature, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Custom Add-ons Builder */}
                                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                                        <div className="flex justify-between items-center border-b pb-4">
                                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600"/> Custom Add-ons & Extras</h3>
                                            
                                            {/* Advanced Add Parameter Dropdown */}
                                            <Select onValueChange={(val) => {
                                                if (val === 'custom_new') addCustomItem();
                                                else {
                                                    const param = configParams.find(p => p.name === val);
                                                    addCustomItem(param);
                                                }
                                            }}>
                                                <SelectTrigger className="w-[200px] h-9 text-xs bg-slate-50 border-slate-300">
                                                    <SelectValue placeholder="Add Item..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {configParams.map((p, idx) => (
                                                        <SelectItem key={idx} value={p.name}>{p.name} {p.unit ? `(${p.unit})` : ''} (+{p.defaultPrice})</SelectItem>
                                                    ))}
                                                    <Separator className="my-1" />
                                                    <SelectItem value="custom_new" className="text-blue-600 font-medium">Create New...</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {consultation.package.customItems.length > 0 ? (
                                            <div className="space-y-3">
                                                {consultation.package.customItems.map((item, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2 duration-300">
                                                        <div className="flex-1">
                                                            <Label className="text-xs text-slate-500 mb-1 block">Item Name</Label>
                                                            <Input 
                                                                value={item.name} 
                                                                onChange={(e) => updateCustomItem(idx, 'name', e.target.value)}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="w-24">
                                                            <Label className="text-xs text-slate-500 mb-1 block text-center">Qty</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={item.qty}
                                                                onChange={(e) => updateCustomItem(idx, 'qty', Number(e.target.value))}
                                                                className="h-9 text-center"
                                                            />
                                                        </div>
                                                        <div className="w-32">
                                                            <Label className="text-xs text-slate-500 mb-1 block text-right">Price (LKR)</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={item.price}
                                                                onChange={(e) => updateCustomItem(idx, 'price', Number(e.target.value))}
                                                                className="h-9 text-right font-mono"
                                                            />
                                                        </div>
                                                        <div className="pt-5">
                                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => removeCustomItem(idx)}>
                                                                <Trash2 className="w-4 h-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex justify-end pt-4 border-t">
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500 uppercase">Add-ons Total</p>
                                                        <p className="font-bold text-slate-800 text-lg">
                                                            {consultation.package.customItems.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString()} LKR
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                <p className="text-slate-400 text-sm">No extra items added yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 4: REVIEW (Keep existing) --- */}
                            {step === 4 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="text-center">
                                        <h2 className="text-3xl font-bold text-[#0F2854]">Final Review</h2>
                                        <p className="text-slate-500 mt-2">Ready to convert this consultation into a confirmed event?</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <Card>
                                            <CardHeader className="bg-slate-50/50 pb-4"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4"/> Client Details</CardTitle></CardHeader>
                                            <CardContent className="space-y-4 pt-6 text-sm">
                                                <div className="flex justify-between py-2 border-b"><span className="text-slate-500">Name</span><span className="font-medium">{consultation.client.name}</span></div>
                                                <div className="flex justify-between py-2 border-b"><span className="text-slate-500">Event</span><span className="font-medium">{consultation.requirements.eventType}</span></div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-blue-200 shadow-md">
                                            <CardHeader className="bg-blue-50/50 pb-4"><CardTitle className="text-base flex items-center gap-2 text-blue-800"><DollarSign className="w-4 h-4"/> Estimate</CardTitle></CardHeader>
                                            <CardContent className="space-y-4 pt-6 text-sm">
                                                <div className="flex justify-between items-center pt-4">
                                                    <span className="font-bold text-lg text-[#0F2854]">Total</span>
                                                    <span className="font-mono font-bold text-2xl text-[#1C4D8D]">{consultation.package.totalEstimate.toLocaleString()} LKR</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Final Notes</Label>
                                        <Textarea 
                                            placeholder="Notes..." 
                                            value={consultation.requirements.notes} 
                                            onChange={e => setConsultation({...consultation, requirements: {...consultation.requirements, notes: e.target.value}})}
                                            className="h-24 bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer Actions */}
                    {step > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div>
                                <Button variant="ghost" onClick={handleBack} className="text-slate-500">
                                    <ChevronLeft className="w-4 h-4 mr-2"/> Back
                                </Button>
                            </div>
                            <div className="flex items-center gap-4">
                                {step > 0 && (
                                    <Button variant="outline" onClick={() => handleAutoSave(false)} disabled={isSaving} className="border-slate-300 text-slate-600">
                                        <Save className="w-4 h-4 mr-2" /> Save Draft
                                    </Button>
                                )}
                                {step < 4 ? (
                                    <Button className="bg-[#1C4D8D] px-8 hover:bg-[#153a6b]" onClick={handleNext}>
                                        Next Step <ChevronRight className="w-4 h-4 ml-2"/>
                                    </Button>
                                ) : (
                                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleConvertToEvent}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Convert to Event
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </main>

                {/* Sidebar Summary */}
                {step > 0 && (
                    <aside className="w-80 bg-white border-l border-slate-200 shadow-xl hidden lg:flex flex-col z-40 h-full">
                        <div className="p-6 border-b shrink-0">
                            <h3 className="font-bold text-[#0F2854] text-sm uppercase tracking-wide">Live Summary</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Budget Limit</p>
                                <p className="text-sm font-mono text-slate-700">{consultation.requirements.budgetRange[1].toLocaleString()} LKR</p>
                            </div>
                            {consultation.package.selectedPackageId && (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Selected Package</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 truncate flex-1 font-medium">
                                            {consultation.package.selectedPackageId === 'custom' ? 'Custom Build' : packages.find(p => p.id === consultation.package.selectedPackageId)?.name}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {consultation.package.customItems.length > 0 && (
                                <div className="space-y-1 border-t pt-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Add-ons</p>
                                    {consultation.package.customItems.map((add, i) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-500">
                                            <span>{add.name} (x{add.qty})</span>
                                            <span>+{(add.price * add.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t bg-slate-50 shrink-0">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-medium text-slate-500">Estimated Total</span>
                                <span className="text-xl font-bold text-[#1C4D8D]">
                                    {consultation.package.totalEstimate.toLocaleString()}
                                </span>
                            </div>
                            {consultation.package.totalEstimate > consultation.requirements.budgetRange[1] && (
                                <div className="bg-red-50 text-red-600 text-[10px] p-2 rounded flex items-center gap-2">
                                    <span className="font-bold">Over Budget:</span> 
                                    {(consultation.package.totalEstimate - consultation.requirements.budgetRange[1]).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Dialogs & Overlays */}
            <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Load Saved Consultation</DialogTitle>
                        <DialogDescription>Pick a draft to resume.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {loadingDrafts ? <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div> : (
                            drafts.length === 0 ? <p className="text-center text-slate-400 py-4">No drafts found.</p> :
                            drafts.map(draft => (
                                <div key={draft.id} className="p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => selectDraft(draft)}>
                                    <div className="font-medium">{draft.client.name || "Untitled Draft"}</div>
                                    <div className="text-xs text-slate-500 flex justify-between">
                                        <span>{draft.requirements.eventType}</span>
                                        <span>{draft.updatedAt ? format(draft.updatedAt instanceof Date ? draft.updatedAt : new Date(), "MMM dd") : ""}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightboxIndex !== null && currentLightboxEvent && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex animate-in fade-in duration-200">
                    <div className="flex-1 relative flex items-center justify-center h-full w-full">
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                            <Button variant="secondary" size="icon" className="bg-black/50 text-white hover:bg-black/70 border-0 rounded-full" onClick={() => setZoomLevel(z => Math.min(z + 0.5, 3))}><ZoomIn className="w-5 h-5" /></Button>
                            <Button variant="secondary" size="icon" className="bg-black/50 text-white hover:bg-black/70 border-0 rounded-full" onClick={() => setZoomLevel(1)}><ZoomOut className="w-5 h-5" /></Button>
                            <Button variant="secondary" size="icon" className={`bg-black/50 text-white hover:bg-black/70 border-0 rounded-full ${showInfoPanel ? "text-blue-400" : ""}`} onClick={() => setShowInfoPanel(!showInfoPanel)}><Info className="w-5 h-5" /></Button>
                            <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-full" onClick={() => setLightboxIndex(null)}><X className="w-6 h-6" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="absolute left-4 z-40 text-white hover:bg-white/10 rounded-full w-12 h-12" onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}><ChevronLeft className="w-8 h-8" /></Button>
                        <Button variant="ghost" size="icon" className="absolute right-4 z-40 text-white hover:bg-white/10 rounded-full w-12 h-12" onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}><ChevronRight className="w-8 h-8" /></Button>
                        <div className="w-full h-full flex items-center justify-center p-4 overflow-hidden" onClick={() => setZoomLevel(1)}>
                            <img src={currentLightboxEvent.couplePhotoUrl} alt="Full View" className="max-h-full max-w-full object-contain transition-transform duration-200" style={{ transform: `scale(${zoomLevel})` }} />
                        </div>
                    </div>
                    {showInfoPanel && (
                        <div className="w-80 bg-white border-l border-slate-200 shrink-0 h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6 flex flex-col">
                            <div><h2 className="text-xl font-bold text-[#0F2854] leading-tight mb-1">{currentLightboxEvent.eventName}</h2><Badge variant="secondary" className="mt-2 bg-blue-50 text-blue-700 border-blue-100">{currentLightboxEvent.eventType}</Badge></div>
                            <div className="space-y-4 mt-6">
                                <div className="flex items-start gap-3"><CalendarIcon className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm font-medium text-slate-700">Date</p><p className="text-sm text-slate-500">{currentLightboxEvent.days && currentLightboxEvent.days[0] ? format(safeDate(currentLightboxEvent.days[0].date), "PPP") : "N/A"}</p></div></div>
                                {currentLightboxEvent.locations?.[0] && (<div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm font-medium text-slate-700">Location</p><p className="text-sm text-slate-500 truncate w-56">{currentLightboxEvent.locations[0].name}</p></div></div>)}
                            </div>
                            <Separator className="my-6" />
                            <Button className={cn("w-full gap-2", consultation.inspiration.selectedEventIds.includes(currentLightboxEvent.id!) ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#1C4D8D]")} onClick={() => {
                                const current = consultation.inspiration.selectedEventIds;
                                const newIds = current.includes(currentLightboxEvent.id!) ? current.filter(id => id !== currentLightboxEvent.id) : [...current, currentLightboxEvent.id!];
                                setConsultation({...consultation, inspiration: {...consultation.inspiration, selectedEventIds: newIds}});
                            }}>
                                {consultation.inspiration.selectedEventIds.includes(currentLightboxEvent.id!) ? <><Trash2 className="w-4 h-4" /> Remove</> : <><CheckCircle className="w-4 h-4" /> Select as Inspiration</>}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}