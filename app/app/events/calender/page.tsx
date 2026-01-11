"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, EventData } from "@/services/event-service"
import { format, isSameDay } from "date-fns"

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
    Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"

// Helper to safely parse dates (handles Firestore Timestamp vs JS Date)
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        // Check if it has a toDate function (Firestore Timestamp)
        if (typeof dateInput.toDate === 'function') {
            return dateInput.toDate();
        }
        // If it's already a Date object or string/number
        return new Date(dateInput);
    } catch (e) {
        return new Date();
    }
};

export default function CalendarPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // State
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [events, setEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            // Case 1: No User Data (Logged out or Error) -> Stop Loading
            if (!userData) {
                if (isMounted) setLoading(false);
                return;
            }

            // Case 2: User exists but no Studio ID -> Stop Loading
            if (!userData.studioID) {
                if (isMounted) setLoading(false);
                return;
            }

            // Case 3: Valid Studio ID -> Fetch
            try {
                const data = await fetchEvents(userData.studioID);
                if (isMounted) {
                    setEvents(data);
                }
            } catch (error) {
                console.error("Failed to load events", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [userData]); // Depend on userData object


    // --- COMPUTED DATA ---

    // 1. Get dates that contain events (for Calendar indicators)
    const eventDates = useMemo(() => {
        const dates: Date[] = []
        events.forEach(event => {
            event.days?.forEach(day => {
                if (day.date) {
                    dates.push(safeDate(day.date))
                }
            })
        })
        return dates
    }, [events])

    // 2. Filter events for the selected date
    const selectedDayEvents = useMemo(() => {
        if (!date) return []
        return events.filter(event =>
            event.days?.some(day => {
                if (!day.date) return false;
                return isSameDay(safeDate(day.date), date)
            })
        )
    }, [events, date])

    // --- HELPERS ---

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || ""
        if (s.includes('inquiry')) return 'bg-blue-100 text-blue-700 border-blue-200'
        if (s.includes('confirm') || s.includes('scheduled')) return 'bg-purple-100 text-purple-700 border-purple-200'
        if (s.includes('complet')) return 'bg-green-100 text-green-700 border-green-200'
        if (s.includes('cancel')) return 'bg-red-100 text-red-700 border-red-200'
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">

            {/* HEADER */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-[#0F2854]">Calendar</h1>
                <p className="text-slate-500">View your schedule and upcoming events.</p>
            </div>

            {/* SECTION 1: THE CALENDAR */}
            <Card className="shadow-md border-slate-200 overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex justify-center p-4 bg-white">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="p-3 w-full max-w-full"
                            classNames={{
                                month: "space-y-4 w-full",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex w-full justify-between",
                                row: "flex w-full mt-2 justify-between",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-10 w-10 md:h-14 md:w-14 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-all data-[selected]:bg-[#1C4D8D] data-[selected]:text-white",
                                day_selected: "bg-[#1C4D8D] text-white hover:bg-[#1C4D8D] hover:text-white focus:bg-[#1C4D8D] focus:text-white",
                                day_today: "bg-slate-100 text-slate-900 font-bold",
                            }}
                            modifiers={{
                                hasEvent: eventDates
                            }}
                            modifiersClassNames={{
                                hasEvent: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full data-[selected]:after:bg-white"
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: EVENTS FOR THE DAY */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#1C4D8D]" />
                        Events for {date ? format(date, "MMMM do, yyyy") : "Selected Date"}
                    </h2>
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                        {selectedDayEvents.length} Events
                    </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {selectedDayEvents.length > 0 ? (
                        selectedDayEvents.map((event) => {
                            // Find the specific day config for the selected date to get specific details if any
                            const dayConfig = event.days?.find(d => d.date && isSameDay(safeDate(d.date), date!));
                            
                            return (
                                <Card 
                                    key={event.id} 
                                    className="group cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-blue-300"
                                    onClick={() => router.push(`/app/events/${event.id}`)}
                                >
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div className="flex-1 space-y-3">
                                            {/* Top Row: Badge & ID */}
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={cn("font-medium", getStatusColor(event.status))}>
                                                    {event.status}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {event.displayId || event.id?.substring(0, 8).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Main Info */}
                                            <div>
                                                <h3 className="text-lg font-bold text-[#0F2854] group-hover:text-[#1C4D8D] transition-colors">
                                                    {event.eventName}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5" />
                                                        {event.customerName}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Briefcase className="w-3.5 h-3.5" />
                                                        {event.eventType}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Specific Day Details */}
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <Badge variant="secondary" className={cn(
                                                    "text-xs font-normal border",
                                                    dayConfig?.type === 'package' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    {dayConfig?.type === 'package' ? "Package Plan" : "Custom Plan"}
                                                </Badge>
                                                
                                                {/* If location info matches this date, show it */}
                                                {event.locations?.map((loc, idx) => {
                                                    if (loc.date && isSameDay(safeDate(loc.date), date!)) {
                                                        return (
                                                            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                                                <MapPin className="w-3 h-3" />
                                                                <span className="truncate max-w-[150px]">{loc.name} {loc.time && `@ ${loc.time}`}</span>
                                                            </div>
                                                        )
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </div>

                                        <div className="pl-4">
                                            <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-[#1C4D8D]">
                                                <ChevronRight className="w-6 h-6" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    ) : (
                        <Card className="border-dashed bg-slate-50/50">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                                <h3 className="text-lg font-semibold text-slate-600">No Events</h3>
                                <p className="text-sm">There are no events scheduled for this day.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}