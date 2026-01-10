"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchCrewMembers, Member } from "@/services/crew-service"
import { fetchEvents, EventData } from "@/services/event-service" // Import fetchEvents
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog" // Dialog components
import { Calendar } from "@/components/ui/calendar" // Shadcn Calendar
import { Badge } from "@/components/ui/badge"
import { 
    Phone, MessageCircle, Mail, Loader2, Users, UserCheck, UserX, Search, 
    CalendarDays, MapPin, Clock, ChevronRight 
} from "lucide-react"
import { format, isSameDay } from "date-fns"

export default function StudioOverviewPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<EventData[]>([]) // Store events
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 })
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date()) // Selected calendar date
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
        if (!userData?.studioID) return;

        try {
            // Fetch Members and Events in parallel
            const [fetchedUsers, fetchedEvents] = await Promise.all([
                fetchCrewMembers(userData.studioID),
                fetchEvents(userData.studioID)
            ]);
            
            // Set Members Data
            setMembers(fetchedUsers);
            const activeCount = fetchedUsers.filter(u => !(u.disabled || u.accountDisabled || u.status === "Disabled")).length;
            setStats({
                total: fetchedUsers.length,
                active: activeCount,
                disabled: fetchedUsers.length - activeCount
            });

            // Set Events Data
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

  // --- CALENDAR LOGIC ---
  
  // 1. Get all dates that have events for the calendar indicators
  const eventDates = events.flatMap(event => 
    event.days?.map(day => new Date(day.date)) || []
  );

  // 2. Filter events for the specifically selected date
  const selectedDateEvents = events.filter(event => 
    event.days?.some(day => date && isSameDay(new Date(day.date), date))
  );

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="space-y-6 p-6">
      
      {/* HEADER WITH SCHEDULE ACTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#1C4D8D] hover:bg-[#153a6a]">
                    <CalendarDays className="mr-2 h-4 w-4" /> View Schedule
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Event Schedule</DialogTitle>
                </DialogHeader>
                
                <div className="flex flex-col md:flex-row gap-6 h-full overflow-auto p-2">
                    {/* LEFT: CALENDAR */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            modifiers={{
                                booked: eventDates // Highlight days with events
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: 'bold', textDecoration: 'underline', color: '#1C4D8D' }
                            }}
                        />
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border text-sm text-slate-500">
                            <p className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#1C4D8D]"></span> 
                                Indicates days with scheduled events
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: EVENT LIST */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        <h3 className="font-semibold text-lg border-b pb-2">
                            Events for {date ? format(date, "MMMM do, yyyy") : "Select a date"}
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[400px]">
                            {selectedDateEvents.length > 0 ? (
                                selectedDateEvents.map(evt => {
                                    // Find specific time/details for this day
                                    const dayConfig = evt.days.find(d => date && isSameDay(new Date(d.date), date));
                                    
                                    return (
                                        <div 
                                            key={evt.id} 
                                            className="group flex flex-col p-3 rounded-lg border bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => router.push(`/app/events/${evt.id}`)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-700">{evt.eventName}</h4>
                                                    <Badge variant="secondary" className="text-[10px] mt-1">{evt.eventType}</Badge>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <UserCheck className="h-3 w-3" />
                                                    <span>{evt.customerName}</span>
                                                </div>
                                                {/* If location exists for this specific day (complex mapping, simpler to show primary loc) */}
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="truncate">{evt.locations?.[0]?.name || "Location TBD"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <CalendarDays className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No events scheduled for this day.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>

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