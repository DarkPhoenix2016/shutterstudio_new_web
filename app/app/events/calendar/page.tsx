"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEventsForDateRange, EventData } from "@/services/event-service"
import { format, isSameDay } from "date-fns"

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"

// Icons
import {
    Loader2,
    Calendar as CalendarIcon,
    MapPin,
    User,
    ChevronRight,
    Clock,
    ImageIcon,
    ExternalLink,
    Phone,
    MessageCircle,
    MessageSquareText
} from "lucide-react"
import { cn } from "@/lib/utils"

// Helper: Safe Date Parsing
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (typeof dateInput.toDate === 'function') return dateInput.toDate();
        return new Date(dateInput);
    } catch (e) {
        return new Date();
    }
};

export default function CalendarPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [events, setEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)

    // WORKFLOW: Fetch events when Studio ID exists OR when the Month changes
    useEffect(() => {
        if (userData === undefined) return;

        const loadEvents = async () => {
            if (userData?.studioID) {
                setLoading(true);
                try {
                    const data = await fetchEventsForDateRange(userData.studioID, currentMonth);
                    setEvents(data);
                } catch (error) {
                    console.error("Failed to load calendar events", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }

        loadEvents();
    }, [userData, currentMonth]);

    // --- COMPUTED DATA ---

    const dayModifiers = useMemo(() => {
        const modifiers: { hasEvent: Date[], multiDay: Date[] } = { hasEvent: [], multiDay: [] };
        events.forEach(event => {
            const isMultiDay = event.dayCount > 1;
            event.days?.forEach(day => {
                if (day.date) {
                    const dateObj = safeDate(day.date);
                    modifiers.hasEvent.push(dateObj);
                    if (isMultiDay) modifiers.multiDay.push(dateObj);
                }
            });
        });
        return modifiers;
    }, [events]);

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        return events.filter(event =>
            event.days?.some(day => {
                if (!day.date) return false;
                return isSameDay(safeDate(day.date), selectedDate);
            })
        );
    }, [events, selectedDate]);

    // --- HELPERS ---
    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || ""
        if (s.includes('inquiry')) return 'bg-blue-100 text-blue-700 border-blue-200'
        if (s.includes('confirm') || s.includes('scheduled')) return 'bg-purple-100 text-purple-700 border-purple-200'
        if (s.includes('complet')) return 'bg-green-100 text-green-700 border-green-200'
        if (s.includes('cancel')) return 'bg-red-100 text-red-700 border-red-200'
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }

    if (loading && events.length === 0) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">
            
            {/* MAIN GRID LAYOUT */}
            {/* [!code highlight] Fixed Layout: 1 col mobile, 3 cols desktop (1 for cal, 2 for list) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
                
                {/* 1. CALENDAR SECTION (Sticky on Desktop) */}
                {/* [!code highlight] lg:sticky lg:top-24 keeps it fixed while scrolling list */}
                <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit z-10">
                    {/* HEADER */}
                    <div className="flex flex-col gap-2 mb-6">
                        <h1 className="text-3xl font-bold text-[#0F2854]">Schedule</h1>
                        <p className="text-slate-500">Manage your upcoming events</p>
                    </div>

                    <Card className="shadow-lg border-slate-200 overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                onMonthChange={setCurrentMonth}
                                className="w-full flex justify-center p-4"
                                modifiers={dayModifiers}
                                modifiersClassNames={{
                                    hasEvent: "bg-blue-100 text-blue-900 font-bold hover:bg-blue-200 rounded-md",
                                    multiDay: "border-2 border-blue-300"
                                }}
                                classNames={{
                                    month: "space-y-4 w-full",
                                    head_cell: "text-slate-400 font-normal text-[0.8rem]",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 h-10 w-10 md:h-12 md:w-12",
                                    day: "h-10 w-10 md:h-12 md:w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-50 rounded-md transition-all",
                                    day_selected: "bg-[#1C4D8D] text-white hover:bg-[#1C4D8D] hover:text-white focus:bg-[#1C4D8D] focus:text-white shadow-md rounded-md",
                                    day_today: "bg-slate-100 text-slate-900 font-bold border border-slate-300",
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* 2. EVENTS LIST SECTION (Scrollable) */}
                <div className="lg:col-span-2 space-y-4">
                    
                    {/* Sticky Date Header for Mobile/List context */}
                    <Card className="bg-white border-slate-200 shadow-sm p-0 sticky top-0 z-20">
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-bold text-slate-800">
                                    {selectedDate ? format(selectedDate, "EEEE, MMMM do") : "Select a date"}
                                </h2>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                                {selectedDayEvents.length} Events
                            </Badge>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 pb-20">
                        {selectedDayEvents.length > 0 ? (
                            selectedDayEvents.map((event) => {
                                // Filter locations specific to the selected date
                                const dayLocations = event.locations?.filter(loc =>
                                    loc.date && isSameDay(safeDate(loc.date), selectedDate!)
                                ) || [];

                                // Clean phone number for WhatsApp
                                const cleanPhone = event.customerMobile?.replace(/[^0-9]/g, "") || "";

                                return (
                                    <Card
                                        key={event.id}
                                        className="group cursor-pointer hover:shadow-lg transition-all border-slate-200 hover:border-blue-300 overflow-hidden bg-white p-0"
                                        onClick={() => router.push(`/app/events/${event.id}`)}
                                    >
                                        <div className="flex flex-col sm:flex-row h-full min-h-[160px]">

                                            {/* IMAGE SECTION */}
                                            <div className="w-full sm:w-40 h-40 sm:h-auto bg-slate-100 relative shrink-0">
                                                {event.couplePhotoUrl ? (
                                                    <img
                                                        src={event.couplePhotoUrl}
                                                        alt="Cover"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <ImageIcon className="w-10 h-10 opacity-50" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* CONTENT SECTION */}
                                            <div className="flex-1 p-4 flex flex-col gap-3">

                                                {/* Header: ID, Type, Status */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {event.displayId || "ID"}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {event.eventType}
                                                        </span>
                                                    </div>
                                                    <Badge variant="outline" className={cn("font-medium", getStatusColor(event.status))}>
                                                        {event.status}
                                                    </Badge>
                                                </div>

                                                {/* Body: Title & User */}
                                                <div>
                                                    <h3 className="font-bold text-[#0F2854] text-xl leading-tight group-hover:text-[#1C4D8D] transition-colors mb-1">
                                                        {event.eventName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <User className="w-3.5 h-3.5" />
                                                        {event.customerName}
                                                    </div>
                                                </div>

                                                {/* QUICK ACTION BUTTONS */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 bg-white"
                                                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${event.customerMobile}`, '_self'); }}
                                                        disabled={!event.customerMobile}
                                                    >
                                                        <Phone className="h-3 w-3" /> Call
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-200 bg-white"
                                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`, '_blank'); }}
                                                        disabled={!cleanPhone}
                                                    >
                                                        <MessageCircle className="h-3 w-3" /> WhatsApp
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 bg-white"
                                                        onClick={(e) => { e.stopPropagation(); window.open(`sms:${event.customerMobile}`, '_self'); }}
                                                        disabled={!event.customerMobile}
                                                    >
                                                        <MessageSquareText className="h-3 w-3" /> SMS
                                                    </Button>
                                                </div>

                                                {/* Footer: Date-Specific Locations */}
                                                {dayLocations.length > 0 ? (
                                                    <div className="mt-auto pt-2 space-y-2">
                                                        {dayLocations.map((loc, idx) => (
                                                            <div
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    if (loc.mapUrl) {
                                                                        e.stopPropagation();
                                                                        window.open(loc.mapUrl, '_blank');
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors border",
                                                                    loc.mapUrl
                                                                        ? "bg-slate-50 border-slate-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                                                                        : "bg-slate-50 border-slate-100 text-slate-600 cursor-default"
                                                                )}
                                                            >
                                                                <MapPin className={cn("w-3.5 h-3.5 shrink-0", loc.mapUrl ? "text-blue-500" : "text-slate-400")} />
                                                                <span className="truncate flex-1">
                                                                    {loc.name}
                                                                    {loc.time && <span className="text-slate-500 font-normal ml-1">@ {loc.time}</span>}
                                                                    {loc.note && <span className="text-slate-400 font-normal ml-1">- {loc.note}</span>}
                                                                </span>
                                                                {loc.mapUrl && <ExternalLink className="w-3 h-3 opacity-50 ml-2" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="mt-auto"></div>
                                                )}
                                            </div>

                                            {/* Arrow Icon (Desktop Only) */}
                                            <div className="hidden sm:flex items-center pr-4 text-slate-300 group-hover:text-[#1C4D8D]">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                                <Clock className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium text-slate-600">No events scheduled</p>
                                <p className="text-xs">Select another date to view details.</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 text-[#1C4D8D]"
                                    onClick={() => router.push('/app/events')}
                                >
                                    Create New Event
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}