"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useParams, useRouter } from "next/navigation"
import { 
    fetchEventById, updateEvent, fetchStudioSettingsList, 
    checkResourceAvailability, EventData, AdditionalService, 
    fetchPackageConfig 
} from "@/services/event-service"
import { validateSubscriptionAction } from "@/services/subscription-service"
import { uploadFileToStorage } from "@/lib/storage-utils"
import { fetchInventory } from "@/services/inventory-service"
import { fetchCrewMembers } from "@/services/crew-service"

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
    Loader2, ArrowLeft, Save, Upload, MapPin, Phone, Mail, 
    Plus, Trash2, Camera, Lock, FileText, MessageSquare, 
    User, Calendar, CheckCircle
} from "lucide-react"
import { format } from "date-fns"
import Swal from "sweetalert2"

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000
})

export default function EventDetailPage() {
  const { id } = useParams()
  const { userData } = useAuth()
  const router = useRouter()
  
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Lists
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [crewList, setCrewList] = useState<any[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [serviceParams, setServiceParams] = useState<any[]>([])

  // Load Data
  useEffect(() => {
    const load = async () => {
      if (userData?.studioID && id) {
        const [evtData, methods, crew, equip, params] = await Promise.all([
            fetchEventById(userData.studioID, id as string),
            fetchStudioSettingsList(userData.studioID, 'payment_methods'),
            fetchCrewMembers(userData.studioID),
            fetchInventory(userData.studioID),
            fetchPackageConfig(userData.studioID)
        ])
        
        setEvent(evtData)
        setPaymentMethods(methods)
        setCrewList(crew)
        setEquipmentList(equip)
        setServiceParams(params)
        setLoading(false)
      }
    }
    load()
  }, [userData, id])

  // --- CALCULATIONS ---
  const financials = useMemo(() => {
    if (!event) return { 
        total: 0, 
        baseCost: 0, 
        servicesCost: 0, 
        discountAmount: 0, 
        finalBudget: 0, 
        paid: 0, 
        due: 0 
    };
    
    // 1. Base Cost (Days + Packages)
    const baseCost = event.days?.reduce((acc, day) => acc + (day.cost || 0), 0) || 0;
    
    // 2. Services Cost
    const servicesCost = event.additionalServices?.reduce((acc, s) => acc + (s.total || 0), 0) || 0;
    
    const totalBudget = baseCost + servicesCost;

    // 3. Discount
    let discountAmount = 0;
    if (event.discountType === 'percentage') {
        discountAmount = totalBudget * ((event.discount || 0) / 100);
    } else {
        discountAmount = Number(event.discount || 0);
    }

    const finalBudget = Math.max(0, totalBudget - discountAmount);
    
    // 4. Paid
    const paid = event.transactions
        ?.filter(t => t.type === 'income')
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;

    return { 
        total: totalBudget, 
        baseCost,
        servicesCost,
        discountAmount, 
        finalBudget, 
        paid, 
        due: finalBudget - paid 
    };
  }, [event]);

  // --- ACTIONS ---

  const handleUpdateEvent = async (updates: Partial<EventData>) => {
      if (!event || !userData?.studioID) return;
      
      // If confirmed, prevent editing critical fields in Overview (simple check)
      if (event.approval?.customer_confirmed && (updates.eventName || updates.days)) {
          Toast.fire({ icon: 'warning', title: 'Event is locked by customer approval.' });
          return;
      }

      setSaving(true);
      try {
          await updateEvent(userData.studioID, event.id!, updates);
          setEvent(prev => prev ? { ...prev, ...updates } : null);
          Toast.fire({ icon: 'success', title: 'Saved' });
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Save failed' });
      } finally {
          setSaving(false);
      }
  };

  const handleUploadImage = async (file: File, isCover: boolean) => {
      if (!event || !userData?.studioID) return;

      // Rule: Only upload gallery if status is Completed
      if (!isCover && event.status !== 'Completed') {
          return Swal.fire('Restricted', 'Gallery images can only be uploaded when event is Completed.', 'warning');
      }

      // Check Limit for Gallery
      if (!isCover) {
          const limitCheck = await validateSubscriptionAction(userData.studioID, 'check_photo_limit', (event.galleryUrls?.length || 0) + 1);
          if (!limitCheck.allowed) return Swal.fire('Limit Reached', limitCheck.message, 'error');
      }

      setSaving(true);
      try {
          // Path: Studios/[studioid]/Events/[event display id]/[filename]
          const fileName = isCover 
            ? 'cover' 
            : `${(event.galleryUrls?.length || 0) + 1}`;
          
          const path = `Studios/${userData.studioID}/Events/${event.displayId || event.id}/${fileName}`;
          const url = await uploadFileToStorage(path, file);

          if (isCover) {
              await handleUpdateEvent({ couplePhotoUrl: url });
          } else {
              const newGallery = [...(event.galleryUrls || []), url];
              await handleUpdateEvent({ galleryUrls: newGallery });
          }
      } catch (e) {
          console.error(e);
          Toast.fire({ icon: 'error', title: 'Upload failed' });
      } finally {
          setSaving(false);
      }
  };

  // --- SUB-HANDLERS FOR TABS ---
  
  const addArrayItem = async (field: keyof EventData, item: any) => {
      if (!event) return;
      const currentList = (event[field] as any[]) || [];
      await handleUpdateEvent({ [field]: [...currentList, item] });
  };

  const removeArrayItem = async (field: keyof EventData, id: string) => {
      if (!event) return;
      const currentList = (event[field] as any[]) || [];
      await handleUpdateEvent({ [field]: currentList.filter((x: any) => x.id !== id) });
  };

  const checkAndAssignResource = async (resourceId: string, type: 'crew' | 'equipment') => {
      if (!event || !userData?.studioID) return;
      
      let available = true;
      for (const day of event.days) {
          const isFree = await checkResourceAvailability(userData.studioID, day.date, resourceId, type);
          if (!isFree) {
              available = false;
              break;
          }
      }

      if (!available) {
          const proceed = await Swal.fire({
              title: 'Conflict Detected',
              text: 'This resource is busy on one of the event dates. Assign anyway?',
              icon: 'warning',
              showCancelButton: true
          });
          if (!proceed.isConfirmed) return;
      }

      if (type === 'crew') {
          const current = event.assignedCrew || [];
          if (!current.includes(resourceId)) await handleUpdateEvent({ assignedCrew: [...current, resourceId] });
      } else {
          const current = event.assignedEquipment || [];
          if (!current.includes(resourceId)) await handleUpdateEvent({ assignedEquipment: [...current, resourceId] });
      }
  };

  // Status mapping for the visual pills
  const statusOptions = ["Quotation", "Scheduled", "In Progress", "Post Production", "Review", "Completed", "Handed Over"];

  if (loading || !event) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  const isLocked = event.approval?.customer_confirmed;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in">
        
        {/* HEADER ACTIONS */}
        <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4 mr-2"/> Back to Calendar
            </Button>
            <div className="flex gap-2">
                <Button disabled={saving} onClick={() => handleUpdateEvent({})} className="bg-[#1C4D8D]">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4 mr-2"/> Save Changes</>}
                </Button>
            </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100 rounded-lg mb-6">
                <TabsTrigger value="overview" className="px-4 py-2">Overview</TabsTrigger>
                <TabsTrigger value="contacts" className="px-4 py-2">Contacts</TabsTrigger>
                <TabsTrigger value="services" className="px-4 py-2">Services</TabsTrigger>
                <TabsTrigger value="locations" className="px-4 py-2">Locations</TabsTrigger>
                <TabsTrigger value="resources" className="px-4 py-2">Resources</TabsTrigger>
                <TabsTrigger value="payments" className="px-4 py-2">Payments</TabsTrigger>
                <TabsTrigger value="expenses" className="px-4 py-2">Expenses</TabsTrigger>
            </TabsList>

            {/* --- 1. OVERVIEW TAB (UPDATED DESIGN) --- */}
            <TabsContent value="overview" className="bg-gray-50 min-h-screen font-sans text-slate-800 -mx-4 -mt-4 p-4 md:p-6 rounded-lg">
                <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
                    
                    {/* Top Hero: Image & Title */}
                    <div className="flex flex-col md:flex-row p-6 gap-6 border-b border-gray-100">
                        <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 relative group cursor-pointer">
                            <img 
                              src={event.couplePhotoUrl || "/api/placeholder/150/150"} 
                              alt="Couple" 
                              className="w-full h-full object-cover"
                            />
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                <Camera className="w-6 h-6"/>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], true)} />
                            </label>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            <span className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                              Event Type: {event.eventType}
                            </span>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-slate-900">{event.eventName}</h1>
                                {isLocked && <Lock className="w-5 h-5 text-green-600" title="Confirmed"/>}
                            </div>
                            <p className="text-slate-500">{event.days.length > 0 ? format(new Date(event.days[0].date), 'PPP') : 'Date TBD'}</p>
                        </div>
                    </div>

                    {/* Invoice Banner */}
                    <div className="bg-green-50 px-6 py-3 border-y border-green-100 flex items-center gap-2 text-green-700 text-sm font-medium">
                        <FileText size={16} />
                        <span>Invoice Number: {event.displayId}</span>
                    </div>

                    {/* --- EVENT ACTIONS & APPROVAL STATE --- */}
                    <div className="p-6 border-b border-gray-100 space-y-6">
                        {/* Action Buttons Row */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h2 className="text-lg font-semibold">Event Actions</h2>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex gap-2 mr-4">
                                    <button className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full"><User size={18} /></button>
                                    <button className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full"><Calendar size={18} /></button>
                                </div>
                                <a href={`tel:${event.customerMobile}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                                    <Phone size={16} /> Call
                                </a>
                                <a href={`sms:${event.customerMobile}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                                    <MessageSquare size={16} /> SMS
                                </a>
                                <a href={`mailto:${event.customerEmail}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                                    <Mail size={16} /> Email
                                </a>
                            </div>
                        </div>

                        {/* APPROVAL DATA */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-slate-700">State of Customer Approval</span>
                                {isLocked ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3"/> Approved
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending Review</span>
                                )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${isLocked ? 'bg-green-600 w-full' : 'bg-blue-600 w-[60%]'}`}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {isLocked ? "Customer has signed off on the Quotation." : "Waiting for customer to sign off on the Quotation."}
                            </p>
                        </div>

                        {/* State Pills */}
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((status, idx) => {
                                const isActive = event.status === status;
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => handleUpdateEvent({ status })}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors
                                            ${isActive 
                                                ? "bg-blue-100 text-blue-700 border-blue-200" 
                                                : "bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600"
                                            }`}
                                    >
                                        {status}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* --- MAIN CONTENT GRID --- */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Left Column: Customer & Event Details */}
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-lg font-bold mb-4">Customer Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs">Customer Name</p>
                                        <p className="font-medium">{event.customerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Customer Mobile</p>
                                        <p className="font-medium">{event.customerMobile}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-slate-500 text-xs">Customer Email</p>
                                        <p className="font-medium text-blue-600">{event.customerEmail}</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold mb-4">Event Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs">Inquiry Date</p>
                                        <p className="font-medium">{format(new Date(event.createdAt || new Date()), 'MM/dd/yyyy')}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Event Date & Time</p>
                                        <p className="font-medium">{event.days.length > 0 ? format(new Date(event.days[0].date), 'MM/dd/yyyy, h:mm a') : 'TBD'}</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold mb-4">Package Details</h3>
                                <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-4">
                                    {event.additionalServices && event.additionalServices.length > 0 ? (
                                        event.additionalServices.map((svc) => (
                                            <div key={svc.id} className="flex justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                                <div>
                                                    <p className="font-medium text-slate-800">{svc.name}</p>
                                                    <p className="text-xs text-slate-500">Qty: {svc.quantity}</p>
                                                </div>
                                                <span className="text-slate-600">{svc.total.toLocaleString()}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 italic">No services added yet.</p>
                                    )}
                                    
                                    {financials.discountAmount > 0 && (
                                        <div className="flex justify-between text-red-500 pt-2 border-t border-slate-200">
                                            <span>Discount</span>
                                            <span>- LKR {financials.discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Financials & Equipments */}
                        <div className="space-y-8">
                            {/* Financial Split */}
                            <div className="grid grid-cols-2 gap-8">
                                <section>
                                    <h3 className="text-lg font-bold mb-4">Payment Plan</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">Total Budget</span><span>{financials.total.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold pt-2 border-t"><span className="text-slate-800">Final</span><span>{financials.finalBudget.toLocaleString()}</span></div>
                                        <div className="flex justify-between pt-4"><span className="text-slate-500">Total Paid</span><span>{financials.paid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-red-600"><span className="">Due</span><span>{financials.due.toLocaleString()}</span></div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold mb-4">Expenses</h3>
                                    <div className="space-y-2 text-sm">
                                        {/* Placeholder for expense calculation if you track expenses separately */}
                                        <div className="flex justify-between"><span className="text-slate-500">Est. Profit</span><span>{(financials.finalBudget).toLocaleString()}</span></div>
                                    </div>
                                </section>
                            </div>

                            <section>
                                <h3 className="text-lg font-bold mb-4">Other Details</h3>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>Primary Location: {event.locations && event.locations.length > 0 ? event.locations[0].name : "Not set"}</p>
                                    <p>Days Count: {event.days.length}</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold mb-4">Equipment</h3>
                                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                                    {event.assignedEquipment && event.assignedEquipment.length > 0 ? (
                                        event.assignedEquipment.map(id => {
                                            const eq = equipmentList.find(e => e.id === id);
                                            return <p key={id}>{eq?.name || "Unknown Equipment"}</p>;
                                        })
                                    ) : <p className="italic text-slate-400">No equipment assigned</p>}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold mb-4">Crew</h3>
                                <div className="flex flex-wrap gap-2">
                                    {event.assignedCrew && event.assignedCrew.length > 0 ? (
                                        event.assignedCrew.map(id => {
                                            const crew = crewList.find(c => c.id === id);
                                            return <span key={id} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-slate-600">{crew?.displayName || "Unknown"}</span>;
                                        })
                                    ) : <p className="italic text-slate-400 text-sm">No crew assigned</p>}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* --- BOTTOM LISTS --- */}
                    <div className="p-6 border-t border-gray-100 bg-slate-50/50 space-y-6">
                        {/* 1. Locations Row */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                             <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                   <h4 className="font-bold text-slate-800">Locations</h4>
                                   <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => (document.querySelector('[value="locations"]') as HTMLElement)?.click()}>
                                      <Plus size={12} className="mr-1"/> Add
                                   </Button>
                                </div>
                                <div className="space-y-2">
                                    {event.locations?.map((loc, i) => (
                                        <div key={i} className="grid grid-cols-3 text-xs text-slate-500">
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Location</p><p className="text-slate-800 font-medium">{loc.name}</p></div>
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Date</p><p className="text-slate-800">{format(new Date(loc.date), 'MM/dd/yyyy')}</p></div>
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Note</p><p className="text-slate-800">{loc.note || "--"}</p></div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>

                        {/* 2. Payments Row */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                             <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                   <h4 className="font-bold text-slate-800">Payments</h4>
                                   <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => (document.querySelector('[value="payments"]') as HTMLElement)?.click()}>
                                      <Plus size={12} className="mr-1"/> Add
                                   </Button>
                                </div>
                                <div className="space-y-2">
                                    {event.transactions?.filter(t => t.type === 'income').slice(0,3).map((t, i) => (
                                        <div key={i} className="grid grid-cols-3 text-xs text-slate-500">
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Date</p><p className="text-slate-800">{format(new Date(t.date), 'MM/dd/yyyy')}</p></div>
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Amount</p><p className="text-slate-800">LKR {t.amount.toLocaleString()}</p></div>
                                            <div><p className="uppercase tracking-wider font-semibold mb-1">Remarks</p><p className="text-slate-800">{t.note || t.method}</p></div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </TabsContent>

            {/* --- 2. CONTACTS TAB --- */}
            <TabsContent value="contacts">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">External Contacts</CardTitle>
                        <Popover>
                            <PopoverTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Contact</Button></PopoverTrigger>
                            <PopoverContent className="w-80">
                                <form className="space-y-3" onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    addArrayItem('contacts', {
                                        id: crypto.randomUUID(),
                                        name: formData.get('name'),
                                        role: formData.get('role'),
                                        phone: formData.get('phone'),
                                        note: formData.get('note')
                                    });
                                }}>
                                    <h4 className="font-medium leading-none mb-2">New Contact</h4>
                                    <Input name="name" placeholder="Name" required className="h-8"/>
                                    <Input name="role" placeholder="Role (e.g. Band)" required className="h-8"/>
                                    <Input name="phone" placeholder="Phone" className="h-8"/>
                                    <Input name="note" placeholder="Note" className="h-8"/>
                                    <Button type="submit" size="sm" className="w-full">Add</Button>
                                </form>
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            {event.contacts?.map(c => (
                                <div key={c.id} className="flex items-start justify-between p-3 border rounded-lg bg-slate-50">
                                    <div>
                                        <p className="font-medium text-slate-900">{c.name}</p>
                                        <Badge variant="secondary" className="text-[10px] mt-1">{c.role}</Badge>
                                        <div className="flex flex-col gap-1 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {c.phone}</span>
                                            {c.note && <span>{c.note}</span>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => removeArrayItem('contacts', c.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                                </div>
                            ))}
                            {(!event.contacts || event.contacts.length === 0) && <p className="text-sm text-slate-400 italic">No external contacts added.</p>}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- 3. SERVICES TAB --- */}
            <TabsContent value="services">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Additional Services</CardTitle>
                        <Popover>
                            <PopoverTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Service</Button></PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-3">
                                    <Label>Select Service</Label>
                                    <Select onValueChange={(val) => {
                                        const param = serviceParams.find(p => p.name === val);
                                        const newItem: AdditionalService = {
                                            id: crypto.randomUUID(),
                                            name: param ? param.name : "Custom Service",
                                            type: param ? 'parameter' : 'custom',
                                            quantity: 1,
                                            pricePerUnit: param ? (param.defaultPrice || 0) : 0,
                                            total: param ? (param.defaultPrice || 0) : 0
                                        };
                                        addArrayItem('additionalServices', newItem);
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Choose..."/></SelectTrigger>
                                        <SelectContent>
                                            {serviceParams.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                            <SelectItem value="custom_new">Custom...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {event.additionalServices?.map((svc, idx) => (
                            <div key={svc.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5">
                                        <Label className="text-xs text-slate-400">Service</Label>
                                        <Input value={svc.name} className="h-8" onChange={(e) => {
                                            const updated = [...(event.additionalServices || [])];
                                            updated[idx].name = e.target.value;
                                            handleUpdateEvent({ additionalServices: updated });
                                        }}/>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs text-slate-400">Qty</Label>
                                        <Input type="number" value={svc.quantity} className="h-8" onChange={(e) => {
                                            const updated = [...(event.additionalServices || [])];
                                            updated[idx].quantity = Number(e.target.value);
                                            updated[idx].total = updated[idx].quantity * updated[idx].pricePerUnit;
                                            handleUpdateEvent({ additionalServices: updated });
                                        }}/>
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs text-slate-400">Unit Price</Label>
                                        <Input type="number" value={svc.pricePerUnit} className="h-8" onChange={(e) => {
                                            const updated = [...(event.additionalServices || [])];
                                            updated[idx].pricePerUnit = Number(e.target.value);
                                            updated[idx].total = updated[idx].quantity * updated[idx].pricePerUnit;
                                            handleUpdateEvent({ additionalServices: updated });
                                        }}/>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <Label className="text-xs text-slate-400">Total</Label>
                                        <p className="font-bold text-slate-700">{svc.total.toLocaleString()}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeArrayItem('additionalServices', svc.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- 4. LOCATIONS TAB --- */}
            <TabsContent value="locations">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Event Locations</CardTitle>
                        <Dialog>
                            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Location</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
                                <form className="space-y-4" onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    addArrayItem('locations', {
                                        id: crypto.randomUUID(),
                                        name: formData.get('name'),
                                        mapUrl: formData.get('mapUrl'),
                                        date: new Date(formData.get('date') as string),
                                        time: formData.get('time'),
                                        note: formData.get('note')
                                    });
                                }}>
                                    <Input name="name" placeholder="Location Name" required/>
                                    <Input name="mapUrl" placeholder="Google Maps Link"/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input name="date" type="date" required/>
                                        <Input name="time" type="time"/>
                                    </div>
                                    <Textarea name="note" placeholder="Instructions..."/>
                                    <Button type="submit" className="w-full">Save Location</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {event.locations?.map(loc => (
                            <div key={loc.id} className="flex items-start gap-4 p-4 border rounded-lg bg-white shadow-sm">
                                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-blue-600"/>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-slate-800">{loc.name}</h4>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">ID: {event.displayId}</span>
                                    </div>
                                    <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-4">
                                        <span>{format(loc.date instanceof Date ? loc.date : new Date(), 'PPP')}</span>
                                        {loc.time && <span>@ {loc.time}</span>}
                                    </div>
                                    {loc.mapUrl && <a href={loc.mapUrl} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 block">View on Map</a>}
                                    {loc.note && <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded">{loc.note}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeArrayItem('locations', loc.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- 5. PAYMENTS & EXPENSES --- */}
            {['payments', 'expenses'].map(tab => (
                <TabsContent key={tab} value={tab}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base capitalize">{tab}</CardTitle>
                            <Dialog>
                                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add {tab === 'payments' ? 'Income' : 'Expense'}</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
                                    <form className="space-y-4" onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const type = tab === 'payments' ? 'income' : 'expense';
                                        addArrayItem('transactions', {
                                            id: crypto.randomUUID(),
                                            date: new Date(formData.get('date') as string),
                                            amount: Number(formData.get('amount')),
                                            method: formData.get('method'),
                                            note: formData.get('note'),
                                            type: type
                                        });
                                    }}>
                                        <Input name="amount" type="number" placeholder="Amount" required/>
                                        <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}/>
                                        <Select name="method">
                                            <SelectTrigger><SelectValue placeholder="Method"/></SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                <SelectItem value="Cash">Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Textarea name="note" placeholder="Description..."/>
                                        <Button type="submit" className="w-full">Record</Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {event.transactions?.filter(t => t.type === (tab === 'payments' ? 'income' : 'expense')).map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 border rounded bg-slate-50 text-sm">
                                        <div>
                                            <p className="font-medium">LKR {t.amount.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">{format(t.date instanceof Date ? t.date : new Date(), 'PPP')} • {t.method}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {t.note && <span className="text-xs text-slate-400 italic max-w-[200px] truncate">{t.note}</span>}
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeArrayItem('transactions', t.id)}><Trash2 className="w-3 h-3 text-red-400"/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}

            {/* --- 6. RESOURCES --- */}
            <TabsContent value="resources">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Crew</CardTitle>
                            <Select onValueChange={(val) => checkAndAssignResource(val, 'crew')}>
                                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Assign Crew"/></SelectTrigger>
                                <SelectContent>
                                    {crewList.map(c => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {event.assignedCrew?.map(id => {
                                const crew = crewList.find(c => c.id === id);
                                return (
                                    <div key={id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                        <span className="text-sm">{crew?.displayName || "Unknown"}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                            const newCrew = event.assignedCrew.filter(x => x !== id);
                                            handleUpdateEvent({ assignedCrew: newCrew });
                                        }}><Trash2 className="w-3 h-3 text-red-400"/></Button>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Equipment</CardTitle>
                            <Select onValueChange={(val) => checkAndAssignResource(val, 'equipment')}>
                                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Assign Equipment"/></SelectTrigger>
                                <SelectContent>
                                    {equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.quantityAvailable})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {event.assignedEquipment?.map(id => {
                                const eq = equipmentList.find(e => e.id === id);
                                return (
                                    <div key={id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                        <span className="text-sm">{eq?.name || "Unknown"}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                            const newEq = event.assignedEquipment.filter(x => x !== id);
                                            handleUpdateEvent({ assignedEquipment: newEq });
                                        }}><Trash2 className="w-3 h-3 text-red-400"/></Button>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

        </Tabs>
    </div>
  )
}