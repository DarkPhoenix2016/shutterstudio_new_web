"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { 
    fetchEvents, createEvent, updateEvent, deleteEvent, 
    fetchStudioSettingsList, fetchPackagesList, fetchPackageConfig,
    EventData, EventDayConfig, CustomItem, PackageData, PackageConfigParameter 
} from "@/lib/event-service"
import { validateSubscriptionAction } from "@/services/subscription-service"
import { useMediaQuery } from "@/hooks/use-media-query"

// UI
import { Card, CardContent } from "@/components/ui/card"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Icons
import { Plus, Calendar as CalendarIcon, Search, Loader2, AlertCircle, Trash, MoreVertical, Edit, Check, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

const DEFAULT_TYPES = ["Wedding", "Homecoming", "Preshoot", "Engagement", "Birthday", "Corporate", "Other"];
const DEFAULT_STATUSES = ["Inquiry", "Tentative", "Confirmed", "Completed", "Cancelled"];

export default function EventsPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null) 
  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    if (userData?.studioID) {
      loadData()
    }
  }, [userData])

  const loadData = async () => {
    try {
      if (userData?.studioID) {
        const data = await fetchEvents(userData.studioID)
        setEvents(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(e => 
    e.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.displayId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('inquiry')) return 'bg-blue-100 text-blue-700'
    if (s.includes('confirm') || s.includes('scheduled')) return 'bg-purple-100 text-purple-700'
    if (s.includes('complet')) return 'bg-green-100 text-green-700'
    if (s.includes('cancel')) return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-700'
  }

  const handleAddNew = () => {
      setEditingEvent(null);
      setIsFormOpen(true);
  }

  const handleEdit = (e: React.MouseEvent, event: EventData) => {
      e.stopPropagation();
      setEditingEvent(event);
      setIsFormOpen(true);
  }

  const handleDelete = async (e: React.MouseEvent, event: EventData) => {
      e.stopPropagation();
      if (!userData?.studioID || !event.id) return;

      const result = await Swal.fire({
          title: 'Delete Event?',
          text: `Are you sure you want to delete ${event.displayId || event.eventName}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
          try {
              await deleteEvent(userData.studioID, event.id);
              Swal.fire('Deleted!', 'Event has been removed.', 'success');
              loadData();
          } catch (error) {
              Swal.fire('Error', 'Failed to delete event.', 'error');
          }
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
                <Input placeholder="Search events..." className="pl-9 w-[200px] md:w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button className="bg-[#1C4D8D]" onClick={handleAddNew}>
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
                        
                        <div className="absolute top-2 left-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-sm" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={(e) => handleEdit(e, event)}>
                                        <Edit className="mr-2 h-4 w-4 text-blue-600" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => handleDelete(e, event)} className="text-red-600 focus:text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> Delete Event
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    
                    <CardContent className="p-4 space-y-3 flex-1">
                        <div>
                            <div className="text-xs text-slate-500 font-mono mb-1 flex justify-between">
                                <span>{event.displayId || event.id?.substring(0,8).toUpperCase()}</span>
                            </div>
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

      {/* CREATE/EDIT EVENT FORM */}
      {isDesktop ? (
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetContent className="w-full sm:max-w-[800px] p-0 flex flex-col h-full border-l shadow-2xl">
                <SheetHeader className="px-6 py-4 border-b bg-white shrink-0">
                    <SheetTitle>{editingEvent ? "Edit Event" : "New Event"}</SheetTitle>
                    <SheetDescription>{editingEvent ? "Update event details and budget." : "Create a new inquiry or schedule an event."}</SheetDescription>
                </SheetHeader>
                <EventForm 
                    initialData={editingEvent}
                    onSuccess={() => { setIsFormOpen(false); loadData(); }} 
                    onCancel={() => setIsFormOpen(false)} 
                />
            </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerContent className="h-[95vh] flex flex-col p-0 rounded-t-xl">
                <DrawerHeader className="px-6 py-4 border-b bg-white text-left shrink-0">
                    <DrawerTitle>{editingEvent ? "Edit Event" : "New Event"}</DrawerTitle>
                    <DrawerDescription>{editingEvent ? "Update event details and budget." : "Create a new inquiry or schedule an event."}</DrawerDescription>
                </DrawerHeader>
                <EventForm 
                    initialData={editingEvent}
                    onSuccess={() => { setIsFormOpen(false); loadData(); }} 
                    onCancel={() => setIsFormOpen(false)} 
                />
            </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}

function EventForm({ initialData, onSuccess, onCancel }: { initialData?: EventData | null, onSuccess: () => void, onCancel: () => void }) {
    const { userData } = useAuth()
    const [submitting, setSubmitting] = useState(false)
    const [loaded, setLoaded] = useState(false)

    // Lists
    const [typeList, setTypeList] = useState<string[]>(DEFAULT_TYPES)
    const [statusList, setStatusList] = useState<string[]>(DEFAULT_STATUSES)
    // [!code highlight] Updated Type: PackageData[]
    const [packages, setPackages] = useState<PackageData[]>([])
    // [!code highlight] Updated Type: PackageConfigParameter[]
    const [configParams, setConfigParams] = useState<PackageConfigParameter[]>([])

    // Form Data
    const [formData, setFormData] = useState<Partial<EventData>>({
        customerName: "", customerMobile: "", customerEmail: "",
        eventName: "", eventType: "", status: "Inquiry",
        dayCount: 1,
        days: [{ date: new Date(), type: 'package', cost: 0, customItems: [] }],
        discountType: 'fixed',
        discount: 0,
        notes: ""
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                days: initialData.days.map(d => ({ ...d, date: d.date instanceof Date ? d.date : new Date() }))
            })
        }
    }, [initialData])

    useEffect(() => {
        const init = async () => {
            if(!userData?.studioID) return;
            try {
                const [types, statuses, pkgs, params] = await Promise.all([
                    fetchStudioSettingsList(userData.studioID, 'EVENT_TYPES'),
                    fetchStudioSettingsList(userData.studioID, 'EVENT_STATUS'),
                    fetchPackagesList(userData.studioID),
                    fetchPackageConfig(userData.studioID)
                ]);
                
                if(types.length) setTypeList(types);
                if(statuses.length) setStatusList(statuses);
                setPackages(pkgs as PackageData[]);
                setConfigParams(params as PackageConfigParameter[]);
            } catch(e) { console.error(e) }
            setLoaded(true)
        }
        init()
    }, [userData])

    // Financial Calculation
    const financials = useMemo(() => {
        const total = (formData.days || []).reduce((acc: number, day: EventDayConfig) => acc + (day.cost || 0), 0);
        let discountAmount = 0;
        
        if (formData.discountType === 'percentage') {
            discountAmount = total * ((formData.discount || 0) / 100);
        } else {
            discountAmount = Number(formData.discount || 0);
        }

        const subTotal = Math.max(0, total - discountAmount);
        return { total, discountAmount, subTotal };
    }, [formData.days, formData.discount, formData.discountType])

    // Handlers
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
            updatedDay.cost = updates.customItems.reduce((sum: number, item: CustomItem) => sum + (item.price || 0), 0);
        }
        newDays[index] = updatedDay;
        setFormData({ ...formData, days: newDays });
    }

    const addCustomItem = (dayIndex: number, param?: PackageConfigParameter) => {
        const day = formData.days![dayIndex];
        const newItem: CustomItem = param 
            ? { name: param.name, quantity: 1, unit: param.unit || "", price: param.defaultPrice || 0 }
            : { name: "", quantity: 1, unit: "", price: 0 };

        const newItems = [...(day.customItems || []), newItem];
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
        const newItems = (day.customItems || []).filter((_: CustomItem, i: number) => i !== itemIndex);
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const handleSubmit = async () => {
        if(!userData?.studioID) return;
        if(!formData.eventName || !formData.customerName) return Swal.fire({ icon: 'warning', title: 'Missing Name fields' });

        setSubmitting(true);
        
        if (!initialData) {
            const limitCheck = await validateSubscriptionAction(userData.studioID, 'create_event');
            if (!limitCheck.allowed) {
                setSubmitting(false);
                return Swal.fire({ icon: 'error', title: 'Limit Reached', text: limitCheck.message });
            }
        }

        try {
            const eventPayload = {
                ...formData,
                totalBudget: financials.total,
                finalBudget: financials.subTotal,
            } as EventData;

            if (initialData && initialData.id) {
                await updateEvent(userData.studioID, initialData.id, eventPayload);
                Swal.fire({ icon: 'success', title: 'Event Updated', timer: 1500, showConfirmButton: false });
            } else {
                eventPayload.inquiryDate = new Date();
                eventPayload.advancePaid = 0;
                eventPayload.assignedCrew = [];
                eventPayload.assignedEquipment = [];
                await createEvent(userData.studioID, eventPayload);
                Swal.fire({ icon: 'success', title: 'Event Created', timer: 1500, showConfirmButton: false });
            }
            
            onSuccess();
        } catch (e) {
            Swal.fire({ icon: 'error', title: initialData ? 'Failed to update' : 'Failed to create' });
        } finally {
            setSubmitting(false);
        }
    }

    if (!loaded) return <div className="p-8 text-center text-slate-400">Loading configurations...</div>

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* 1. CUSTOMER & META */}
                <div className="space-y-4">
                    <div className="space-y-3">
                        <Input placeholder="Event Name *" value={formData.eventName} onChange={e => setFormData({...formData, eventName: e.target.value})} className="bg-slate-50 font-medium" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 uppercase tracking-wide">Event Type</Label>
                                <Select value={formData.eventType} onValueChange={v => setFormData({...formData, eventType: v})}>
                                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select..."/></SelectTrigger>
                                    <SelectContent>{typeList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 uppercase tracking-wide">Status</Label>
                                <Select value={formData.status} onValueChange={(v:any) => setFormData({...formData, status: v})}>
                                    <SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger>
                                    <SelectContent>{statusList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
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
                            {formData.days?.map((_: EventDayConfig, i: number) => (
                                <TabsTrigger key={i} value={`day-${i}`} className="px-4 py-1.5 text-xs">Day {i + 1}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {formData.days?.map((day: EventDayConfig, i: number) => (
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
                                        
                                        {/* [!code highlight] Package Features & Details */}
                                        {day.packageId && (() => {
                                            const pkg = packages.find(p => p.id === day.packageId);
                                            if (!pkg) return null;
                                            return (
                                                <div className="border rounded-md p-3 bg-white space-y-2 text-sm shadow-sm">
                                                    <div className="flex justify-between font-bold text-slate-800 pb-2 border-b mb-2">
                                                        <span>Price</span>
                                                        <span>LKR {Number(pkg.price).toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {pkg.featuresList && pkg.featuresList.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                            {pkg.featuresList.map((f, idx) => (
                                                                <div key={idx} className="flex items-center text-slate-600 text-xs">
                                                                    <Check className="h-3 w-3 text-green-500 mr-2" />
                                                                    <span>{f}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 italic">No features listed.</p>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </TabsContent>

                                    <TabsContent value="custom" className="pt-2 space-y-3">
                                        <div className="space-y-2">
                                            {day.customItems?.map((item: CustomItem, itemIdx: number) => (
                                                <div key={itemIdx} className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-5">
                                                        <Input 
                                                            placeholder="Item" className="h-8 text-xs" 
                                                            value={item.name}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'name', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input 
                                                            type="number" placeholder="Qty" className="h-8 text-xs text-center"
                                                            value={item.quantity}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'quantity', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <Input 
                                                            type="number" placeholder="Price" className="h-8 text-xs text-right"
                                                            value={item.price}
                                                            onChange={(e) => updateCustomItem(i, itemIdx, 'price', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeCustomItem(i, itemIdx)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add Parameter Dropdown */}
                                            <div className="flex gap-2">
                                                <Select onValueChange={(val) => {
                                                    if (val === 'custom_new') {
                                                        addCustomItem(i);
                                                    } else {
                                                        const param = configParams.find(p => p.name === val);
                                                        addCustomItem(i, param);
                                                    }
                                                }}>
                                                    <SelectTrigger className="h-8 text-xs bg-slate-50 border-dashed w-full text-left justify-start px-3 text-slate-500 hover:text-slate-800">
                                                        <span className="flex items-center"><Plus className="h-3 w-3 mr-2"/> Add Parameter</span>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {configParams.map((p, idx) => (
                                                            <SelectItem key={idx} value={p.name}>{p.name} {p.unit ? `(${p.unit})` : ''}</SelectItem>
                                                        ))}
                                                        <Separator className="my-1"/>
                                                        <SelectItem value="custom_new">Other (Custom)...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
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

            <div className="p-4 border-t bg-white flex gap-3 shrink-0 mt-auto">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button className="bg-[#1C4D8D] flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : (initialData ? "Save Changes" : "Create Event")}
                </Button>
            </div>
        </div>
    )
}