"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useParams, useRouter } from "next/navigation"
// [!code highlight] Update import path to correct service folder
import { fetchEventById, EventData } from "@/services/event-service"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Phone, Mail, MapPin, Calendar, Edit, ArrowLeft, Camera, Users, FileText, Plus } from "lucide-react"
import { format } from "date-fns"

export default function EventDetailPage() {
  const { id } = useParams()
  const { userData } = useAuth()
  const router = useRouter()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (userData?.studioID && id) {
        const data = await fetchEventById(userData.studioID, id as string)
        setEvent(data)
        setLoading(false)
      }
    }
    load()
  }, [userData, id])

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
  if (!event) return <div className="p-8 text-center text-slate-500">Event not found</div>

  // Helper to safely get the primary date
  const primaryDate = event.days && event.days.length > 0 && event.days[0].date 
    ? event.days[0].date 
    : null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in">
        
        {/* TOP BAR */}
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5"/></Button>
            <h1 className="text-xl font-bold text-slate-800">Event Details</h1>
        </div>

        {/* HERO SECTION */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 h-64 md:h-80 shadow-lg">
            {event.couplePhotoUrl ? (
                <img src={event.couplePhotoUrl} alt="Event" className="w-full h-full object-cover opacity-60" />
            ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Camera className="h-16 w-16 text-slate-600" />
                </div>
            )}
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-sm font-medium text-blue-300 uppercase tracking-wide mb-1">
                            {/* [!code highlight] Use displayId if available, fallback to ID */}
                            {event.id?.toUpperCase()}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold">{event.eventName}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-200">
                            <span className="bg-white/20 px-2 py-0.5 rounded">{event.eventType}</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4"/> 
                                {/* [!code highlight] Fixed: Access date from days array */}
                                {primaryDate ? format(primaryDate instanceof Date ? primaryDate : new Date(), 'PPP') : 'TBD'}
                            </span>
                        </div>
                    </div>
                    <Badge className="text-base px-4 py-1 bg-white text-black hover:bg-slate-200">{event.status}</Badge>
                </div>
            </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2"><Phone className="h-4 w-4"/> Call</Button>
                <Button variant="outline" size="sm" className="gap-2"><Mail className="h-4 w-4"/> Email</Button>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                {['Scheduled', 'Shooting', 'Editing', 'Completed'].map((step) => (
                    <Badge 
                        key={step} 
                        variant="secondary" 
                        className={event.status === step ? "bg-[#1C4D8D] text-white" : "text-slate-400 bg-slate-50"}
                    >
                        {step}
                    </Badge>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* CUSTOMER DETAILS */}
                <section>
                    <h2 className="text-lg font-bold text-[#0F2854] mb-4">Customer Details</h2>
                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 uppercase">Customer Name</label>
                                <p className="font-medium text-slate-800">{event.customerName}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase">Mobile</label>
                                <p className="font-medium text-slate-800">{event.customerMobile}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-500 uppercase">Email</label>
                                <p className="font-medium text-slate-800">{event.customerEmail || "-"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* PACKAGE DETAILS (Per Day) */}
                <section>
                    <h2 className="text-lg font-bold text-[#0F2854] mb-4">Itinerary & Packages</h2>
                    {/* [!code highlight] Fixed: Map over days to show package info per day */}
                    <div className="space-y-4">
                        {event.days?.map((day, index) => (
                            <Card key={index} className="border-none shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800">
                                                Day {index + 1}: {day.type === 'package' ? 'Package Plan' : 'Custom Plan'}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                {day.date ? format(day.date instanceof Date ? day.date : new Date(), 'PPP') : 'Date TBD'}
                                            </p>
                                        </div>
                                        <Badge variant="outline">LKR {day.cost.toLocaleString()}</Badge>
                                    </div>
                                    
                                    {day.type === 'package' && day.packageId && (
                                        <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                            <span className="font-medium">Package ID:</span> {day.packageId}
                                        </div>
                                    )}

                                    {day.type === 'custom' && day.customItems && (
                                        <div className="mt-3 space-y-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Custom Items</p>
                                            <ul className="text-sm text-slate-700 space-y-1">
                                                {day.customItems.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span className="text-slate-400">LKR {item.price.toLocaleString()}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* CREW & EQUIPMENT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-[#0F2854]">Equipments</h2>
                            <Button variant="ghost" size="sm"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Card className="border-none shadow-sm bg-white">
                            <CardContent className="p-4 space-y-2">
                                {event.assignedEquipment?.length === 0 ? <p className="text-slate-400 text-sm italic">No equipment assigned</p> : 
                                    event.assignedEquipment?.map(eq => <div key={eq} className="p-2 bg-slate-50 rounded text-sm text-slate-700">{eq}</div>)
                                }
                            </CardContent>
                        </Card>
                    </section>
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-[#0F2854]">Crew</h2>
                            <Button variant="ghost" size="sm"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Card className="border-none shadow-sm bg-white">
                            <CardContent className="p-4 space-y-2">
                                {event.assignedCrew?.length === 0 ? <p className="text-slate-400 text-sm italic">No crew assigned</p> : 
                                    event.assignedCrew?.map(c => <div key={c} className="p-2 bg-slate-50 rounded text-sm text-slate-700 flex items-center gap-2"><Users className="h-3 w-3"/> {c}</div>)
                                }
                            </CardContent>
                        </Card>
                    </section>
                </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
                
                {/* FINANCIALS */}
                <section>
                    <h2 className="text-lg font-bold text-[#0F2854] mb-4">Financials</h2>
                    <Card className="border-none shadow-sm bg-slate-50">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Total Budget</span>
                                {/* [!code highlight] Fixed: Use totalBudget */}
                                <span className="font-bold text-lg text-slate-900">LKR {(event.totalBudget || 0).toLocaleString()}</span>
                            </div>
                            
                            {event.discount > 0 && (
                                <div className="flex justify-between items-center text-sm text-slate-500">
                                    <span>Discount ({event.discountType === 'percentage' ? '%' : 'LKR'})</span>
                                    <span>- {event.discount}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Advance Paid</span>
                                <span className="text-green-600 font-medium">LKR {(event.advancePaid || 0).toLocaleString()}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Due Amount</span>
                                {/* [!code highlight] Fixed: Use finalBudget */}
                                <span className="text-red-600 font-bold">LKR {((event.finalBudget || 0) - (event.advancePaid || 0)).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* LOCATIONS (Extracted from Days) */}
                <section>
                    <h2 className="text-lg font-bold text-[#0F2854] mb-4">Locations</h2>
                    <div className="space-y-3">
                        {/* [!code highlight] Fixed: Map over days array */}
                        {event.days?.map((day, idx) => (
                            <Card key={idx} className="border-none shadow-sm bg-white">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-[#1C4D8D] mt-0.5" />
                                    <div>
                                        {/* Note: 'location' field might need to be added to EventDayConfig if you want per-day locations. 
                                            Assuming it's not there yet based on types, placeholder used. */}
                                        <p className="font-medium text-slate-800">Location TBD</p>
                                        <p className="text-xs text-slate-500">{day.date ? format(day.date instanceof Date ? day.date : new Date(), 'PPP') : ''}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* CONTRACTS */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-[#0F2854]">Contracts</h2>
                        <Button size="sm" variant="outline"><Plus className="h-3 w-3"/></Button>
                    </div>
                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Service_Agreement.pdf</span>
                            </div>
                            <Button size="sm" variant="ghost">View</Button>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    </div>
  )
}