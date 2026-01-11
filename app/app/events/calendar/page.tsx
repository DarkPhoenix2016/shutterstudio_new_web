"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEventsForDateRange, EventData } from "@/services/event-service"
import { format, isSameDay, addDays, startOfToday } from "date-fns"

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"

// Icons
import {
    Loader2,
    Calendar as CalendarIcon,
    MapPin,
    User,
    ChevronRight,
    Briefcase,
    Clock
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
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date()) // Track displayed month
    const [events, setEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)

    // WORKFLOW: Fetch events when Studio ID exists OR when the Month changes
    useEffect(() => {
        if (userData === undefined) return; // Wait for Auth check

        const loadEvents = async () => {
            if (userData?.studioID) {
                setLoading(true);
                try {
                    // Fetch for Current Month + Previous + Next
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
    }, [userData, currentMonth]); // Re-run when user changes months

    // --- COMPUTED DATA ---

    // 1. Map of Date Strings to Event Status (for Calendar Highlighting)
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

    // 2. Filter events for the specifically selected date
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
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">

            {/* HEADER */}
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold text-[#0F2854]">Schedule</h1>
                <p className="text-slate-500">Manage your upcoming events</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* 1. CALENDAR SECTION (Sticky on Desktop) */}
                <div className="md:col-span-1 md:sticky md:top-24">
                    <Card className="shadow-lg border-slate-200 overflow-hidden">
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                onMonthChange={setCurrentMonth} // Trigger fetch on month change
                                className="w-full flex justify-center p-4"
                                modifiers={dayModifiers}
                                modifiersClassNames={{
                                    hasEvent: "bg-blue-100 text-blue-900 font-bold hover:bg-blue-200 rounded-md", // Full highlight
                                    multiDay: "border-2 border-blue-300" // Additional border for multi-day
                                }}
                                classNames={{
                                    month: "space-y-4 w-full",
                                    head_cell: "text-slate-400 font-normal text-[0.8rem]",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 h-10 w-10 md:h-12 md:w-12", // Adjusted size
                                    day: "h-10 w-10 md:h-12 md:w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-50 rounded-md transition-all",
                                    day_selected: "bg-[#1C4D8D] text-white hover:bg-[#1C4D8D] hover:text-white focus:bg-[#1C4D8D] focus:text-white shadow-md rounded-md",
                                    day_today: "bg-slate-50 text-slate-900 font-bold border border-slate-300",
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* 2. EVENTS LIST SECTION (Scrollable) */}
                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between bg-white/95 backdrop-blur py-2 sticky top-0 z-10 border-b border-slate-100 md:static md:bg-transparent md:border-none">
                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            {selectedDate ? format(selectedDate, "EEEE, MMMM do") : "Select a date"}
                        </h2>
                        <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                            {selectedDayEvents.length} Events
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {selectedDayEvents.length > 0 ? (
                            selectedDayEvents.map((event) => {
                                // Find config for this specific day
                                const dayConfig = event.days?.find(d => d.date && isSameDay(safeDate(d.date), selectedDate!));

                                return (
                                    <Card
                                        key={event.id}
                                        className="group cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-blue-300 overflow-hidden relative"
                                        onClick={() => router.push(`/app/events/${event.id}`)}
                                    >
                                        {/* Status Stripe */}
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", getStatusColor(event.status).replace("bg-", "bg-").replace("text-", "").split(" ")[0])} />

                                        <CardContent className="p-4 pl-6 flex items-center justify-between">
                                            <div className="flex-1 space-y-2">
                                                {/* Header */}
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", getStatusColor(event.status))}>
                                                        {event.status}
                                                    </Badge>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {event.displayId}
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <div>
                                                    <h3 className="font-bold text-[#0F2854] text-base leading-tight">
                                                        {event.eventName}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" /> {event.eventType}
                                                    </p>
                                                </div>

                                                {/* Details */}
                                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="truncate">{event.customerName}</span>
                                                    </div>
                                                    {/* Show Location if available for this day */}
                                                    {event.locations?.map((loc, idx) => {
                                                        if (loc.date && isSameDay(safeDate(loc.date), selectedDate!)) {
                                                            return (
                                                                <div key={idx} className="flex items-center gap-1.5 col-span-2">
                                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span className="truncate">{loc.name} {loc.time && <span className="text-slate-400">({loc.time})</span>}</span>
                                                                </div>
                                                            )
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1C4D8D] transition-colors" />
                                        </CardContent>
                                    </Card>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                                <Clock className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium text-slate-600">No events scheduled</p>
                                <p className="text-xs">Select another date to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}