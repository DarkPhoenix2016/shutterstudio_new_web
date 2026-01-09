"use client"

import React from 'react';
import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { useParams, useRouter } from "next/navigation"
import { 
    fetchEventById, updateEvent, fetchStudioSettingsList, 
    checkResourceAvailability, EventData, EventContact, 
    AdditionalService, EventLocation, TransactionRecord, fetchPackageConfig 
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
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { 
    Loader2, ArrowLeft, Save, Upload, MapPin, Phone, Mail, 
    Plus, Trash2, DollarSign, Users, Camera, Lock, CheckCircle,
    MessageSquare, User, FileText, Clock
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
    // [!code highlight] Fixed: Ensure fallback object has ALL properties to satisfy TS
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
          // Name: 'cover' or '1', '2', etc.
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


  if (loading || !event) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  const isLocked = event.approval?.customer_confirmed;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5"/></Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[#0F2854]">{event.eventName}</h1>
                        <Badge variant="outline" className="text-xs">{event.displayId}</Badge>
                        {isLocked && <Badge className="bg-green-600"><Lock className="w-3 h-3 mr-1"/> Confirmed</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{event.eventType}</span>
                        <span>•</span>
                        <span>{event.days[0] ? format(event.days[0].date instanceof Date ? event.days[0].date : new Date(), 'MMM dd, yyyy') : 'Date TBD'}</span>
                    </p>
                </div>
            </div>
            
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

            {/* --- 1. OVERVIEW TAB --- */}
            <TabsContent value="overview" className="space-y-6">
            <div className="bg-gray-50 min-h-screen p-6 font-sans text-slate-800">
      
      {/* --- HEADER SECTION --- */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        
        {/* Top Hero: Image & Title */}
        <div className="flex p-6 gap-6 border-b border-gray-100">
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
            {/* Placeholder for the couple image */}
            <img 
              src="/api/placeholder/150/150" 
              alt="Rajitha & Randini" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              Event Type: Wedding
            </span>
            <h1 className="text-3xl font-bold text-slate-900">Rajitha & Randini Wedding</h1>
            <p className="text-slate-500">Wedding</p>
          </div>
        </div>

        {/* Invoice Banner */}
        <div className="bg-green-50 px-6 py-3 border-y border-green-100 flex items-center gap-2 text-green-700 text-sm font-medium">
          <FileText size={16} />
          <span>Invoice Number: DMG10055</span>
        </div>

        {/* --- EVENT ACTIONS & APPROVAL STATE (Top Tab Area) --- */}
        <div className="p-6 border-b border-gray-100 space-y-6">
          
          {/* Action Buttons Row */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Event Actions</h2>
            <div className="flex gap-2">
               {/* Quick Actions */}
               <div className="flex gap-2 mr-4">
                  <button className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full"><User size={18} /></button>
                  <button className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full"><Calendar size={18} /></button>
               </div>
               {/* Communication Buttons */}
               <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                 <Phone size={16} /> Call
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                 <MessageSquare size={16} /> SMS
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                 <Mail size={16} /> Email
               </button>
            </div>
          </div>

          {/* APPROVAL DATA (Explicitly Requested) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">State of Customer Approval</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending Review</span>
            </div>
            {/* Visual Indicator for Approval */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Waiting for customer to sign off on the Quotation.</p>
          </div>

          {/* Progress Bar: Current Step */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
              <span>Current Step: Selection</span>
              <span>Step 2</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-1/4"></div>
            </div>
          </div>

          {/* State Pills */}
          <div className="flex flex-wrap gap-2">
             {["Quotation", "Scheduled", "In Progress", "Post Production", "Review", "Completed", "Handed Over"].map((status, idx) => (
               <span 
                key={idx}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border ${status === "Scheduled" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-slate-500 border-slate-200"}`}
               >
                 {status}
               </span>
             ))}
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
                   <p className="font-medium">Mr. Rajitha Jayasekara</p>
                 </div>
                 <div>
                   <p className="text-slate-500 text-xs">Customer Mobile</p>
                   <p className="font-medium">0772301920</p>
                 </div>
                 <div className="col-span-2">
                   <p className="text-slate-500 text-xs">Customer Email</p>
                   <p className="font-medium text-blue-600">rajitha114@gmail.com</p>
                 </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold mb-4">Event Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                   <p className="text-slate-500 text-xs">Inquiry Date</p>
                   <p className="font-medium">5/5/2025</p>
                 </div>
                 <div>
                   <p className="text-slate-500 text-xs">Event Date & Time</p>
                   <p className="font-medium">12/6/2025, 2:00 PM</p>
                 </div>
              </div>
            </section>

             <section>
              <h3 className="text-lg font-bold mb-4">Package Details</h3>
              <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-4">
                 <div>
                    <p className="font-bold text-slate-800">Day 01 - The Grand DMG Package</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1 pl-1">
                        <li>4k High Definition</li>
                        <li>4-5 minute Highlight Video</li>
                        <li>Full wedding video (60-90 min)</li>
                        <li>Flash drive with customized wood box</li>
                        <li>4 Cameras</li>
                        <li>Full Mavic 3 drone coverage LKR 250,000.00</li>
                    </ul>
                 </div>
                 <div>
                    <p className="font-bold text-slate-800">Day 02 - Engagement Package</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1 pl-1">
                        <li>4k High Definition</li>
                        <li>1-2 minute highlight video</li>
                    </ul>
                 </div>
                 <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-600">
                    <span>Extra Camera</span>
                    <span>30,000</span>
                 </div>
                 <div className="flex justify-between text-slate-600">
                    <span>Transport Cost & Accommodation</span>
                    <span>30,000</span>
                 </div>
                 <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span>- LKR 10,000</span>
                 </div>
              </div>
            </section>
          </div>

          {/* Right Column: Financials & Equipments */}
          <div className="space-y-8">
             
             {/* Financial Split */}
             <div className="grid grid-cols-2 gap-8">
                <section>
                   <h3 className="text-lg font-bold mb-4">Payment Plan Summary</h3>
                   <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Initial Budget</span><span>LKR 384,000.00</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Additional Expenses</span><span>LKR 0.00</span></div>
                      <div className="flex justify-between font-bold pt-2 border-t"><span className="text-slate-800">Final Budget</span><span>LKR 384,000.00</span></div>
                      <div className="flex justify-between pt-4"><span className="text-slate-500">Total Paid</span><span>LKR 115,200.00</span></div>
                      <div className="flex justify-between font-bold text-red-600"><span className="">Due Amount</span><span>LKR 268,800.00</span></div>
                   </div>
                </section>

                <section>
                   <h3 className="text-lg font-bold mb-4">Expense Summary</h3>
                   <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Total Budget</span><span>LKR 384,000.00</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Total Expenses</span><span>LKR 0.00</span></div>
                      <div className="flex justify-between font-bold text-green-600 pt-2 border-t"><span className="">Profit</span><span>LKR 384,000.00</span></div>
                   </div>
                </section>
             </div>

             <section>
                <h3 className="text-lg font-bold mb-4">Other Details</h3>
                <div className="text-sm text-slate-600 space-y-1">
                   <p>No of Participants - 110</p>
                   <p>Makeup Artist - Manjula</p>
                   <p>Bridal Wear - Saree</p>
                   <p>Groom's Wear - National Kit</p>
                   <p>Bridesmaids count - None</p>
                </div>
             </section>

             <section>
                <h3 className="text-lg font-bold mb-4">Equipments</h3>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                   <p>A7s3 x 1</p>
                   <p>A74 x 3</p>
                   <p>Ronin Rs4 x 2</p>
                   <p>Lenses: 24-70mm, 16-35mm, 85mm, 70-200mm</p>
                   <p>Mavic 3 Drone</p>
                </div>
             </section>

             <section>
                <h3 className="text-lg font-bold mb-4">Crew</h3>
                <div className="flex flex-wrap gap-2">
                   {["Dilshan Jayawarna", "Supindu Jayasinghe", "Tharindu Madushan", "Vimukthi Rathnayaka"].map(name => (
                      <span key={name} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-slate-600">{name}</span>
                   ))}
                </div>
             </section>
          </div>
        </div>

        {/* --- BOTTOM LISTS --- */}
        <div className="p-6 border-t border-gray-100 bg-slate-50/50 space-y-6">
           
           {/* Reusable List Item Component */}
           {["Contracts", "Social Media Links", "Locations", "Media Backup", "Additions", "Payments"].map((title) => (
              <div key={title} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                 <div className="w-full">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-slate-800">{title}</h4>
                       <button className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">
                          <Plus size={14} /> Add
                       </button>
                    </div>
                    
                    {/* Render Content Specific to 'Locations' based on image */}
                    {title === "Locations" && (
                       <div className="grid grid-cols-3 text-xs text-slate-500 py-2">
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Location</p>
                             <p className="text-slate-800 font-medium">Jetwing Saman Villas</p>
                          </div>
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Date</p>
                             <p className="text-slate-800">12/6/2025, 1:00 PM</p>
                          </div>
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Note</p>
                             <p className="text-slate-800">Shooting Location & Reception</p>
                          </div>
                       </div>
                    )}
                    
                    {/* Render Content Specific to 'Payments' based on image */}
                    {title === "Payments" && (
                       <div className="grid grid-cols-3 text-xs text-slate-500 py-2">
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Date</p>
                             <p className="text-slate-800">5/5/2025</p>
                          </div>
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Payment Amount</p>
                             <p className="text-slate-800">LKR 115,200.00</p>
                          </div>
                          <div>
                             <p className="uppercase tracking-wider font-semibold mb-1">Remarks</p>
                             <p className="text-slate-800">Advance Payment</p>
                          </div>
                       </div>
                    )}

                 </div>
              </div>
           ))}
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

            {/* --- 5. PAYMENTS & EXPENSES (Reused Logic) --- */}
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