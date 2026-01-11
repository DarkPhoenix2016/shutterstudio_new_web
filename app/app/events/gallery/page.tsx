"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { fetchEvents, EventData } from "@/services/event-service"
import { format } from "date-fns"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"

// Icons
import {
    Loader2, Search, Filter, X, ChevronLeft, ChevronRight,
    Maximize2, ZoomIn, ZoomOut, Calendar, MapPin, User,
    Camera, Tag, Info, Download, Check
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---

interface GalleryItem {
    id: string; // unique combo of eventID + index
    url: string;
    type: 'cover' | 'gallery';
    event: EventData;
}

// --- HELPER: SAFE DATE ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (typeof dateInput.toDate === 'function') return dateInput.toDate();
        return new Date(dateInput);
    } catch { return new Date(); }
};

export default function EventGalleryPage() {
    const { userData } = useAuth()
    
    // Data State
    const [events, setEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedType, setSelectedType] = useState<string>("All")
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    
    // Lightbox State
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [showInfoPanel, setShowInfoPanel] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(1)

    // --- 1. DATA LOADING ---
    useEffect(() => {
        const loadData = async () => {
            if (userData?.studioID) {
                try {
                    const data = await fetchEvents(userData.studioID);
                    setEvents(data);
                } catch (error) {
                    console.error("Failed to load events", error);
                } finally {
                    setLoading(false);
                }
            } else if (userData === undefined) {
                // waiting auth
            } else {
                setLoading(false);
            }
        };
        loadData();
    }, [userData]);

    // --- 2. DATA PROCESSING (FLATTEN & FILTER) ---
    
    // Extract unique tags and types for filter dropdowns
    const { availableTags, availableTypes } = useMemo(() => {
        const tags = new Set<string>();
        const types = new Set<string>();
        events.forEach(e => {
            // @ts-ignore
            if (e.tags) e.tags.forEach(t => tags.add(t));
            if (e.eventType) types.add(e.eventType);
        });
        return {
            availableTags: Array.from(tags).sort(),
            availableTypes: Array.from(types).sort()
        };
    }, [events]);

    // Flatten events into a single list of images, then filter
    const filteredImages = useMemo(() => {
        let images: GalleryItem[] = [];

        // Flatten
        events.forEach(event => {
            if (event.couplePhotoUrl) {
                images.push({ 
                    id: `${event.id}_cover`, 
                    url: event.couplePhotoUrl, 
                    type: 'cover', 
                    event 
                });
            }
            if (event.galleryUrls) {
                event.galleryUrls.forEach((url, idx) => {
                    images.push({ 
                        id: `${event.id}_${idx}`, 
                        url, 
                        type: 'gallery', 
                        event 
                    });
                });
            }
        });

        // Filter
        return images.filter(img => {
            const matchesSearch = 
                img.event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                img.event.customerName.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesType = selectedType === "All" || img.event.eventType === selectedType;
            // @ts-ignore
            const matchesTag = !selectedTag || (img.event.tags && img.event.tags.includes(selectedTag));

            return matchesSearch && matchesType && matchesTag;
        });
    }, [events, searchQuery, selectedType, selectedTag]);

    // --- 3. LIGHTBOX ACTIONS ---

    const handleNext = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev < filteredImages.length - 1 ? prev + 1 : 0));
        setZoomLevel(1);
    }, [filteredImages.length]);

    const handlePrev = useCallback(() => {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : filteredImages.length - 1));
        setZoomLevel(1);
    }, [filteredImages.length]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (lightboxIndex === null) return;
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "Escape") setLightboxIndex(null);
    }, [lightboxIndex, handleNext, handlePrev]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const currentImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
            
            {/* --- HEADER & FILTERS --- */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854]">Event Gallery</h1>
                    <p className="text-slate-500 text-sm">{filteredImages.length} Photos Found</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search events or clients..." 
                            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Sheet (Mobile) / Bar (Desktop) */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="gap-2 h-10 border-slate-200 text-slate-600 hover:text-[#1C4D8D] hover:bg-blue-50">
                                <Filter className="w-4 h-4"/> Filters
                                {(selectedType !== "All" || selectedTag) && <Badge className="ml-1 h-5 px-1 bg-[#1C4D8D] text-[10px]">Active</Badge>}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[300px] sm:w-[400px] border-l border-slate-200">
                            <SheetHeader className="pb-4 border-b border-slate-100">
                                <SheetTitle className="text-xl font-bold text-[#0F2854]">Filter Gallery</SheetTitle>
                            </SheetHeader>
                            
                            <div className="py-6 space-y-8 p-4">
                                {/* Event Type Filter */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Event Type</label>
                                    <Select value={selectedType} onValueChange={setSelectedType}>
                                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-11">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Types</SelectItem>
                                            {availableTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Tags Filter */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Tags</label>
                                        {selectedTag && (
                                            <button 
                                                onClick={() => setSelectedTag(null)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Clear Tag
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge 
                                            variant={selectedTag === null ? "default" : "outline"} 
                                            className={cn(
                                                "cursor-pointer px-3 py-1.5 text-sm font-medium transition-all",
                                                selectedTag === null 
                                                    ? "bg-[#1C4D8D] hover:bg-[#153a6b] text-white border-transparent"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                                            )}
                                            onClick={() => setSelectedTag(null)}
                                        >
                                            All
                                        </Badge>
                                        {availableTags.map(tag => (
                                            <Badge 
                                                key={tag} 
                                                variant={selectedTag === tag ? "default" : "outline"}
                                                className={cn(
                                                    "cursor-pointer px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5",
                                                    selectedTag === tag 
                                                        ? "bg-[#1C4D8D] hover:bg-[#153a6b] text-white border-transparent shadow-sm"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50"
                                                )}
                                                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                            >
                                                {selectedTag === tag && <Check className="w-3 h-3" />}
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <SheetFooter className="mt-auto border-t border-slate-100 pt-4 sm:justify-between gap-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setSelectedType("All"); setSelectedTag(null); }}
                                    className="w-full text-slate-500"
                                >
                                    Reset All
                                </Button>
                                <SheetClose asChild>
                                    <Button className="w-full bg-[#1C4D8D] hover:bg-[#153a6b]">View Results</Button>
                                </SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* --- MASONRY GRID --- */}
            <ScrollArea className="flex-1 p-6">
                {filteredImages.length > 0 ? (
                    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 pb-20">
                        {filteredImages.map((item, idx) => (
                            <div 
                                key={item.id} 
                                className="break-inside-avoid relative group cursor-zoom-in rounded-lg overflow-hidden bg-slate-200 shadow-sm border border-slate-200"
                                onClick={() => setLightboxIndex(idx)}
                            >
                                <img 
                                    src={item.url} 
                                    alt={item.event.eventName} 
                                    loading="lazy"
                                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100">
                                    <div className="text-white drop-shadow-md">
                                        <p className="text-xs font-bold truncate">{item.event.eventName}</p>
                                        <p className="text-[10px] opacity-90">{format(safeDate(item.event.days?.[0]?.date), "MMM yyyy")}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                        <Camera className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No photos found</p>
                        <p className="text-sm">Try adjusting your filters.</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedType("All"); setSelectedTag(null); }}>Clear Filters</Button>
                    </div>
                )}
            </ScrollArea>

            {/* --- LIGHTBOX OVERLAY --- */}
            {lightboxIndex !== null && currentImage && (
                <div className="fixed inset-0 z-50 bg-black/95 flex animate-in fade-in duration-200">
                    
                    {/* Main Image Area */}
                    <div className="flex-1 relative flex items-center justify-center h-full w-full">
                        
                        {/* Toolbar */}
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                            <Button 
                                variant="secondary" size="icon" 
                                className="bg-black/50 text-white hover:bg-black/70 border-0 rounded-full"
                                onClick={() => setZoomLevel(z => Math.min(z + 0.5, 3))}
                            >
                                <ZoomIn className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="secondary" size="icon" 
                                className="bg-black/50 text-white hover:bg-black/70 border-0 rounded-full"
                                onClick={() => setZoomLevel(1)}
                            >
                                <ZoomOut className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="secondary" size="icon" 
                                className={`bg-black/50 text-white hover:bg-black/70 border-0 rounded-full ${showInfoPanel ? "text-blue-400" : ""}`}
                                onClick={() => setShowInfoPanel(!showInfoPanel)}
                            >
                                <Info className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="secondary" size="icon" 
                                className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-full"
                                onClick={() => setLightboxIndex(null)}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Navigation Arrows */}
                        <Button 
                            variant="ghost" size="icon" 
                            className="absolute left-4 z-40 text-white hover:bg-white/10 rounded-full w-12 h-12"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </Button>
                        <Button 
                            variant="ghost" size="icon" 
                            className="absolute right-4 z-40 text-white hover:bg-white/10 rounded-full w-12 h-12"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </Button>

                        {/* The Image */}
                        <div 
                            className="w-full h-full flex items-center justify-center p-4 overflow-hidden"
                            onClick={() => setZoomLevel(1)} // Reset zoom on click
                        >
                            <img 
                                src={currentImage.url} 
                                alt="Full View" 
                                className="max-h-full max-w-full object-contain transition-transform duration-200"
                                style={{ transform: `scale(${zoomLevel})` }}
                            />
                        </div>
                    </div>

                    {/* Metadata Panel (Sidebar) */}
                    {showInfoPanel && (
                        <div className="w-80 bg-white border-l border-slate-200 shrink-0 h-full overflow-y-auto animate-in slide-in-from-right duration-300">
                            <div className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-[#0F2854] leading-tight mb-1">
                                        {currentImage.event.eventName}
                                    </h2>
                                    <Badge variant="secondary" className="mt-2 bg-blue-50 text-blue-700 border-blue-100">
                                        {currentImage.event.eventType}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Event Date</p>
                                            <p className="text-sm text-slate-500">
                                                {format(safeDate(currentImage.event.days?.[0]?.date), "PPP")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Client</p>
                                            <p className="text-sm text-slate-500">{currentImage.event.customerName}</p>
                                        </div>
                                    </div>

                                    {currentImage.event.locations?.[0] && (
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">Location</p>
                                                <p className="text-sm text-slate-500 truncate w-56">{currentImage.event.locations[0].name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Tags Section */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">Tags</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {/* @ts-ignore */}
                                        {currentImage.event.tags && currentImage.event.tags.length > 0 ? (
                                            /* @ts-ignore */
                                            currentImage.event.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs font-normal text-slate-600">
                                                    #{tag}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No tags added.</span>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* File Metadata (Simulated) */}
                                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Uploaded</span>
                                        <span>{currentImage.event.createdAt ? format(safeDate(currentImage.event.createdAt), "MMM dd, yyyy") : "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Category</span>
                                        <span className="capitalize">{currentImage.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Reference ID</span>
                                        <span className="font-mono">{currentImage.event.displayId || "N/A"}</span>
                                    </div>
                                </div>

                                <Button className="w-full gap-2 bg-[#1C4D8D]" onClick={() => window.open(currentImage.url, '_blank')}>
                                    <Download className="w-4 h-4" /> Download Original
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}