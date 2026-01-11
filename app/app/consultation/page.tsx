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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

// Icons
import {
    Loader2, ChevronRight, ChevronLeft, Save, CheckCircle, 
    Maximize2, Minimize2, MapPin, Calendar, Tag, DollarSign,
    Briefcase, Image as ImageIcon, Plus, Trash2, User
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// --- MOCK SIDEBAR CONTEXT (Replace with actual import) ---
// import { useSidebar } from "@/context/SidebarContext";
const useSidebar = () => {
    // Mocking the hook for code completeness
    const [isOpen, setIsOpen] = useState(true);
    return { isOpen, toggle: () => setIsOpen(!isOpen) };
}

// --- HELPER COMPONENTS ---

const ConsultationStepper = ({ currentStep }: { currentStep: number }) => {
    const steps = ["Requirements", "Inspiration", "Packages", "Review"];
    return (
        <div className="flex items-center gap-2 text-sm">
            {steps.map((label, idx) => (
                <div key={label} className="flex items-center">
                    <div className={cn(
                        "px-3 py-1 rounded-full border transition-colors",
                        currentStep === idx 
                            ? "bg-[#1C4D8D] text-white border-[#1C4D8D] font-medium" 
                            : currentStep > idx 
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

export default function ConsultationPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(); 

    // --- STATE ---
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(0) // 0-3
    const [isSaving, setIsSaving] = useState(false)

    // Master Data
    const [events, setEvents] = useState<EventData[]>([])
    const [packages, setPackages] = useState<PackageData[]>([])
    const [eventTypes, setEventTypes] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])

    // Consultation State (The Document)
    const [consultation, setConsultation] = useState<ConsultationData>({
        studioId: "",
        status: "draft",
        client: { name: "", mobile: "", email: "" },
        requirements: {
            eventType: "Weddings",
            budgetRange: [150000, 400000],
            locations: [],
            styleTags: []
        },
        inspiration: { matchedEventIds: [], selectedImageUrls: [] },
        package: { customItems: [], totalEstimate: 0 }
    });

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!userData?.studioID) return;

        const init = async () => {
            try {
                const [evtList, pkgList, types] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchPackagesList(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES')
                ]);

                setEvents(evtList);
                setPackages(pkgList);
                setEventTypes(types.length ? types : ["Weddings", "Homecoming"]);

                // Extract Tags
                const tags = new Set<string>();
                evtList.forEach(e => e.tags?.forEach(t => tags.add(t)));
                setAvailableTags(Array.from(tags));

                setConsultation(prev => ({ ...prev, studioId: userData.studioID }));
            } catch (e) {
                console.error("Init failed", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userData]);

    // --- COMPUTED DATA (Smart Matching) ---
    
    // Step 2: Filtered Events for Inspiration
    const matchedEvents = useMemo(() => {
        return events.filter(e => {
            const typeMatch = e.eventType === consultation.requirements.eventType;
            const tagMatch = consultation.requirements.styleTags.length === 0 || 
                             e.tags?.some(t => consultation.requirements.styleTags.includes(t));
            return typeMatch && tagMatch && (e.couplePhotoUrl || (e.galleryUrls && e.galleryUrls.length > 0));
        });
    }, [events, consultation.requirements]);

    // Step 3: Filtered Packages
    const matchedPackages = useMemo(() => {
        const maxBudget = consultation.requirements.budgetRange[1];
        return packages.filter(p => {
            return !p.disabled && Number(p.price) <= (maxBudget * 1.2); // +20% tolerance
        }).sort((a,b) => Number(a.price) - Number(b.price));
    }, [packages, consultation.requirements.budgetRange]);

    // Live Budget Calc
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
            const saved = await saveConsultation(userData.studioID, consultation);
            if (!consultation.id) setConsultation(prev => ({ ...prev, id: saved.id })); // Set ID on first save
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        handleAutoSave(); // Save on step change
        setStep(s => Math.min(s + 1, 3));
    };

    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const handleConvertToEvent = async () => {
        const result = await Swal.fire({
            title: 'Convert to Event?',
            text: `This will create a confirmed "${consultation.requirements.eventType}" event.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Create Event',
            confirmButtonColor: '#1C4D8D'
        });

        if (!result.isConfirmed || !userData?.studioID) return;

        setLoading(true);
        try {
            // 1. Map Consultation -> EventData
            const newEvent: EventData = {
                eventName: `${consultation.requirements.eventType} - ${consultation.client.name}`,
                customerName: consultation.client.name,
                customerMobile: consultation.client.mobile,
                customerEmail: consultation.client.email,
                eventType: consultation.requirements.eventType,
                status: "Scheduled", // Confirmed status
                inquiryDate: new Date(),
                dayCount: 1, // Default, can be edited later
                days: consultation.requirements.date 
                    ? [{ 
                        date: consultation.requirements.date, 
                        type: consultation.package.selectedPackageId === 'custom' ? 'custom' : 'package',
                        packageId: consultation.package.selectedPackageId !== 'custom' ? consultation.package.selectedPackageId : undefined,
                        cost: consultation.package.totalEstimate 
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
                notes: `Consultation Notes:\n${consultation.requirements.notes || ""}\n\nGenerated from Consultation ID: ${consultation.id}`,
            };

            // 2. Create Event
            await createEvent(userData.studioID, newEvent);

            // 3. Update Consultation Status
            if (consultation.id) {
                await convertConsultationStatus(userData.studioID, consultation.id);
            }

            Swal.fire({ title: 'Success!', text: 'Event created successfully.', icon: 'success', timer: 1500 });
            router.push('/app/events');

        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to convert.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            
            {/* 1. CONSULTATION HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-bold text-[#0F2854]">Client Consultation</h1>
                    <ConsultationStepper currentStep={step} />
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Saving...</span>}
                    <Button variant="ghost" size="icon" onClick={() => toggleSidebar()} title="Toggle Focus Mode">
                        {isSidebarOpen ? <Maximize2 className="w-4 h-4 text-slate-500" /> : <Minimize2 className="w-4 h-4 text-slate-500" />}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* 2. MAIN CONTENT SCROLL AREA */}
                <ScrollArea className="flex-1 p-6 lg:p-10 pb-32">
                    <div className="max-w-5xl mx-auto">
                        
                        {/* --- STEP 1: REQUIREMENTS --- */}
                        {step === 0 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-[#0F2854]">Client Requirements</h2>
                                    <p className="text-slate-500 mt-2">Start by gathering the key details.</p>
                                </div>

                                <Card className="border-0 shadow-md">
                                    <CardContent className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Client Name</Label>
                                                <Input 
                                                    value={consultation.client.name} 
                                                    onChange={e => setConsultation({...consultation, client: {...consultation.client, name: e.target.value}})}
                                                    className="h-12 text-lg"
                                                    placeholder="Enter client name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Contact Mobile</Label>
                                                <Input 
                                                    value={consultation.client.mobile} 
                                                    onChange={e => setConsultation({...consultation, client: {...consultation.client, mobile: e.target.value}})}
                                                    className="h-12 text-lg"
                                                    placeholder="Mobile number"
                                                />
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <Label className="text-base">Event Type</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {eventTypes.map(type => (
                                                        <Badge 
                                                            key={type}
                                                            variant={consultation.requirements.eventType === type ? "default" : "outline"}
                                                            className={cn("cursor-pointer px-4 py-2", consultation.requirements.eventType === type ? "bg-[#1C4D8D]" : "")}
                                                            onClick={() => setConsultation({...consultation, requirements: {...consultation.requirements, eventType: type}})}
                                                        >
                                                            {type}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex justify-between">
                                                    <Label className="text-base">Budget Range</Label>
                                                    <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 rounded">
                                                        {(consultation.requirements.budgetRange[1]/1000).toFixed(0)}k LKR
                                                    </span>
                                                </div>
                                                <Slider 
                                                    defaultValue={[consultation.requirements.budgetRange[1]]} 
                                                    max={1000000} step={10000}
                                                    onValueChange={(val) => setConsultation({...consultation, requirements: {...consultation.requirements, budgetRange: [0, val[0]]}})}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-base">Style Tags (Optional)</Label>
                                            <div className="flex flex-wrap gap-2 bg-slate-50 p-4 rounded-lg">
                                                {availableTags.slice(0, 15).map(tag => (
                                                    <Badge 
                                                        key={tag}
                                                        variant={consultation.requirements.styleTags.includes(tag) ? "default" : "outline"}
                                                        className={cn("cursor-pointer", consultation.requirements.styleTags.includes(tag) ? "bg-slate-700" : "bg-white text-slate-500 border-slate-200")}
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
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* --- STEP 2: INSPIRATION --- */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Inspiration Gallery</h2>
                                        <p className="text-slate-500">Events matching "{consultation.requirements.eventType}"</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-slate-600">Matched Events: {matchedEvents.length}</span>
                                    </div>
                                </div>

                                {matchedEvents.length > 0 ? (
                                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                        {matchedEvents.map(event => (
                                            <Dialog key={event.id}>
                                                <DialogTrigger asChild>
                                                    <div className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer border border-slate-200 bg-slate-100 shadow-sm hover:shadow-md transition-all">
                                                        <img 
                                                            src={event.couplePhotoUrl || "/placeholder.jpg"} 
                                                            className="w-full h-auto object-cover" 
                                                            alt={event.eventName}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                            <p className="text-white font-bold text-xs truncate">{event.eventName}</p>
                                                            <div className="flex gap-1 mt-1">
                                                                {event.tags?.slice(0,2).map(t => <span key={t} className="text-[9px] text-slate-200 bg-white/20 px-1 rounded">{t}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                
                                                {/* Lightbox Content */}
                                                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none text-white h-[80vh] flex">
                                                    <div className="flex-1 bg-black flex items-center justify-center relative">
                                                        <img src={event.couplePhotoUrl} className="max-h-full max-w-full object-contain" alt="Full View"/>
                                                    </div>
                                                    <div className="w-80 bg-white text-slate-900 p-6 flex flex-col">
                                                        <h3 className="font-bold text-xl">{event.eventName}</h3>
                                                        <Badge className="w-fit mt-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{event.eventType}</Badge>
                                                        
                                                        <div className="mt-6 space-y-4 flex-1">
                                                            <div className="flex gap-3 text-sm">
                                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                                <span>{event.inquiryDate ? format(new Date(), "PPP") : "N/A"}</span>
                                                            </div>
                                                            {event.locations && event.locations[0] && (
                                                                <div className="flex gap-3 text-sm">
                                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                                    <span className="truncate">{event.locations[0].name}</span>
                                                                </div>
                                                            )}
                                                            <div className="pt-4">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase">Tags</p>
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {event.tags?.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <Button className="w-full bg-[#1C4D8D]" disabled>View Full Event (Demo)</Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl">
                                        <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                                        <p className="text-slate-500">No specific matches found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- STEP 3: PACKAGES --- */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Packages</h2>
                                    <p className="text-slate-500">Select a base package or build custom.</p>
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                    {matchedPackages.map(pkg => (
                                        <Card 
                                            key={pkg.id} 
                                            className={cn(
                                                "min-w-[280px] w-[300px] snap-center cursor-pointer transition-all border-2 relative",
                                                consultation.package.selectedPackageId === pkg.id 
                                                    ? "border-blue-500 shadow-xl scale-105 z-10" 
                                                    : "border-slate-100 hover:border-blue-200"
                                            )}
                                            onClick={() => setConsultation({...consultation, package: {...consultation.package, selectedPackageId: pkg.id}})}
                                        >
                                            {consultation.package.selectedPackageId === pkg.id && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                                    Selected
                                                </div>
                                            )}
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg font-bold text-slate-800">{pkg.name}</CardTitle>
                                                <div className="font-mono text-blue-700 font-bold text-xl">
                                                    {Number(pkg.price).toLocaleString()} <span className="text-xs text-slate-400 font-normal">LKR</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-3">
                                                <p className="text-slate-500 text-xs line-clamp-3">{pkg.description}</p>
                                                <Separator />
                                                <ul className="space-y-1">
                                                    {pkg.featuresList?.slice(0,5).map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-slate-600">
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                                                            <span className="text-xs">{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    
                                    {/* Custom Option */}
                                    <Card 
                                        className={cn(
                                            "min-w-[280px] w-[300px] snap-center cursor-pointer border-dashed border-2 flex items-center justify-center",
                                            consultation.package.selectedPackageId === 'custom' ? "border-blue-500 bg-blue-50" : "border-slate-300"
                                        )}
                                        onClick={() => setConsultation({...consultation, package: {...consultation.package, selectedPackageId: 'custom'}})}
                                    >
                                        <div className="text-center p-6 text-slate-400">
                                            <Plus className="w-8 h-8 mx-auto mb-2" />
                                            <p className="font-bold">Build Custom</p>
                                        </div>
                                    </Card>
                                </div>

                                {/* Custom Items (Simplified for Demo) */}
                                <div className="bg-slate-50 p-6 rounded-lg space-y-4">
                                    <h3 className="font-semibold text-slate-700">Add-ons / Custom Items</h3>
                                    {consultation.package.customItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <Input disabled value={item.name} className="flex-1 bg-white" />
                                            <Input disabled value={item.price} className="w-24 bg-white text-right" />
                                            <Button size="icon" variant="ghost" className="text-red-400" onClick={() => {
                                                const newItems = [...consultation.package.customItems];
                                                newItems.splice(idx, 1);
                                                setConsultation({...consultation, package: {...consultation.package, customItems: newItems}});
                                            }}><Trash2 className="w-4 h-4"/></Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setConsultation({
                                                ...consultation, 
                                                package: {
                                                    ...consultation.package, 
                                                    customItems: [...consultation.package.customItems, { name: "Extra Photographer", price: 15000, qty: 1 }]
                                                }
                                            })
                                        }}><Plus className="w-3 h-3 mr-2"/> Add Item</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- STEP 4: REVIEW --- */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="space-y-1 text-center">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Review Consultation</h2>
                                    <p className="text-slate-500">Confirm details before creating the event.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
                                        <CardContent className="space-y-4 text-sm">
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Name</span>
                                                <span className="font-medium">{consultation.client.name}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Mobile</span>
                                                <span className="font-medium">{consultation.client.mobile}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Event Type</span>
                                                <span className="font-medium">{consultation.requirements.eventType}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-slate-500">Budget Limit</span>
                                                <span className="font-medium">{consultation.requirements.budgetRange[1].toLocaleString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Selected Package</CardTitle></CardHeader>
                                        <CardContent className="space-y-4 text-sm">
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-slate-500">Base Package</span>
                                                <span className="font-medium">
                                                    {consultation.package.selectedPackageId === 'custom' 
                                                        ? 'Custom Build' 
                                                        : packages.find(p => p.id === consultation.package.selectedPackageId)?.name || "None"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-slate-500">Add-ons Total</span>
                                                <span className="font-medium">
                                                    {consultation.package.customItems.reduce((acc, i) => acc + i.price, 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center mt-4">
                                                <span className="font-bold text-[#0F2854]">Total Estimate</span>
                                                <span className="font-bold text-xl text-[#1C4D8D]">{consultation.package.totalEstimate.toLocaleString()} LKR</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                    </div>
                </ScrollArea>

                {/* 3. STICKY FOOTER (ACTIONS) */}
                <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-50 flex justify-between items-center">
                    <div>
                        {step > 0 && (
                            <Button variant="ghost" onClick={handleBack} className="text-slate-500">
                                <ChevronLeft className="w-4 h-4 mr-2"/> Back
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {step < 3 ? (
                            <Button className="bg-[#1C4D8D] px-8" onClick={handleNext} disabled={!consultation.client.name}>
                                Next Step <ChevronRight className="w-4 h-4 ml-2"/>
                            </Button>
                        ) : (
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleAutoSave} disabled={isSaving}>
                                    <Save className="w-4 h-4 mr-2" /> Save Draft
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleConvertToEvent}>
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