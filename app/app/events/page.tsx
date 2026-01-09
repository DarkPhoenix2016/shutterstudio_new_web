"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { 
    fetchEvents, createEvent, fetchStudioSettingsList, fetchPackagesList, 
    EventData, EventDayConfig, CustomItem 
} from "@/lib/event-service"
import { useMediaQuery } from "@/hooks/use-media-query"

// UI
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// Icons
import { Plus, Calendar as CalendarIcon, MapPin, Users, Search, Loader2, Package, AlertCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// Defaults
const DEFAULT_TYPES = ["Wedding", "Homecoming", "Preshoot", "Engagement", "Birthday", "Corporate", "Other"];
const DEFAULT_STATUSES = ["Inquiry", "Tentative", "Confirmed", "Completed", "Cancelled"];

export default function EventsPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
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
    e.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('inquiry')) return 'bg-blue-100 text-blue-700'
    if (s.includes('confirm') || s.includes('scheduled')) return 'bg-purple-100 text-purple-700'
    if (s.includes('complet')) return 'bg-green-100 text-green-700'
    if (s.includes('cancel')) return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-700'
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
                <Input placeholder="Search events..." className="pl-9 w-[200px] md:w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button className="bg-[#1C4D8D]" onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Event
            </Button>
        </div>
      </div>

      {/* EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEvents.map((event) => {
            const isIncomplete = (!event.assignedCrew?.length || !event.assignedEquipment?.length) && event.status !== 'Inquiry';
            
            return (
                <Card 
                    key={event.id} 
                    className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group overflow-hidden flex flex-col"
                    onClick={() => router.push(`/app/events/${event.id}`)}
                >
                    <div className="h-32 bg-slate-100 relative">
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <CalendarIcon className="h-10 w-10" />
                        </div>
                        <Badge className={cn("absolute top-2 right-2", getStatusColor(event.status))}>
                            {event.status}
                        </Badge>
                    </div>
                    
                    <CardContent className="p-4 space-y-3 flex-1">
                        <div>
                            <div className="text-xs text-slate-500 font-mono mb-1">{event.id?.substring(0,8).toUpperCase()}</div>
                            <h3 className="font-bold text-[#0F2854] text-lg leading-tight group-hover:text-[#1C4D8D] transition-colors line-clamp-1">{event.eventName}</h3>
                            <p className="text-sm text-slate-500">{event.eventType}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                                {event.days?.[0]?.date ? format(event.days[0].date instanceof Date ? event.days[0].date : new Date(), 'MMM dd, yyyy') : 'Date TBD'}
                                {event.dayCount > 1 && <Badge variant="secondary" className="text-[10px] h-4 px-1">+{event.dayCount - 1} days</Badge>}
                            </div>
                        </div>
                        
                        {isIncomplete && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                <AlertCircle className="h-3 w-3" /> Setup Incomplete
                            </div>
                        )}
                    </CardContent>
                </Card>
            )
        })}
      </div>

      {/* CREATE EVENT FORM (Responsive Wrapper) */}
      {isDesktop ? (
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            {/* [!code highlight] Increased width to 800px */}
            <SheetContent className="w-full sm:max-w-[800px] p-0 flex flex-col h-full border-l shadow-2xl">
                <SheetHeader className="px-6 py-4 border-b bg-white shrink-0">
                    <SheetTitle>New Event</SheetTitle>
                    <SheetDescription>Create a new inquiry or schedule an event.</SheetDescription>
                </SheetHeader>
                <EventForm onSuccess={() => { setIsFormOpen(false); loadData(); }} onCancel={() => setIsFormOpen(false)} />
            </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerContent className="h-[95vh] flex flex-col p-0 rounded-t-xl">
                <DrawerHeader className="px-6 py-4 border-b bg-white text-left shrink-0">
                    <DrawerTitle>New Event</DrawerTitle>
                    <DrawerDescription>Create a new inquiry or schedule an event.</DrawerDescription>
                </DrawerHeader>
                <EventForm onSuccess={() => { setIsFormOpen(false); loadData(); }} onCancel={() => setIsFormOpen(false)} />
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
    const [loaded, setLoaded] = useState(false)

    // Dynamic Lists
    const [typeList, setTypeList] = useState<string[]>(DEFAULT_TYPES)
    const [statusList, setStatusList] = useState<string[]>(DEFAULT_STATUSES)
    const [packages, setPackages] = useState<any[]>([])

    // Form Data
    const [formData, setFormData] = useState<Partial<EventData>>({
        customerName: "", customerMobile: "", customerEmail: "",
        eventName: "", eventType: "", status: "Inquiry",
        dayCount: 1,
        days: [{ date: new Date(), type: 'package', cost: 0, customItems: [] }],
        // [!code highlight] Discount defaults
        discountType: 'fixed',
        discount: 0,
        notes: ""
    })

    useEffect(() => {
        const init = async () => {
            if(!userData?.studioID) return;
            try {
                const [types, statuses, pkgs] = await Promise.all([
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES'),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_STATUS'),
                    fetchPackagesList(userData.studioID)
                ]);
                
                if(types.length) setTypeList(types);
                if(statuses.length) setStatusList(statuses);
                setPackages(pkgs);
            } catch(e) { console.error(e) }
            setLoaded(true)
        }
        init()
    }, [userData])

    // [!code highlight] Updated Financial Logic
    const financials = useMemo(() => {
        const total = (formData.days || []).reduce((acc, day) => acc + (day.cost || 0), 0);
        let discountAmount = 0;
        
        if (formData.discountType === 'percentage') {
            discountAmount = total * ((formData.discount || 0) / 100);
        } else {
            discountAmount = Number(formData.discount || 0);
        }

        const subTotal = Math.max(0, total - discountAmount);
        return { total, discountAmount, subTotal };
    }, [formData.days, formData.discount, formData.discountType])

    // --- DAY HANDLERS ---
    const handleDayCountChange = (count: number) => {
        const newCount = Math.max(1, count);
        const currentDays = [...(formData.days || [])];
        
        if (newCount > currentDays.length) {
            for(let i = currentDays.length; i < newCount; i++) {
                const prevDate = new Date(currentDays[i-1].date);
                prevDate.setDate(prevDate.getDate() + 1);
                currentDays.push({ date: prevDate, type: 'package', cost: 0, customItems: [] });
            }
        } else if (newCount < currentDays.length) {
            currentDays.length = newCount;
        }
        setFormData({ ...formData, dayCount: newCount, days: currentDays });
    }

    const updateDayConfig = (index: number, updates: Partial<EventDayConfig>) => {
        const newDays = [...(formData.days || [])];
        const updatedDay = { ...newDays[index], ...updates };
        
        if (updates.packageId && updatedDay.type === 'package') {
            const pkg = packages.find(p => p.id === updates.packageId);
            if (pkg) updatedDay.cost = Number(pkg.price || 0);
        }
        
        if (updates.customItems && updatedDay.type === 'custom') {
            updatedDay.cost = updates.customItems.reduce((sum, item) => sum + (item.price || 0), 0);
        }

        newDays[index] = updatedDay;
        setFormData({ ...formData, days: newDays });
    }

    // --- CUSTOM ITEM HANDLERS ---
    const addCustomItem = (dayIndex: number) => {
        const day = formData.days![dayIndex];
        const newItems = [...(day.customItems || []), { name: "", quantity: 1, unit: "", price: 0 }];
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const updateCustomItem = (dayIndex: number, itemIndex: number, field: keyof CustomItem, value: any) => {
        const day = formData.days![dayIndex];
        const newItems = [...(day.customItems || [])];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const removeCustomItem = (dayIndex: number, itemIndex: number) => {
        const day = formData.days![dayIndex];
        const newItems = (day.customItems || []).filter((_, i) => i !== itemIndex);
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const handleSubmit = async () => {
        if(!userData?.studioID) return;
        if(!formData.eventName || !formData.customerName) return Swal.fire({ icon: 'warning', title: 'Missing Name fields' });

        setSubmitting(true);
        try {
            await createEvent(userData.studioID, {
                ...formData,
                inquiryDate: new Date(),
                totalBudget: financials.total,
                finalBudget: financials.subTotal,
                advancePaid: 0,
                assignedCrew: [], 
                assignedEquipment: []
            } as EventData);
            
            Swal.fire({ icon: 'success', title: 'Event Created', timer: 1500, showConfirmButton: false });
            onSuccess();
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Failed to create' });
        } finally {
            setSubmitting(false);
        }
    }

    if (!loaded) return <div className="p-8 text-center text-slate-400">Loading configurations...</div>

    return (
        <div className="flex flex-col h-full overflow-hidden">
            
            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* 1. CUSTOMER & META */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Details</h3>
                    <div className="space-y-3">
                        <Input placeholder="Event Name *" value={formData.eventName} onChange={e => setFormData({...formData, eventName: e.target.value})} className="bg-slate-50 font-medium" />
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={formData.eventType} onValueChange={v => setFormData({...formData, eventType: v})}>
                                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Type"/></SelectTrigger>
                                <SelectContent>{typeList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={formData.status} onValueChange={(v:any) => setFormData({...formData, status: v})}>
                                <SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger>
                                <SelectContent>{statusList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="Customer Name *" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-slate-50" />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Mobile" value={formData.customerMobile} onChange={e => setFormData({...formData, customerMobile: e.target.value})} className="bg-slate-50" />
                            <Input placeholder="Email" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className="bg-slate-50" />
                        </div>
                    </div>
                </div>

                {/* 3. SCHEDULE & PRICING */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Packages</h3>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Days</Label>
                            <Input 
                                type="number" min="1" max="7" 
                                className="w-14 h-7 text-center bg-slate-50 text-xs" 
                                value={formData.dayCount} 
                                onChange={e => handleDayCountChange(Number(e.target.value))} 
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="day-0" className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100">
                            {formData.days?.map((_, i) => (
                                <TabsTrigger key={i} value={`day-${i}`} className="px-4 py-1.5 text-xs">Day {i + 1}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {formData.days?.map((day, i) => (
                            <TabsContent key={i} value={`day-${i}`} className="border rounded-md p-4 mt-2 space-y-4 bg-white">
                                <div className="space-y-1">
                                    <div className="border rounded-md p-2 bg-slate-50 flex items-center justify-between">
                                        <Label className="text-xs text-slate-500 ml-2">Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="h-6 text-sm font-normal">
                                                    {day.date ? format(day.date, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-2 h-3 w-3 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={day.date}
                                                    onSelect={(d) => d && updateDayConfig(i, { date: d })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <Tabs defaultValue={day.type} onValueChange={(v:any) => updateDayConfig(i, { type: v })} className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 h-8">
                                        <TabsTrigger value="package" className="text-xs">Package</TabsTrigger>
                                        <TabsTrigger value="custom" className="text-xs">Custom Plan</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="package" className="pt-2 space-y-3">
                                        <Select value={day.packageId} onValueChange={(v) => updateDayConfig(i, { packageId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                                            <SelectContent>
                                                {packages.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} - LKR {p.price.toLocaleString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 flex justify-between px-3">
                                            <span>Package Cost:</span>
                                            <span className="font-bold">LKR {(day.cost || 0).toLocaleString()}</span>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="custom" className="pt-2 space-y-3">
                                        <div className="space-y-2">
                                            {day.customItems?.map((item, itemIdx) => (
                                                <div key={itemIdx} className="grid grid-cols-10 gap-2 items-start">
                                                    <div className="col-span-4">
                                                        <Input 
                                                            placeholder="Item" className="h-8 text-xs" 
                                                            value={item.name}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'name', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input 
                                                            type="number" placeholder="Qty" className="h-8 text-xs"
                                                            value={item.quantity}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'quantity', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Input 
                                                            type="number" placeholder="Price" className="h-8 text-xs text-right"
                                                            value={item.price}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'price', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeCustomItem(i, itemIdx)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button variant="outline" size="sm" className="w-full text-xs border-dashed text-slate-500" onClick={() => addCustomItem(i)}>
                                                <Plus className="h-3 w-3 mr-1" /> Add Item
                                            </Button>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded text-xs text-slate-700 flex justify-between px-3 border">
                                            <span>Total Custom Cost:</span>
                                            <span className="font-bold">LKR {(day.cost || 0).toLocaleString()}</span>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </TabsContent>
                        ))}
                    </Tabs>

                    {/* [!code highlight] Updated Financial Summary with Discount Toggle */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3 border">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Budget</span>
                            <span className="font-semibold">LKR {financials.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Discount</span>
                            <div className="flex items-center gap-2">
                                <Select 
                                    value={formData.discountType} 
                                    onValueChange={(v:any) => setFormData({...formData, discountType: v})}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-xs bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">LKR</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input 
                                    type="number" 
                                    className="h-8 w-24 text-right bg-white text-sm" 
                                    placeholder="0" 
                                    value={formData.discount || ""} 
                                    onChange={e => setFormData({...formData, discount: Number(e.target.value)})} 
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 px-1">
                            <span></span>
                            <span>- LKR {financials.discountAmount.toLocaleString()}</span>
                        </div>
                        <Separator className="bg-slate-300"/>
                        <div className="flex justify-between text-base font-bold text-[#1C4D8D]">
                            <span>Final Budget</span>
                            <span>LKR {financials.subTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea placeholder="Specific requirements..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-slate-50" />
                </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="p-4 border-t bg-white flex gap-3 shrink-0 mt-auto">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button className="bg-[#1C4D8D] flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : "Create Event"}
                </Button>
            </div>
        </div>
    )
}