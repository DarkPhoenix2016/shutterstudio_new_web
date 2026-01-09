"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, createEvent, EventData } from "@/lib/event-service"
import { useMediaQuery } from "@/hooks/use-media-query" // Custom hook
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

// UI Components
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

// Icons & Utils
import { Plus, Calendar as CalendarIcon, MapPin, Users, Search, Loader2, Package } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

export default function EventsPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    if (userData?.studioID) {
      loadData()
    }
  }, [userData])

  const loadData = async () => {
    try {
      const data = await fetchEvents(userData!.studioID!)
      setEvents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(e => 
    e.eventName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Inquiry': return 'bg-blue-100 text-blue-700'
      case 'Scheduled': return 'bg-purple-100 text-purple-700'
      case 'Completed': return 'bg-green-100 text-green-700'
      case 'Cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F2854]">Events</h1>
          <p className="text-muted-foreground">Manage inquiries, bookings, and schedules.</p>
        </div>
        <div className="flex gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search events..." 
                    className="pl-9 w-[200px] md:w-[300px]" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button className="bg-[#1C4D8D]" onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Event
            </Button>
        </div>
      </div>

      {/* EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEvents.map((event) => (
            <Card 
                key={event.id} 
                className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group overflow-hidden"
                onClick={() => router.push(`/app/events/${event.id}`)}
            >
                {/* Event Image / Placeholder */}
                <div className="h-32 bg-slate-100 relative">
                    {event.couplePhotoUrl ? (
                        <img src={event.couplePhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <CalendarIcon className="h-10 w-10" />
                        </div>
                    )}
                    <Badge className={cn("absolute top-2 right-2", getStatusColor(event.status))}>
                        {event.status}
                    </Badge>
                </div>
                
                <CardContent className="p-4 space-y-3">
                    <div>
                        <div className="text-xs text-slate-500 font-mono mb-1">{event.id?.substring(0,8).toUpperCase()}</div>
                        <h3 className="font-bold text-[#0F2854] text-lg leading-tight group-hover:text-[#1C4D8D] transition-colors">{event.eventName}</h3>
                        <p className="text-sm text-slate-500">{event.eventType}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                            {event.dates[0] ? format(event.dates[0].date, 'MMM dd, yyyy') : 'Date TBD'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {event.dates[0]?.location || "Location TBD"}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex justify-between items-center text-xs text-slate-500 h-9">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3"/> {event.assignedCrew?.length || 0}</span>
                    <span className="flex items-center gap-1"><Package className="h-3 w-3"/> {event.assignedEquipment?.length || 0}</span>
                </CardFooter>
            </Card>
        ))}
      </div>

      {/* CREATE EVENT FORM (Responsive Wrapper) */}
      {isDesktop ? (
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetContent className="w-[600px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>New Event</SheetTitle>
                    <SheetDescription>Create a new inquiry or schedule an event.</SheetDescription>
                </SheetHeader>
                <EventForm onSuccess={() => { setIsFormOpen(false); loadData(); }} onCancel={() => setIsFormOpen(false)} />
            </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerContent className="h-[90vh]">
                <DrawerHeader className="text-left">
                    <DrawerTitle>New Event</DrawerTitle>
                    <DrawerDescription>Create a new inquiry or schedule an event.</DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="h-full px-4">
                    <EventForm onSuccess={() => { setIsFormOpen(false); loadData(); }} onCancel={() => setIsFormOpen(false)} />
                </ScrollArea>
            </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}

// --- SUB-COMPONENT: EVENT FORM ---
function EventForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
    const { userData } = useAuth()
    const [submitting, setSubmitting] = useState(false)
    
    // Form Data
    const [formData, setFormData] = useState<Partial<EventData>>({
        customerName: "", customerMobile: "", customerEmail: "",
        eventName: "", eventType: "Wedding", status: "Inquiry",
        dates: [{ date: new Date(), location: "", type: "Main Event" }],
        packageId: "", budget: 0,
        assignedCrew: [], assignedEquipment: []
    })

    const handleSubmit = async () => {
        if(!userData?.studioID) return;
        if(!formData.eventName || !formData.customerName) return Swal.fire({ icon: 'warning', title: 'Missing required fields' });

        setSubmitting(true)
        try {
            await createEvent(userData.studioID, {
                ...formData,
                inquiryDate: new Date(),
                advancePaid: 0
            } as EventData)
            Swal.fire({ icon: 'success', title: 'Event Created', timer: 1500, showConfirmButton: false })
            onSuccess()
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Failed to create' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 py-4 pb-20 md:pb-4">
            
            {/* Step 1: Customer */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-1">Customer Details</h3>
                <div className="space-y-3">
                    <div>
                        <Label>Customer Name <span className="text-red-500">*</span></Label>
                        <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Mobile</Label>
                            <Input value={formData.customerMobile} onChange={e => setFormData({...formData, customerMobile: e.target.value})} />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Event Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-1">Event Details</h3>
                <div className="space-y-3">
                    <div>
                        <Label>Event Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="e.g. Rajitha & Randini Wedding" value={formData.eventName} onChange={e => setFormData({...formData, eventName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Type</Label>
                            <Select value={formData.eventType} onValueChange={v => setFormData({...formData, eventType: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Wedding">Wedding</SelectItem>
                                    <SelectItem value="Homecoming">Homecoming</SelectItem>
                                    <SelectItem value="Preshoot">Preshoot</SelectItem>
                                    <SelectItem value="Birthday">Birthday</SelectItem>
                                    <SelectItem value="Corporate">Corporate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v:any) => setFormData({...formData, status: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Inquiry">Inquiry</SelectItem>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <Label>Primary Date</Label>
                        <div className="border rounded-md p-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.dates?.[0].date ? format(formData.dates[0].date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.dates?.[0].date}
                                        onSelect={(date) => {
                                            if(date) {
                                                const newDates = [...(formData.dates || [])];
                                                newDates[0] = { ...newDates[0], date };
                                                setFormData({ ...formData, dates: newDates })
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3: Package & Budget */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-1">Package & Budget</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Package</Label>
                        <Select value={formData.packageId} onValueChange={v => setFormData({...formData, packageId: v})}>
                            <SelectTrigger><SelectValue placeholder="Select Package" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="custom">Custom Package</SelectItem>
                                <SelectItem value="gold">Gold Package</SelectItem>
                                <SelectItem value="platinum">Platinum Package</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Total Budget (LKR)</Label>
                        <Input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                    </div>
                </div>
                <div>
                    <Label>Additional Notes</Label>
                    <Textarea placeholder="Specific requirements..." onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button className="bg-[#1C4D8D] flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin h-4 w-4"/> : "Submit Event"}
                </Button>
            </div>
        </div>
    )
}