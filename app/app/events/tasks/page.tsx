"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, EventData } from "@/services/event-service"
import { format, isSameDay, isAfter, isBefore, startOfToday, endOfToday, parseISO } from "date-fns"

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

// Icons
import { 
    Loader2, Search, Calendar, Clock, MapPin, 
    CheckCircle, ArrowRight, Briefcase, User, 
    AlertCircle, PartyPopper, History
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- HELPER: SAFE DATE ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (typeof dateInput.toDate === 'function') return dateInput.toDate();
        return new Date(dateInput);
    } catch { return new Date(); }
};

export default function MyTasksPage() {
    const { userData } = useAuth()
    const router = useRouter()

    // State
    const [allEvents, setAllEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("today")

    // --- DATA LOADING ---
    useEffect(() => {
        // Wait for Auth
        if (userData === undefined) return;

        const loadMyTasks = async () => {
            if (userData?.studioID && userData?.uid) {
                setLoading(true);
                try {
                    // Fetch all studio events (Optimization: In a real app, use a query for 'assignedCrew array-contains uid')
                    const events = await fetchEvents(userData.studioID);
                    
                    // Filter: Only events where current user is assigned
                    const myEvents = events.filter(event => 
                        event.assignedCrew?.includes(userData.uid)
                    );
                    console.log("Loaded my tasks:", myEvents);
                    setAllEvents(myEvents);
                } catch (error) {
                    console.error("Failed to load tasks", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }

        loadMyTasks();
    }, [userData]);

    // --- CATEGORIZATION LOGIC ---
    const { todayTasks, upcomingTasks, pastTasks } = useMemo(() => {
        const today = startOfToday();
        const endToday = endOfToday();

        const todayList: EventData[] = [];
        const upcomingList: EventData[] = [];
        const pastList: EventData[] = [];

        // Apply Search Filter First
        const filtered = allEvents.filter(e => {
            const query = searchQuery.toLowerCase();
            return (
                e.eventName?.toLowerCase().includes(query) ||
                e.customerName?.toLowerCase().includes(query) ||
                e.displayId?.toLowerCase().includes(query) ||
                e.locations?.some(l => l.name.toLowerCase().includes(query))
            );
        });

        filtered.forEach(event => {
            if (!event.days || event.days.length === 0) return;

            const days = event.days.map(d => safeDate(d.date));
            
            // Check if any day is TODAY
            const isToday = days.some(d => isSameDay(d, today));
            
            // Check if any day is FUTURE (and not today, generally)
            // Logic: If it has a today date, it goes to Today tab even if it has future dates (multi-day).
            // Upcoming is strictly future dates only OR future dates if not active today.
            const hasFuture = days.some(d => isAfter(d, endToday));
            
            // Check if all days are PAST
            const isAllPast = days.every(d => isBefore(d, today));

            if (isToday) {
                todayList.push(event);
            } else if (hasFuture) {
                upcomingList.push(event);
            } else if (isAllPast) {
                pastList.push(event);
            }
        });

        // Sorting
        // Today: Earliest time/date first (if times available) or standard priority
        // Upcoming: Earliest date first
        // Past: Most recent first (descending)
        
        return {
            todayTasks: todayList, // Add sort logic if needed
            upcomingTasks: upcomingList.sort((a, b) => safeDate(a.days[0].date).getTime() - safeDate(b.days[0].date).getTime()),
            pastTasks: pastList.sort((a, b) => safeDate(b.days[0].date).getTime() - safeDate(a.days[0].date).getTime())
        };
    }, [allEvents, searchQuery]);

    // --- HELPER: GET STATUS COLOR ---
    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase() || "";
        if (s.includes('complet')) return "bg-green-100 text-green-700 border-green-200";
        if (s.includes('progress') || s.includes('shoot')) return "bg-blue-100 text-blue-700 border-blue-200";
        if (s.includes('edit') || s.includes('post')) return "bg-purple-100 text-purple-700 border-purple-200";
        if (s.includes('cancelled')) return "bg-red-100 text-red-700 border-red-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    // --- COMPONENT: TASK CARD ---
    const TaskCard = ({ event, type }: { event: EventData, type: 'today' | 'upcoming' | 'past' }) => {
        // Find relevant day info
        const relevantDay = event.days.find(d => {
            const date = safeDate(d.date);
            if (type === 'today') return isSameDay(date, new Date());
            if (type === 'upcoming') return isAfter(date, new Date());
            return true; // Default to first for past
        }) || event.days[0];

        const dayDate = safeDate(relevantDay?.date);
        
        // Find location for this day if exists
        const dayLocation = event.locations?.find(l => isSameDay(safeDate(l.date), dayDate));

        return (
            <div 
                onClick={() => router.push(`/app/events/${event.id}`)}
                className={cn(
                    "relative bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer group",
                    type === 'today' ? "border-blue-200 shadow-sm ring-1 ring-blue-50" : "border-slate-200",
                    type === 'past' ? "opacity-75 hover:opacity-100 grayscale-[0.3] hover:grayscale-0" : ""
                )}
            >
                {/* Status Stripe for Today items */}
                {type === 'today' && <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />}

                <div className={cn("flex flex-col gap-3", type === 'today' ? "pl-3" : "")}>
                    
                    {/* Header: Status & ID */}
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className={cn("font-medium border", getStatusStyles(event.status))}>
                            {event.status}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                            {event.displayId}
                        </span>
                    </div>

                    {/* Main Content */}
                    <div>
                        <h3 className={cn("font-bold text-[#0F2854] leading-tight group-hover:text-blue-700 transition-colors", type === 'today' ? "text-lg" : "text-base")}>
                            {event.eventName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                            <span className="uppercase tracking-wider">{event.eventType}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3"/> {event.customerName}</span>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Date/Time */}
                        <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-md">
                            <Calendar className={cn("w-4 h-4 mt-0.5", type === 'today' ? "text-blue-500" : "text-slate-400")} />
                            <div className="flex flex-col">
                                <span className={cn("font-medium", type === 'today' ? "text-blue-700" : "")}>
                                    {type === 'today' ? "Today" : format(dayDate, "EEE, MMM do")}
                                </span>
                                {/* Simulate Time if not in DB (or use location time) */}
                                <span className="text-xs text-slate-500">
                                    {dayLocation?.time || "All Day"}
                                </span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-md">
                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                            <div className="flex flex-col">
                                <span className="font-medium truncate w-full block">
                                    {dayLocation?.name || "Location TBD"}
                                </span>
                                <span className="text-xs text-slate-500">View Map</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Role */}
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>Your Role: <span className="font-medium text-slate-700">Crew Member</span></span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>
        )
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen bg-white/50 space-y-6 pb-24">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[#0F2854]">My Tasks</h1>
                <p className="text-slate-500 text-sm">Your assigned events and responsibilities.</p>
            </div>

            {/* --- SEARCH --- */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search your tasks..." 
                    className="pl-9 bg-white border-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* --- TABS & CONTENT --- */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80 p-1">
                    <TabsTrigger value="today" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        Today 
                        {todayTasks.length > 0 && <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 h-5 px-1.5 text-[10px] hover:bg-blue-100">{todayTasks.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Upcoming
                        {upcomingTasks.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{upcomingTasks.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="past" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Past</TabsTrigger>
                </TabsList>

                {/* TODAY TAB */}
                <TabsContent value="today" className="space-y-4 focus-visible:ring-0">
                    {todayTasks.length > 0 ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            {todayTasks.map(event => (
                                <TaskCard key={event.id} event={event} type="today" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                <PartyPopper className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">You're all clear today!</h3>
                            <p className="text-slate-500 text-sm mt-1">No events assigned for today. <br/>Check upcoming tasks to stay ahead.</p>
                            <Button variant="link" onClick={() => setActiveTab("upcoming")} className="mt-2 text-blue-600">View Upcoming</Button>
                        </div>
                    )}
                </TabsContent>

                {/* UPCOMING TAB */}
                <TabsContent value="upcoming" className="space-y-4 focus-visible:ring-0">
                    {upcomingTasks.length > 0 ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            {upcomingTasks.map(event => (
                                <TaskCard key={event.id} event={event} type="upcoming" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                <Calendar className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No upcoming events</h3>
                            <p className="text-slate-500 text-sm mt-1">Looks like your schedule is free for now.</p>
                        </div>
                    )}
                </TabsContent>

                {/* PAST TAB */}
                <TabsContent value="past" className="space-y-4 focus-visible:ring-0">
                    {pastTasks.length > 0 ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            {pastTasks.map(event => (
                                <TaskCard key={event.id} event={event} type="past" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <History className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No past events</h3>
                            <p className="text-slate-500 text-sm mt-1">Your completed work history will appear here.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}