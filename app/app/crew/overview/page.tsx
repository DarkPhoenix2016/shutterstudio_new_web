"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchCrewMembers, Member } from "@/services/crew-service"
import { fetchEvents, EventData } from "@/services/event-service" 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog" 
import { Calendar } from "@/components/ui/calendar" 
import { Badge } from "@/components/ui/badge"
import { 
    Phone, MessageCircle, Mail, Loader2, Users, UserCheck, UserX, Search, 
    CalendarDays, MapPin, ChevronRight, Briefcase 
} from "lucide-react"
import { format, isSameDay } from "date-fns"

export default function StudioOverviewPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<EventData[]>([]) 
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 })
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date()) 
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null) // Track specific user for schedule

  useEffect(() => {
    const fetchData = async () => {
        if (!userData?.studioID) return;

        try {
            const [fetchedUsers, fetchedEvents] = await Promise.all([
                fetchCrewMembers(userData.studioID),
                fetchEvents(userData.studioID)
            ]);
            
            setMembers(fetchedUsers);
            const activeCount = fetchedUsers.filter(u => !(u.disabled || u.accountDisabled || u.status === "Disabled")).length;
            setStats({
                total: fetchedUsers.length,
                active: activeCount,
                disabled: fetchedUsers.length - activeCount
            });

            setEvents(fetchedEvents);

        } catch (error) {
            console.error("Error fetching overview data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [userData]);

  const filteredMembers = members.filter(member => 
      member.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phoneNumber?.includes(searchQuery)
  );

  const formatRole = (role?: string) => role ? role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Staff";

  // --- CALENDAR LOGIC (User Specific) ---
  
  // 1. Filter events based on whether a specific member is selected
  const visibleEvents = useMemo(() => {
      if (!selectedMember) return events; // Show all if no user selected
      return events.filter(e => e.assignedCrew?.includes(selectedMember.id));
  }, [events, selectedMember]);

  // 2. Get dates for the calendar indicators (using the filtered list)
  const eventDates = useMemo(() => {
      return visibleEvents.flatMap(event => 
        event.days?.map(day => new Date(day.date)) || []
      );
  }, [visibleEvents]);

  // 3. Get events for the currently selected DATE in the calendar
  const selectedDateEvents = visibleEvents.filter(event => 
    event.days?.some(day => date && isSameDay(new Date(day.date), date))
  );

  const handleOpenSchedule = (member?: Member) => {
      setSelectedMember(member || null);
      setDate(new Date()); // Reset to today
      setIsScheduleOpen(true);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="space-y-6 p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        
        {/* GLOBAL SCHEDULE BUTTON */}
        <Button onClick={() => handleOpenSchedule()} className="bg-[#1C4D8D] hover:bg-[#153a6a] px-6">
            <CalendarDays className="mr-2 h-4 w-4" /> View Full Schedule
        </Button>
      </div>

      {/* SCHEDULE DIALOG (Reused for Global & User) */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
                <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">
                                {selectedMember ? `${selectedMember.displayName}'s Schedule` : "Studio Master Schedule"}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-normal">
                                {selectedMember ? "Events assigned to this crew member" : "All events across the studio"}
                            </p>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="flex flex-col md:flex-row h-full min-h-0">
                    
                    {/* LEFT: CALENDAR (Fixed Width) */}
                    <div className="p-6 border-r flex flex-col items-center bg-white md:w-[380px] overflow-y-auto">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border shadow-sm p-4"
                            modifiers={{
                                booked: eventDates // Highlight days
                            }}
                            modifiersStyles={{
                                booked: { 
                                    fontWeight: 'bold', 
                                    color: '#1C4D8D',
                                    position: 'relative',
                                }
                            }}
                            // Custom day renderer to add dots (optional enhancement, basic bolding is usually safer for compat)
                        />
                        
                        <div className="mt-6 w-full space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legend</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#1C4D8D]"></span> 
                                <span>Scheduled Event</span>
                            </div>
                            {/* Example of another status if needed */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> 
                                <span>Empty / Available</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: EVENT LIST (Flexible) */}
                    <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
                        <div className="p-6 border-b bg-white flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                {date ? format(date, "EEEE, MMMM do") : "Select a date"}
                                <Badge variant="secondary" className="ml-2 font-normal">
                                    {selectedDateEvents.length} Events
                                </Badge>
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {selectedDateEvents.length > 0 ? (
                                selectedDateEvents.map(evt => {
                                    // Identify active location for this specific day
                                    const dayInfo = evt.days.find(d => date && isSameDay(new Date(d.date), date));
                                    // Heuristic: Find a location matching this day, or fallback to first location
                                    const dayLoc = evt.locations?.find(l => date && isSameDay(new Date(l.date), date)) || evt.locations?.[0];

                                    return (
                                        <div 
                                            key={evt.id} 
                                            className="group relative flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
                                            onClick={() => router.push(`/app/events/${evt.id}`)}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 group-hover:w-1.5 transition-all"></div>
                                            <div className="p-4 pl-5">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 text-[10px] uppercase">{evt.eventType}</Badge>
                                                            {evt.status === "Shooting" && <Badge className="bg-red-100 text-red-600 animate-pulse border-0 text-[10px]">Live</Badge>}
                                                        </div>
                                                        <h4 className="font-bold text-lg text-slate-800">{evt.eventName}</h4>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-50">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <UserCheck className="h-4 w-4 text-slate-400" />
                                                        <span className="font-medium">{evt.customerName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        <span className="truncate">{dayLoc?.name || "Location TBD"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-10">
                                    <div className="bg-slate-100 p-4 rounded-full mb-3">
                                        <Briefcase className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-600">No events scheduled</p>
                                    <p className="text-sm">Enjoy the free time!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered studio members</p>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disabled Users</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.disabled}</div>
                <p className="text-xs text-muted-foreground">Access revoked</p>
            </CardContent>
        </Card>
      </div>

      {/* QUICK ACCESS TABLE */}
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Quick Access</CardTitle>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Find member..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {filteredMembers.slice(0, 8).map((member) => (
                <div key={member.id} className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 last:border-0 last:pb-0 gap-4">
                    
                    <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-8">
                            <div className="min-w-[150px]">
                                <p className="font-medium leading-none">{member.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {member.designation || formatRole(member.role)}
                                </p>
                            </div>

                            <div className="text-sm text-gray-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-gray-400"/> 
                                    <span>{member.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-gray-400"/> 
                                    <span>{member.phoneNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        {/* USER SPECIFIC SCHEDULE BUTTON */}
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                            onClick={() => handleOpenSchedule(member)}
                            title="View Schedule"
                        >
                            <CalendarDays className="h-4 w-4" />
                        </Button>

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        <Button variant="outline" size="icon" onClick={() => window.location.href = `mailto:${member.email}`}>
                            <Mail className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.open(`tel:${member.phoneNumber}`)}>
                            <Phone className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.open(`sms:${member.phoneNumber}`)}>
                            <MessageCircle className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => window.open(`https://wa.me/${member.phoneNumber?.replace('+', '')}`, '_blank')}
                            title="WhatsApp"
                        >
                            <span className="font-bold text-green-600 text-xs">WA</span> 
                        </Button>
                    </div>
                </div>
             ))}
             {filteredMembers.length === 0 && <p className="text-center text-muted-foreground py-8">No members found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}