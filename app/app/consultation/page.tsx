"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, fetchPackagesList, fetchStudioSettingsList, createEvent, EventData, PackageData } from "@/services/event-service"
import { format } from "date-fns"

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

// Icons
import {
    Loader2, Users, Calendar, MapPin, DollarSign,
    CheckCircle, Camera, Video, LayoutTemplate,
    ChevronRight, ChevronLeft, Save, Star, ArrowRight,
    Maximize2, Minimize2, Play, Plus, X, Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// --- TYPES ---

type ConsultationStep = 'entry' | 'requirements' | 'gallery' | 'packages' | 'review';

interface ClientRequirements {
    name: string;
    type: string;
    date: Date | undefined;
    guestCount: number;
    budgetMin: number;
    budgetMax: number;
    locations: string[];
    tags: string[]; // Style preferences
    deliverables: {
        photo: boolean;
        video: boolean;
        album: boolean;
        drone: boolean;
    };
    notes: string;
}

// --- MAIN COMPONENT ---

export default function ConsultationPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // --- STATE ---
    
    // UI State
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState<ConsultationStep>('entry')
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [currency, setCurrency] = useState("LKR")

    // Data State
    const [allEvents, setAllEvents] = useState<EventData[]>([])
    const [allPackages, setAllPackages] = useState<PackageData[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])
    const [eventTypes, setEventTypes] = useState<string[]>([])

    // Consultation Data
    const [reqs, setReqs] = useState<ClientRequirements>({
        name: "",
        type: "Weddings",
        date: undefined,
        guestCount: 100,
        budgetMin: 150000,
        budgetMax: 350000,
        locations: [],
        tags: [],
        deliverables: { photo: true, video: true, album: true, drone: false },
        notes: ""
    })

    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]) // Inspiration
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
    const [customAddons, setCustomAddons] = useState<{name: string, price: number}[]>([])

    // --- DATA FETCHING ---
    
    useEffect(() => {
        if (!userData?.studioID) return;

        const init = async () => {
            try {
                const [events, packages, types] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchPackagesList(userData.studioID),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES')
                ]);

                setAllEvents(events);
                setAllPackages(packages);
                setEventTypes(types.length > 0 ? types : ["Weddings", "Homecoming", "Pre-Shoot", "Birthday", "Corporate"]);

                // Extract unique tags from events for the suggestion cloud
                const tags = new Set<string>();
                events.forEach(e => e.tags?.forEach(t => tags.add(t)));
                setAvailableTags(Array.from(tags));

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
        // Filter events by Type AND Tags overlap
        return allEvents.filter(e => {
            const typeMatch = e.eventType === reqs.type;
            // @ts-ignore
            const tagMatch = reqs.tags.length === 0 || (e.tags && e.tags.some(t => reqs.tags.includes(t)));
            const hasImages = e.couplePhotoUrl || (e.galleryUrls && e.galleryUrls.length > 0);
            return typeMatch && tagMatch && hasImages;
        }).slice(0, 12); // Limit to top 12 matches
    }, [allEvents, reqs.type, reqs.tags]);

    const recommendedPackages = useMemo(() => {
        // Filter packages within budget range (with 20% tolerance)
        return allPackages.filter(p => {
            const price = Number(p.price);
            const inBudget = price <= (reqs.budgetMax * 1.2); 
            return !p.disabled && inBudget;
        }).sort((a, b) => Number(a.price) - Number(b.price));
    }, [allPackages, reqs.budgetMax]);

    const totalEstimate = useMemo(() => {
        let total = 0;
        if (selectedPackageId) {
            const pkg = allPackages.find(p => p.id === selectedPackageId);
            if (pkg) total += Number(pkg.price);
        }
        total += customAddons.reduce((sum, item) => sum + item.price, 0);
        return total;
    }, [selectedPackageId, allPackages, customAddons]);

    // --- ACTIONS ---

    const handleCreateEvent = async () => {
        if (!userData?.studioID) return;
        
        const result = await Swal.fire({
            title: 'Create Event?',
            text: `This will create a new "${reqs.type}" event for ${reqs.name}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Create',
            confirmButtonColor: '#1C4D8D'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const newEvent: EventData = {
                eventName: `${reqs.type} for ${reqs.name}`,
                customerName: reqs.name,
                customerMobile: "", // To be filled later
                eventType: reqs.type,
                status: "Inquiry", // Start as inquiry
                inquiryDate: new Date(),
                dayCount: 1,
                days: reqs.date ? [{ date: reqs.date, type: 'package', packageId: selectedPackageId || undefined, cost: totalEstimate }] : [],
                totalBudget: totalEstimate,
                discountType: 'fixed',
                discount: 0,
                finalBudget: totalEstimate,
                advancePaid: 0,
                assignedCrew: [],
                assignedEquipment: [],
                tags: reqs.tags,
                notes: `Consultation Notes:\n${reqs.notes}\n\nDeliverables:\n${Object.entries(reqs.deliverables).filter(([k,v]) => v).map(([k]) => k).join(', ')}`,
                // @ts-ignore
                consultationData: { // Store raw consultation data if needed
                    guestCount: reqs.guestCount,
                    budgetRange: [reqs.budgetMin, reqs.budgetMax],
                    inspirationEventIds: selectedEventIds
                }
            };

            await createEvent(userData.studioID, newEvent);
            
            Swal.fire({ title: 'Success!', text: 'Event created successfully.', icon: 'success', timer: 2000 });
            router.push('/app/events'); // Or redirect to the new event
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to create event.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER HELPERS ---

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

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className={cn("min-h-screen bg-slate-50 flex flex-col transition-all duration-300", isFullScreen ? "p-0" : "p-4 md:p-6")}>
            
            {/* 1. TOP BAR */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-lg"><Briefcase className="w-5 h-5 text-[#1C4D8D]" /></div>
                    <div>
                        <h1 className="text-lg font-bold text-[#0F2854]">Client Consultation</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className={step === 'entry' ? "font-bold text-blue-600" : ""}>Start</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className={step === 'requirements' ? "font-bold text-blue-600" : ""}>Requirements</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className={step === 'gallery' ? "font-bold text-blue-600" : ""}>Inspiration</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className={step === 'packages' ? "font-bold text-blue-600" : ""}>Packages</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleFullScreen} title="Toggle Fullscreen">
                        {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => router.push('/app/dashboard')}>
                        <X className="w-4 h-4" /> Exit
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* 2. MAIN CONTENT AREA */}
                <ScrollArea className="flex-1 p-6 h-[calc(100vh-80px)]">
                    <div className="max-w-5xl mx-auto pb-20">
                        
                        {/* STEP 0: ENTRY */}
                        {step === 'entry' && (
                            <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                <div className="text-center space-y-2">
                                    <h2 className="text-4xl font-bold text-[#0F2854]">Welcome</h2>
                                    <p className="text-slate-500 text-lg">Start a new consultation session to plan the perfect event.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                    <Card 
                                        className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
                                        onClick={() => setStep('requirements')}
                                    >
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
                                    <Card className="cursor-pointer hover:border-slate-400 hover:shadow-md transition-all opacity-60">
                                        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Save className="w-8 h-8 text-slate-400" />
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

                        {/* STEP 1: REQUIREMENTS FORM */}
                        {step === 'requirements' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Client Requirements</h2>
                                    <p className="text-slate-500">Let's gather some basic details to find the best match.</p>
                                </div>

                                <Card>
                                    <CardContent className="p-6 space-y-6">
                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Client Name</Label>
                                                <Input 
                                                    placeholder="e.g. Amantha & Nethmi" 
                                                    value={reqs.name}
                                                    onChange={(e) => setReqs({...reqs, name: e.target.value})}
                                                    className="text-lg h-12"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Event Type</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {eventTypes.map(type => (
                                                        <Badge 
                                                            key={type}
                                                            variant={reqs.type === type ? "default" : "outline"}
                                                            className={cn("cursor-pointer px-4 py-2 text-sm", reqs.type === type ? "bg-[#1C4D8D]" : "")}
                                                            onClick={() => setReqs({...reqs, type})}
                                                        >
                                                            {type}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Budget & Style */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-base">Estimated Budget Range</Label>
                                                    <span className="text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-md">
                                                        {currency} {(reqs.budgetMax/1000).toFixed(0)}k
                                                    </span>
                                                </div>
                                                <Slider 
                                                    defaultValue={[reqs.budgetMax]} 
                                                    max={1000000} 
                                                    step={10000} 
                                                    onValueChange={(vals) => setReqs({...reqs, budgetMax: vals[0]})}
                                                    className="py-4"
                                                />
                                                <p className="text-xs text-slate-400">Drag to adjust the maximum budget filter.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-base">Style & Vibe (Tags)</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableTags.slice(0, 10).map(tag => (
                                                        <Badge 
                                                            key={tag}
                                                            variant={reqs.tags.includes(tag) ? "default" : "outline"}
                                                            className={cn("cursor-pointer", reqs.tags.includes(tag) ? "bg-slate-800" : "text-slate-500")}
                                                            onClick={() => {
                                                                const newTags = reqs.tags.includes(tag) 
                                                                    ? reqs.tags.filter(t => t !== tag)
                                                                    : [...reqs.tags, tag];
                                                                setReqs({...reqs, tags: newTags});
                                                            }}
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Deliverables */}
                                        <div className="space-y-3">
                                            <Label>Required Deliverables</Label>
                                            <div className="flex gap-6">
                                                {[
                                                    { id: 'photo', label: 'Photography', icon: Camera },
                                                    { id: 'video', label: 'Videography', icon: Video },
                                                    { id: 'album', label: 'Albums', icon: LayoutTemplate },
                                                ].map((item) => (
                                                    <div key={item.id} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={item.id} 
                                                            // @ts-ignore
                                                            checked={reqs.deliverables[item.id]}
                                                            // @ts-ignore
                                                            onCheckedChange={(c) => setReqs({...reqs, deliverables: {...reqs.deliverables, [item.id]: !!c}})}
                                                        />
                                                        <Label htmlFor={item.id} className="flex items-center gap-2 cursor-pointer">
                                                            <item.icon className="w-4 h-4 text-slate-500" />
                                                            {item.label}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end">
                                    <Button size="lg" className="bg-[#1C4D8D] gap-2" onClick={() => setStep('gallery')} disabled={!reqs.name}>
                                        Next: Inspiration <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: INSPIRATION GALLERY */}
                        {step === 'gallery' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold text-[#0F2854]">Similar Events</h2>
                                        <p className="text-slate-500">Based on "{reqs.type}" and your style tags.</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setStep('packages')}>Skip to Packages</Button>
                                </div>

                                {matchedEvents.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {matchedEvents.map(event => (
                                            <div 
                                                key={event.id} 
                                                className={cn(
                                                    "relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                                                    selectedEventIds.includes(event.id!) ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent"
                                                )}
                                                onClick={() => {
                                                    const newIds = selectedEventIds.includes(event.id!)
                                                        ? selectedEventIds.filter(id => id !== event.id)
                                                        : [...selectedEventIds, event.id!];
                                                    setSelectedEventIds(newIds);
                                                }}
                                            >
                                                <div className="aspect-[4/5] bg-slate-200">
                                                    <img 
                                                        src={event.couplePhotoUrl || "/placeholder.jpg"} 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                        alt={event.eventName}
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                    <p className="text-white font-bold text-sm truncate">{event.eventName}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {event.tags?.slice(0,2).map(t => <span key={t} className="text-[10px] text-slate-300 bg-white/20 px-1.5 rounded">{t}</span>)}
                                                    </div>
                                                </div>
                                                {/* Selection Indicator */}
                                                {selectedEventIds.includes(event.id!) && (
                                                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-400">No specific matches found for these tags. Try adjusting the requirements.</p>
                                        <Button variant="link" onClick={() => setStep('requirements')}>Back to Requirements</Button>
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="ghost" onClick={() => setStep('requirements')}><ChevronLeft className="w-4 h-4 mr-2"/> Back</Button>
                                    <Button size="lg" className="bg-[#1C4D8D] gap-2" onClick={() => setStep('packages')}>
                                        Next: Packages <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PACKAGES */}
                        {step === 'packages' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Recommended Packages</h2>
                                    <p className="text-slate-500">Tailored to your budget of {currency} {reqs.budgetMax.toLocaleString()}</p>
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                    {recommendedPackages.map(pkg => (
                                        <Card 
                                            key={pkg.id} 
                                            className={cn(
                                                "min-w-[280px] w-[300px] snap-center cursor-pointer transition-all border-2 relative",
                                                selectedPackageId === pkg.id ? "border-blue-500 shadow-xl scale-105 z-10" : "border-slate-100 hover:border-blue-200"
                                            )}
                                            onClick={() => setSelectedPackageId(pkg.id)}
                                        >
                                            {selectedPackageId === pkg.id && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                                    Selected
                                                </div>
                                            )}
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg font-bold text-slate-800">{pkg.name}</CardTitle>
                                                <CardDescription className="font-mono text-blue-700 font-bold text-xl">
                                                    {currency} {Number(pkg.price).toLocaleString()}
                                                </CardDescription>
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
                                    {/* Custom / Blank Card */}
                                    <Card 
                                        className={cn(
                                            "min-w-[280px] w-[300px] snap-center cursor-pointer border-dashed border-2 flex items-center justify-center",
                                            selectedPackageId === 'custom' ? "border-blue-500 bg-blue-50" : "border-slate-300"
                                        )}
                                        onClick={() => setSelectedPackageId('custom')}
                                    >
                                        <div className="text-center p-6 text-slate-400">
                                            <Plus className="w-8 h-8 mx-auto mb-2" />
                                            <p className="font-bold">Build Custom Package</p>
                                        </div>
                                    </Card>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="ghost" onClick={() => setStep('gallery')}><ChevronLeft className="w-4 h-4 mr-2"/> Back</Button>
                                    <Button size="lg" className="bg-[#1C4D8D] gap-2" onClick={() => setStep('review')} disabled={!selectedPackageId}>
                                        Review & Finalize <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: REVIEW & FINALIZE */}
                        {step === 'review' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-[#0F2854]">Review Consultation</h2>
                                    <p className="text-slate-500">Confirm details before creating the event.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
                                        <CardContent className="space-y-4 text-sm">
                                            <div className="flex justify-between py-1 border-b">
                                                <span className="text-slate-500">Name</span>
                                                <span className="font-medium">{reqs.name}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b">
                                                <span className="text-slate-500">Event Type</span>
                                                <span className="font-medium">{reqs.type}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b">
                                                <span className="text-slate-500">Deliverables</span>
                                                <div className="flex gap-2">
                                                    {reqs.deliverables.photo && <Badge variant="outline" className="text-[10px]">Photo</Badge>}
                                                    {reqs.deliverables.video && <Badge variant="outline" className="text-[10px]">Video</Badge>}
                                                </div>
                                            </div>
                                            <div className="space-y-1 pt-2">
                                                <Label>Consultation Notes</Label>
                                                <Textarea 
                                                    placeholder="Add any specific promises or notes..." 
                                                    value={reqs.notes} 
                                                    onChange={e => setReqs({...reqs, notes: e.target.value})}
                                                    className="text-xs bg-slate-50"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Inspiration Summary */}
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Inspiration ({selectedEventIds.length})</CardTitle></CardHeader>
                                        <CardContent>
                                            {selectedEventIds.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {selectedEventIds.map(id => {
                                                        const ev = allEvents.find(e => e.id === id);
                                                        return ev ? (
                                                            <div key={id} className="aspect-square bg-slate-100 rounded overflow-hidden">
                                                                <img src={ev.couplePhotoUrl} className="w-full h-full object-cover" alt="insp" />
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : <p className="text-slate-400 text-sm italic">No specific inspiration selected.</p>}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="ghost" onClick={() => setStep('packages')}><ChevronLeft className="w-4 h-4 mr-2"/> Back</Button>
                                    <Button size="lg" className="bg-green-600 hover:bg-green-700 gap-2" onClick={handleCreateEvent}>
                                        <CheckCircle className="w-4 h-4" /> Create Confirmed Event
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </ScrollArea>

                {/* 3. STICKY SIDEBAR (SUMMARY) - Only if past entry step */}
                {step !== 'entry' && (
                    <div className="w-80 bg-white border-l border-slate-200 shadow-xl p-6 hidden lg:flex flex-col z-40">
                        <h3 className="font-bold text-[#0F2854] mb-4">Summary</h3>
                        
                        <div className="space-y-4 flex-1">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Budget</p>
                                <p className="text-lg font-mono text-slate-700">{currency} {reqs.budgetMax.toLocaleString()}</p>
                            </div>

                            {selectedPackageId && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Selection</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 truncate flex-1">
                                            {selectedPackageId === 'custom' ? 'Custom Build' : allPackages.find(p => p.id === selectedPackageId)?.name}
                                        </span>
                                        <span className="font-medium">
                                            {selectedPackageId === 'custom' ? '-' : allPackages.find(p => p.id === selectedPackageId)?.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {customAddons.length > 0 && (
                                <div className="space-y-1 border-t pt-2">
                                    {customAddons.map((add, i) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-500">
                                            <span>{add.name}</span>
                                            <span>+{add.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-4 mt-auto">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-sm font-medium text-slate-600">Total Estimate</span>
                                <span className="text-2xl font-bold text-[#1C4D8D]">
                                    {currency} {totalEstimate.toLocaleString()}
                                </span>
                            </div>
                            {totalEstimate > reqs.budgetMax && (
                                <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-center gap-2 mb-2">
                                    <span className="font-bold">Warning:</span> Over budget by {(totalEstimate - reqs.budgetMax).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}