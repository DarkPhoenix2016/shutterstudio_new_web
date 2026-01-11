"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { 
    fetchEvents, fetchPackagesList, fetchStudioSettingsList, 
    createEvent, EventData, PackageData 
} from "@/services/event-service"
import { saveConsultation, convertConsultationStatus, ConsultationData } from "@/services/consultation-service"
import { format } from "date-fns"

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// Icons
import {
    Loader2, ChevronRight, ChevronLeft, Save, CheckCircle, 
    Maximize2, Minimize2, MapPin, Calendar as CalendarIcon, Tag, DollarSign,
    Briefcase, Image as ImageIcon, Plus, Trash2, User, Video, Camera, LayoutTemplate, ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// --- COMPONENTS ---

const ConsultationStepper = ({ currentStep, setStep }: { currentStep: number, setStep: (s: number) => void }) => {
    const steps = ["Requirements", "Inspiration", "Packages", "Review"];
    return (
        <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar">
            {steps.map((label, idx) => (
                <div key={label} className="flex items-center shrink-0">
                    <button 
                        onClick={() => idx < currentStep ? setStep(idx) : null}
                        disabled={idx > currentStep}
                        className={cn(
                            "px-3 py-1 rounded-full border transition-colors text-xs md:text-sm whitespace-nowrap",
                            currentStep === idx 
                                ? "bg-[#1C4D8D] text-white border-[#1C4D8D] font-medium" 
                                : currentStep > idx 
                                    ? "bg-green-100 text-green-700 border-green-200 cursor-pointer hover:bg-green-200" 
                                    : "text-slate-400 border-slate-200 cursor-not-allowed"
                        )}>
                        {idx + 1}. {label}
                    </button>
                    {idx < steps.length - 1 && <div className="w-4 h-[1px] bg-slate-200 mx-2" />}
                </div>
            ))}
        </div>
    );
};

export default function ConsultationPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // --- STATE ---
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(0) // 0: Requirements, 1: Inspiration, 2: Packages, 3: Review
    const [isSaving, setIsSaving] = useState(false)
    const [isFullScreen, setIsFullScreen] = useState(false)

    // Master Data (Fetched once)
    const [events, setEvents] = useState<EventData[]>([])
    const [packages, setPackages] = useState<PackageData[]>([])
    const [eventTypes, setEventTypes] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])

    // Consultation Document State
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
                // Parallel Fetching
                const [evtList, pkgList, types] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchPackagesList(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES')
                ]);

                setEvents(evtList);
                setPackages(pkgList);
                setEventTypes(types.length ? types : ["Weddings", "Homecoming", "Preshoot", "Birthday", "Corporate"]);

                // Extract unique tags for suggestion cloud
                const tags = new Set<string>();
                evtList.forEach(e => e.tags?.forEach(t => tags.add(t)));
                setAvailableTags(Array.from(tags).sort());

                // Initialize consultation studioID
                setConsultation(prev => ({ ...prev, studioId: userData.studioID! }));
            } catch (e) {
                console.error("Init failed", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userData]);

    // --- COMPUTED DATA (Smart Matching) ---
    
    // Step 2 Logic: Filter Events for Inspiration
    const matchedEvents = useMemo(() => {
        return events.filter(e => {
            const typeMatch = e.eventType === consultation.requirements.eventType;
            // Matches if NO tags selected OR if at least one tag overlaps
            const tagMatch = consultation.requirements.styleTags.length === 0 || 
                             (e.tags && e.tags.some(t => consultation.requirements.styleTags.includes(t)));
            
            // Only show events with photos
            const hasImages = e.couplePhotoUrl || (e.galleryUrls && e.galleryUrls.length > 0);
            
            return typeMatch && tagMatch && hasImages;
        }).slice(0, 20); // Limit results for performance
    }, [events, consultation.requirements.eventType, consultation.requirements.styleTags]);

    // Step 3 Logic: Filter Packages by Budget
    const matchedPackages = useMemo(() => {
        const maxBudget = consultation.requirements.budgetRange[1];
        return packages.filter(p => {
            return !p.disabled && Number(p.price) <= (maxBudget * 1.25); // Show packages up to 25% over budget for upselling
        }).sort((a,b) => Number(a.price) - Number(b.price));
    }, [packages, consultation.requirements.budgetRange]);

    // Live Budget Calculation
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


    // --- ACTIONS ---

    const handleAutoSave = async () => {
        if (!userData?.studioID) return;
        setIsSaving(true);
        try {
            // Save draft to Firestore
            const saved = await saveConsultation(userData.studioID, consultation);
            // If it was a new doc, update state with the new ID
            if (!consultation.id) setConsultation(prev => ({ ...prev, id: saved.id }));
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        if (step === 0 && !consultation.client.name) {
            return Swal.fire({ icon: 'warning', title: 'Client Name Required', text: 'Please enter a client name to proceed.' });
        }
        handleAutoSave(); 
        setStep(s => Math.min(s + 1, 3));
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
            text: `This will create a new "${consultation.requirements.eventType}" event for ${consultation.client.name}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Create',
            confirmButtonColor: '#1C4D8D'
        });

        if (!result.isConfirmed || !userData?.studioID) return;

        setLoading(true);
        try {
            // 1. Map Consultation Data -> EventData Structure
            const newEvent: EventData = {
                eventName: `${consultation.requirements.eventType} - ${consultation.client.name}`,
                customerName: consultation.client.name,
                customerMobile: consultation.client.mobile,
                customerEmail: consultation.client.email,
                eventType: consultation.requirements.eventType,
                status: "Inquiry", // Start as Inquiry or Scheduled based on your workflow
                inquiryDate: new Date(),
                dayCount: 1,
                
                // Construct the Day Config
                days: consultation.requirements.date 
                    ? [{ 
                        date: consultation.requirements.date, 
                        type: consultation.package.selectedPackageId === 'custom' ? 'custom' : 'package',
                        packageId: consultation.package.selectedPackageId !== 'custom' ? consultation.package.selectedPackageId : undefined,
                        cost: consultation.package.totalEstimate,
                        // If custom items exist, map them here? For now, we put custom items in additional services or day custom items
                        customItems: [] 
                      }] 
                    : [],
                
                totalBudget: consultation.package.totalEstimate,
                discountType: 'fixed',
                discount: 0,
                finalBudget: consultation.package.totalEstimate,
                advancePaid: 0,
                assignedCrew: [],
                assignedEquipment: [],
                tags: consultation.requirements.styleTags,
                
                // Combine notes and deliverables into the main note
                notes: `Consultation Notes:\n${consultation.requirements.notes || "None"}\n\nDeliverables Required:\n${Object.entries(consultation.requirements.deliverables).filter(([k,v]) => v).map(([k]) => k).join(', ')}`,
                
                // Map Custom Addons to Additional Services
                additionalServices: consultation.package.customItems.map(item => ({
                    id: crypto.randomUUID(),
                    name: item.name,
                    type: 'custom',
                    quantity: item.qty,
                    pricePerUnit: item.price,
                    total: item.price * item.qty
                }))
            };

            // 2. Create Event in Firestore
            await createEvent(userData.studioID, newEvent);

            // 3. Mark Consultation as Converted
            if (consultation.id) {
                await convertConsultationStatus(userData.studioID, consultation.id);
            }

            Swal.fire({ title: 'Success!', text: 'Event created successfully.', icon: 'success', timer: 1500 });
            router.push('/app/events'); // Redirect to Events List

        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to convert consultation.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className={cn("min-h-screen bg-slate-50 flex flex-col transition-all duration-300", isFullScreen ? "p-0" : "md:p-0")}>
            
            {/* 1. STICKY HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="hidden md:block font-bold text-[#0F2854] text-lg">Consultation</div>
                    <ConsultationStepper currentStep={step} setStep={setStep} />
                </div>
                <div className="flex items-center gap-3">
                    {isSaving ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Saving...</span>
                    ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Saved</span>
                    )}
                    <Button variant="ghost" size="icon" onClick={toggleFullScreen} title="Toggle Focus Mode">
                        {isFullScreen ? <Minimize2 className="w-4 h-4 text-slate-500" /> : <Maximize2 className="w-4 h-4 text-slate-500" />}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* 2. MAIN CONTENT SCROLL AREA */}
                <ScrollArea className="flex-1 p-6 lg:p-10 pb-32">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        {/* --- STEP 1: REQUIREMENTS --- */}
                        {step === 0 && (
                            <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-[#0F2854]">Client Requirements</h2>
                                    <p className="text-slate-500 mt-1">Start by gathering the key details.</p>
                                </div>

                                <Card className="border-0 shadow-md">
                                    <CardContent className="p-8 space-y-8">
                                        {/* Row 1: Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Client Name *</Label>
                                                <Input 
                                                    value={consultation.client.name} 
                                                    onChange={e => setConsultation({...consultation, client: {...consultation.client, name: e.target.value}})}
                                                    className="h-12 text-lg bg-slate-50"
                                                    placeholder="e.g. Amantha & Nethmi"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Event Type</Label>
                                                <Select 
                                                    value={consultation.requirements.eventType} 
                                                    onValueChange={v => setConsultation({...consultation, requirements: {...consultation.requirements, eventType: v}})}
                                                >
                                                    <SelectTrigger className="h-12 text-lg bg-slate-50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Row 2: Date & Contact */}
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
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={consultation.requirements.date}
                                                            onSelect={(d) => setConsultation({...consultation, requirements: {...consultation.requirements, date: d}})}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Contact Mobile</Label>
                                                <Input 
                                                    value={consultation.client.mobile} 
                                                    onChange={e => setConsultation({...consultation, client: {...consultation.client, mobile: e.target.value}})}
                                                    className="h-12 text-lg bg-slate-50"
                                                    placeholder="07x xxxxxxx"
                                                />
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Row 3: Budget & Style */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-end">
                                                    <Label className="text-base">Budget Range</Label>
                                                    <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded">
                                                        Up to {consultation.requirements.budgetRange[1].toLocaleString()} LKR
                                                    </span>
                                                </div>
                                                <Slider 
                                                    defaultValue={[consultation.requirements.budgetRange[1]]} 
                                                    max={2000000} step={25000}
                                                    onValueChange={(val) => setConsultation({...consultation, requirements: {...consultation.requirements, budgetRange: [0, val[0]]}})}
                                                    className="py-4"
                                                />
                                                <p className="text-xs text-slate-400">Used to filter recommended packages.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-base">Style Preferences (Tags)</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableTags.slice(0, 12).map(tag => (
                                                        <Badge 
                                                            key={tag}
                                                            variant={consultation.requirements.styleTags.includes(tag) ? "default" : "outline"}
                                                            className={cn(
                                                                "cursor-pointer px-3 py-1.5", 
                                                                consultation.requirements.styleTags.includes(tag) ? "bg-[#1C4D8D]" : "text-slate-600"
                                                            )}
                                                            onClick={() => {
                                                                const tags = consultation.requirements.styleTags;
                                                                const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
                                                                setConsultation({...consultation, requirements: {...consultation.requirements, styleTags: newTags}});
                                                            }}
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 4: Deliverables */}
                                        <div className="bg-slate-50 p-4 rounded-lg flex flex-wrap gap-6 border border-slate-100">
                                            {[
                                                { id: 'photo', label: 'Photography', icon: Camera },
                                                { id: 'video', label: 'Videography', icon: Video },
                                                { id: 'album', label: 'Albums', icon: LayoutTemplate },
                                                { id: 'drone', label: 'Drone Coverage', icon: MapPin },
                                            ].map((item) => (
                                                <div key={item.id} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={item.id} 
                                                        // @ts-ignore
                                                        checked={consultation.requirements.deliverables[item.id]}
                                                        // @ts-ignore
                                                        onCheckedChange={(c) => setConsultation({...consultation, requirements: {...consultation.requirements, deliverables: {...consultation.requirements.deliverables, [item.id]: !!c}}})}
                                                    />
                                                    <Label htmlFor={item.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                                        <item.icon className="w-4 h-4 text-slate-500" />
                                                        {item.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* --- STEP 2: INSPIRATION --- */}
                        {step === 1 && (
                            <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                                <div className="flex justify-between items-end border-b pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Inspiration Gallery</h2>
                                        <p className="text-slate-500">Events matching "{consultation.requirements.eventType}" & your style.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                            {matchedEvents.length} Matches Found
                                        </span>
                                    </div>
                                </div>

                                {matchedEvents.length > 0 ? (
                                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                        {matchedEvents.map(event => (
                                            <Dialog key={event.id}>
                                                <DialogTrigger asChild>
                                                    <div 
                                                        className={cn(
                                                            "break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all bg-slate-100",
                                                            consultation.inspiration.selectedEventIds.includes(event.id!) 
                                                                ? "border-blue-500 ring-2 ring-blue-200" 
                                                                : "border-transparent"
                                                        )}
                                                    >
                                                        <img 
                                                            src={event.couplePhotoUrl || "/placeholder.jpg"} 
                                                            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" 
                                                            alt={event.eventName}
                                                        />
                                                        {/* Selection Checkmark */}
                                                        {consultation.inspiration.selectedEventIds.includes(event.id!) && (
                                                            <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-md z-10">
                                                                <CheckCircle className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                            <p className="text-white font-bold text-xs truncate">{event.eventName}</p>
                                                            <div className="flex gap-1 mt-1">
                                                                {event.tags?.slice(0,2).map(t => <span key={t} className="text-[9px] text-slate-200 bg-white/20 px-1 rounded">{t}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                
                                                {/* Lightbox Content */}
                                                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-none text-white h-[85vh] flex">
                                                    <div className="flex-1 flex items-center justify-center relative bg-black">
                                                        <img src={event.couplePhotoUrl} className="max-h-full max-w-full object-contain" alt="Full View"/>
                                                    </div>
                                                    <div className="w-80 bg-white text-slate-900 p-6 flex flex-col shrink-0 overflow-y-auto">
                                                        <h3 className="font-bold text-xl text-[#0F2854] leading-tight">{event.eventName}</h3>
                                                        <Badge className="w-fit mt-2 bg-blue-50 text-blue-700 hover:bg-blue-50 border-none">{event.eventType}</Badge>
                                                        
                                                        <div className="mt-6 space-y-5 flex-1">
                                                            <div className="flex gap-3 text-sm items-center">
                                                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                                                <span>{event.days && event.days[0] ? format(event.days[0].date instanceof Date ? event.days[0].date : new Date(event.days[0].date), "PPP") : "Date N/A"}</span>
                                                            </div>
                                                            {event.locations && event.locations[0] && (
                                                                <div className="flex gap-3 text-sm items-start">
                                                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                                                    <span className="truncate whitespace-normal">{event.locations[0].name}</span>
                                                                </div>
                                                            )}
                                                            <div className="pt-4 border-t">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Style Tags</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {event.tags?.map(t => <Badge key={t} variant="outline" className="text-slate-600 font-normal">{t}</Badge>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-auto pt-4 space-y-2">
                                                            <Button 
                                                                className={cn("w-full gap-2", consultation.inspiration.selectedEventIds.includes(event.id!) ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#1C4D8D]")}
                                                                onClick={() => {
                                                                    const current = consultation.inspiration.selectedEventIds;
                                                                    const newIds = current.includes(event.id!) 
                                                                        ? current.filter(id => id !== event.id) 
                                                                        : [...current, event.id!];
                                                                    setConsultation({...consultation, inspiration: {...consultation.inspiration, selectedEventIds: newIds}});
                                                                }}
                                                            >
                                                                {consultation.inspiration.selectedEventIds.includes(event.id!) 
                                                                    ? <><Trash2 className="w-4 h-4" /> Remove from Selection</> 
                                                                    : <><CheckCircle className="w-4 h-4" /> Select as Inspiration</>
                                                                }
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                                        <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                                        <p className="text-slate-500 font-medium">No matching events found.</p>
                                        <p className="text-xs text-slate-400">Try changing the event type or style tags.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- STEP 3: PACKAGES --- */}
                        {step === 2 && (
                            <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-8">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Package Selection</h2>
                                    <p className="text-slate-500">Packages within budget ({consultation.requirements.budgetRange[1].toLocaleString()} LKR)</p>
                                </div>

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
                                                <p className="text-slate-500 text-xs line-clamp-3">{pkg.description || "No description available."}</p>
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
                                    
                                    {/* Custom / Blank Card */}
                                    <Card 
                                        className={cn(
                                            "min-w-[300px] w-[320px] snap-center cursor-pointer border-dashed border-2 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors",
                                            consultation.package.selectedPackageId === 'custom' ? "border-blue-500 bg-blue-50" : "border-slate-300"
                                        )}
                                        onClick={() => setConsultation({...consultation, package: {...consultation.package, selectedPackageId: 'custom'}})}
                                    >
                                        <div className="text-center p-6 text-slate-400">
                                            <div className="bg-white p-4 rounded-full inline-flex mb-3 shadow-sm">
                                                <Plus className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="font-bold text-slate-600">Build Custom Package</p>
                                            <p className="text-xs text-slate-400 mt-1">Start from scratch</p>
                                        </div>
                                    </Card>
                                </div>

                                {/* Custom Items Builder */}
                                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Plus className="w-4 h-4"/> Custom Add-ons</h3>
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setConsultation({
                                                ...consultation, 
                                                package: {
                                                    ...consultation.package, 
                                                    customItems: [...consultation.package.customItems, { name: "New Item", price: 0, qty: 1 }]
                                                }
                                            })
                                        }} className="text-xs">
                                            Add Row
                                        </Button>
                                    </div>
                                    
                                    {consultation.package.customItems.length > 0 ? (
                                        <div className="space-y-2">
                                            {consultation.package.customItems.map((item, idx) => (
                                                <div key={idx} className="flex gap-3 items-center">
                                                    <Input 
                                                        value={item.name} 
                                                        onChange={(e) => {
                                                            const newItems = [...consultation.package.customItems];
                                                            newItems[idx].name = e.target.value;
                                                            setConsultation({...consultation, package: {...consultation.package, customItems: newItems}});
                                                        }}
                                                        placeholder="Item Name"
                                                        className="flex-1"
                                                    />
                                                    <Input 
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => {
                                                            const newItems = [...consultation.package.customItems];
                                                            newItems[idx].qty = Number(e.target.value);
                                                            setConsultation({...consultation, package: {...consultation.package, customItems: newItems}});
                                                        }}
                                                        placeholder="Qty"
                                                        className="w-20 text-center"
                                                    />
                                                    <Input 
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => {
                                                            const newItems = [...consultation.package.customItems];
                                                            newItems[idx].price = Number(e.target.value);
                                                            setConsultation({...consultation, package: {...consultation.package, customItems: newItems}});
                                                        }}
                                                        placeholder="Price"
                                                        className="w-32 text-right"
                                                    />
                                                    <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                                        const newItems = [...consultation.package.customItems];
                                                        newItems.splice(idx, 1);
                                                        setConsultation({...consultation, package: {...consultation.package, customItems: newItems}});
                                                    }}><Trash2 className="w-4 h-4"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded">No custom items added.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- STEP 4: REVIEW & FINALIZE --- */}
                        {step === 3 && (
                            <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-8">
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold text-[#0F2854]">Final Review</h2>
                                    <p className="text-slate-500 mt-2">Ready to convert this consultation into a confirmed event?</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Client & Requirements Summary */}
                                    <Card>
                                        <CardHeader className="bg-slate-50/50 pb-4">
                                            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4"/> Client Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-6 text-sm">
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Client Name</span>
                                                <span className="font-medium">{consultation.client.name}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Event Type</span>
                                                <span className="font-medium">{consultation.requirements.eventType}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Date</span>
                                                <span className="font-medium">{consultation.requirements.date ? format(consultation.requirements.date, "PPP") : "TBD"}</span>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <span className="text-slate-500 block">Deliverables</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(consultation.requirements.deliverables).filter(([k,v]) => v).map(([k]) => (
                                                        <Badge key={k} variant="secondary" className="capitalize text-xs">{k}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Financial Summary */}
                                    <Card className="border-blue-200 shadow-md">
                                        <CardHeader className="bg-blue-50/50 pb-4">
                                            <CardTitle className="text-base flex items-center gap-2 text-blue-800"><DollarSign className="w-4 h-4"/> Financial Estimate</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-6 text-sm">
                                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                                <span className="text-slate-500">Base Package</span>
                                                <span className="font-medium text-slate-700">
                                                    {consultation.package.selectedPackageId === 'custom' 
                                                        ? 'Custom Build' 
                                                        : packages.find(p => p.id === consultation.package.selectedPackageId)?.name || "None"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                                <span className="text-slate-500">Add-ons ({consultation.package.customItems.length})</span>
                                                <span className="font-medium text-slate-700">
                                                    + {consultation.package.customItems.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-4">
                                                <span className="font-bold text-lg text-[#0F2854]">Total Estimate</span>
                                                <span className="font-mono font-bold text-2xl text-[#1C4D8D]">{consultation.package.totalEstimate.toLocaleString()} LKR</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-2">
                                    <Label>Final Notes</Label>
                                    <Textarea 
                                        placeholder="Add any specific promises, discounts discussed, or special notes..." 
                                        value={consultation.requirements.notes} 
                                        onChange={e => setConsultation({...consultation, requirements: {...consultation.requirements, notes: e.target.value}})}
                                        className="h-24 bg-white"
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </ScrollArea>

                {/* 3. STICKY SIDEBAR (SUMMARY) - Only on larger screens */}
                {step > 0 && (
                    <div className="w-80 bg-white border-l border-slate-200 shadow-xl p-6 hidden lg:flex flex-col z-40">
                        <h3 className="font-bold text-[#0F2854] mb-4 text-sm uppercase tracking-wide">Live Summary</h3>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Budget Limit</p>
                                <p className="text-sm font-mono text-slate-700">{consultation.requirements.budgetRange[1].toLocaleString()} LKR</p>
                            </div>

                            {consultation.package.selectedPackageId && (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Package</p>
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

                        <div className="border-t pt-4 mt-auto">
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
                    </div>
                )}

                {/* 4. FOOTER ACTIONS */}
                <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-50 flex justify-between items-center w-full lg:w-auto lg:absolute lg:bottom-0 lg:left-0 lg:right-80">
                    <div>
                        {step > 0 && (
                            <Button variant="ghost" onClick={handleBack} className="text-slate-500">
                                <ChevronLeft className="w-4 h-4 mr-2"/> Back
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {step < 3 ? (
                            <Button className="bg-[#1C4D8D] px-8 hover:bg-[#153a6b]" onClick={handleNext}>
                                Next Step <ChevronRight className="w-4 h-4 ml-2"/>
                            </Button>
                        ) : (
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleAutoSave} disabled={isSaving} className="border-slate-300 text-slate-600">
                                    <Save className="w-4 h-4 mr-2" /> Save Draft
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200" onClick={handleConvertToEvent}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Convert to Event
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}