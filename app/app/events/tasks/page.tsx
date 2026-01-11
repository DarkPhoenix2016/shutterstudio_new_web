"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, EventData } from "@/services/event-service"
import { format, isSameDay, isAfter, isBefore, startOfToday, endOfToday, compareAsc } from "date-fns"

// UI Components
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

// Icons
import { 
    Loader2, Search, Calendar, MapPin, 
    ArrowRight, User, PartyPopper, History,
    Phone, MessageCircle, MessageSquareText,
    ImageIcon, Clock, ExternalLink, ChevronRight
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
    const { userData, currentUser } = useAuth()
    const router = useRouter()

    // State
    const [allEvents, setAllEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("today")

    // --- DATA LOADING ---
    useEffect(() => {
        if (userData === undefined || currentUser === null) return;

        const loadMyTasks = async () => {
            if (userData?.studioID && currentUser?.uid) {
                setLoading(true);
                try {
                    const events = await fetchEvents(userData.studioID);
                    
                    // Filter: Only events where current user is assigned
                    const myEvents = events.filter(event => 
                        event.assignedCrew?.includes(currentUser.uid)
                    );
                    
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
    }, [userData, currentUser]);

    // --- CATEGORIZATION & MULTI-DAY LOGIC ---
    const { todayTasks, upcomingTasks, pastTasks } = useMemo(() => {
        const today = startOfToday();
        const endToday = endOfToday();

        const todayList: { event: EventData, relevantDate: Date, dayIndex: number }[] = [];
        const upcomingList: { event: EventData, relevantDate: Date, dayIndex: number }[] = [];
        const pastList: { event: EventData, relevantDate: Date, dayIndex: number }[] = [];

        const filtered = allEvents.filter(e => {
            const query = searchQuery.toLowerCase();
            return (
                e.eventName?.toLowerCase().includes(query) ||
                e.customerName?.toLowerCase().includes(query) ||
                e.displayId?.toLowerCase().includes(query)
            );
        });

        filtered.forEach(event => {
            if (!event.days || event.days.length === 0) return;

            // Sort days chronologically just in case
            const sortedDays = [...event.days].sort((a, b) => 
                safeDate(a.date).getTime() - safeDate(b.date).getTime()
            );

            // Check specific days for assignments
            sortedDays.forEach((dayConfig, index) => {
                const dayDate = safeDate(dayConfig.date);
                const taskItem = { event, relevantDate: dayDate, dayIndex: index + 1 };

                if (isSameDay(dayDate, today)) {
                    todayList.push(taskItem);
                } else if (isAfter(dayDate, endToday)) {
                    // Only add to upcoming if it's the NEXT upcoming day for this event to avoid duplicates?
                    // Or list all upcoming days? Let's list all distinctive task days.
                    upcomingList.push(taskItem);
                } else if (isBefore(dayDate, today)) {
                    pastList.push(taskItem);
                }
            });
        });
        
        // Sort lists by date
        const sortByDate = (a: any, b: any) => a.relevantDate.getTime() - b.relevantDate.getTime();
        const sortByDateDesc = (a: any, b: any) => b.relevantDate.getTime() - a.relevantDate.getTime();

        return {
            todayTasks: todayList.sort(sortByDate),
            upcomingTasks: upcomingList.sort(sortByDate),
            pastTasks: pastList.sort(sortByDateDesc)
        };
    }, [allEvents, searchQuery]);

    // --- HELPER: GET STATUS COLOR ---
    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase() || "";
        if (s.includes('complet')) return "bg-green-100 text-green-700 border-green-200";
        if (s.includes('progress') || s.includes('shoot')) return "bg-blue-100 text-blue-700 border-blue-200";
        if (s.includes('edit') || s.includes('post')) return "bg-purple-100 text-purple-700 border-purple-200";
        if (s.includes('cancel')) return "bg-red-100 text-red-700 border-red-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    // --- COMPONENT: TASK CARD (MATCHING REFERENCE DESIGN) ---
    const TaskCard = ({ data }: { data: { event: EventData, relevantDate: Date, dayIndex: number } }) => {
        const { event, relevantDate, dayIndex } = data;
        const cleanPhone = event.customerMobile?.replace(/[^0-9]/g, "") || "";
        
        // Find location specific to THIS day
        const dayLocation = event.locations?.find(l => isSameDay(safeDate(l.date), relevantDate));
        
        const totalDays = event.days?.length || 1;
        const isMultiDay = totalDays > 1;

        return (
            <Card 
                className="group cursor-pointer hover:shadow-xl transition-all border-slate-200 hover:border-blue-300 overflow-hidden bg-white p-0"
                onClick={() => router.push(`/app/events/${event.id}`)}
            >
                <div className="flex flex-col sm:flex-row h-full min-h-[160px]">
                    
                    {/* LEFT: IMAGE SECTION */}
                    <div className="w-full sm:w-48 h-48 sm:h-auto bg-slate-100 relative shrink-0">
                        {event.couplePhotoUrl ? (
                            <img 
                                src={event.couplePhotoUrl} 
                                alt="Cover" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                <ImageIcon className="w-12 h-12 opacity-30" />
                            </div>
                        )}
                        {/* Mobile Status Overlay */}
                        <div className="absolute top-2 right-2 sm:hidden">
                            <Badge className={cn("shadow-sm", getStatusStyles(event.status))}>
                                {event.status}
                            </Badge>
                        </div>
                    </div>

                    {/* RIGHT: CONTENT SECTION */}
                    <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                        
                        {/* ROW 1: HEADER INFO */}
                        <div className="flex justify-between items-start">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 rounded-sm font-mono text-[10px] px-1.5">
                                    {event.displayId || "ID"}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {event.eventType}
                                </span>
                                {/* [!code highlight] MULTI-DAY BADGE */}
                                {isMultiDay && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 h-5 text-[10px] px-1.5 hover:bg-amber-100">
                                        Day {dayIndex} of {totalDays}
                                    </Badge>
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <Badge variant="outline" className={cn("font-medium", getStatusStyles(event.status))}>
                                    {event.status}
                                </Badge>
                            </div>
                        </div>

                        {/* ROW 2: MAIN TITLE */}
                        <div>
                            <h3 className="font-bold text-[#0F2854] text-xl leading-tight group-hover:text-[#1C4D8D] transition-colors mb-1">
                                {event.eventName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <User className="w-4 h-4 text-slate-400" />
                                {event.customerName}
                            </div>
                        </div>

                        {/* ROW 3: QUICK ACTIONS */}
                        <div className="flex items-center gap-2 mt-1">
                            <Button 
                                variant="outline" size="sm" 
                                className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 bg-white"
                                onClick={(e) => { e.stopPropagation(); window.open(`tel:${event.customerMobile}`, '_self'); }}
                                disabled={!event.customerMobile}
                            >
                                <Phone className="h-3 w-3" /> Call
                            </Button>
                            <Button 
                                variant="outline" size="sm" 
                                className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-200 bg-white"
                                onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`, '_blank'); }}
                                disabled={!cleanPhone}
                            >
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                            </Button>
                            <Button 
                                variant="outline" size="sm" 
                                className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 bg-white"
                                onClick={(e) => { e.stopPropagation(); window.open(`sms:${event.customerMobile}`, '_self'); }}
                                disabled={!event.customerMobile}
                            >
                                <MessageSquareText className="h-3 w-3" /> SMS
                            </Button>
                        </div>

                        {/* ROW 4: LOCATION / DATE BAR (The specific day's date/loc) */}
                        <div className="mt-auto pt-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-xs font-medium w-full text-slate-600">
                                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-semibold text-blue-900">
                                    {format(relevantDate, "EEE, MMM do")}
                                </span>
                                
                                {dayLocation && (
                                    <>
                                        <span className="text-slate-300">|</span>
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate flex-1">
                                            {dayLocation.name} {dayLocation.time && `@ ${dayLocation.time}`}
                                        </span>
                                        {dayLocation.mapUrl && (
                                            <ExternalLink 
                                                className="w-3 h-3 text-blue-400 cursor-pointer hover:text-blue-600" 
                                                onClick={(e) => { e.stopPropagation(); window.open(dayLocation.mapUrl, '_blank'); }}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Arrow Overlay (Desktop) */}
                        <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-blue-100 pointer-events-none transition-colors">
                            <ChevronRight className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen bg-white/50 space-y-6 pb-24">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[#0F2854]">My Tasks</h1>
                <p className="text-slate-500 text-sm">Your assigned events and daily responsibilities.</p>
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
                            {todayTasks.map((item, i) => (
                                <TaskCard key={`${item.event.id}_today_${i}`} data={item} />
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
                            {upcomingTasks.map((item, i) => (
                                <TaskCard key={`${item.event.id}_up_${i}`} data={item} />
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
                            {pastTasks.map((item, i) => (
                                <TaskCard key={`${item.event.id}_past_${i}`} data={item} />
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