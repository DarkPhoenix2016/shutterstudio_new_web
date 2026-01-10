"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import {
    doc, getDoc, updateDoc, collectionGroup, query, where, getDocs,
    serverTimestamp, collection
} from "firebase/firestore"
import {
    Loader2, Calendar as CalendarIcon, MapPin, Phone,
    CheckCircle, Lock, ShieldCheck,
    CreditCard, AlertCircle, Info, Mail, User, Check, ExternalLink, Plus,
    Image as ImageIcon, Download, X, ChevronLeft, ChevronRight, Maximize2
} from "lucide-react"
import { format } from "date-fns"
import Swal from "sweetalert2"

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// --- TYPES ---
interface PublicEventData {
    id: string;
    displayId?: string;
    studioId: string;
    eventName: string;
    eventType: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    couplePhotoUrl?: string;
    galleryUrls?: string[]; // [!code highlight] Added gallery support
    dayCount: number;
    days: {
        date: any;
        cost: number;
        type: 'package' | 'custom';
        packageId?: string;
        customItems?: { name: string; quantity: number; price: number }[]
    }[];
    totalBudget: number;
    discount: number;
    discountType: 'fixed' | 'percentage';
    finalBudget: number;
    transactions: { amount: number; type: 'income' | 'expense'; date: any; method: string }[];
    approval?: {
        customer_confirmed: boolean;
        confirmedAt?: any;
        verification_type?: string;
        verification_document_number?: string;
    };
    locations?: { name: string; date: any; mapUrl?: string; time?: string; note?: string }[];
    contacts?: { name: string; role: string; phone: string; note?: string }[];
    additionalServices?: { name: string; quantity: number; total: number; pricePerUnit: number }[];
    notes?: string;
}

interface StudioInfo {
    privacy_policy_notice?: string;
    banking_details?: {
        account_name: string;
        account_number: string;
        bank_name: string;
        branch: string;
        mobile_number?: string;
    };
}

interface PackageData {
    id: string;
    name: string;
    price: number;
    parameters?: Record<string, any>;
}

// --- HELPERS ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (dateInput instanceof Date) return dateInput;
        if (typeof dateInput === 'object') {
            if (typeof dateInput.toDate === 'function') return dateInput.toDate();
            if ('seconds' in dateInput) return new Date(dateInput.seconds * 1000);
        }
        return new Date(dateInput);
    } catch { return new Date(); }
};

export default function CustomerEventApprovalPage() {
    const { id } = useParams()

    // Authentication & Data State
    const [loading, setLoading] = useState(false)
    const [authEmail, setAuthEmail] = useState("")
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [event, setEvent] = useState<PublicEventData | null>(null)
    const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null)
    const [packagesList, setPackagesList] = useState<PackageData[]>([]) 

    // Approval Form State
    const [verifType, setVerifType] = useState<string>("id")
    const [verifDocNum, setVerifDocNum] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Gallery State
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    // --- 1. AUTHENTICATE & FETCH ---
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const eventsRef = collectionGroup(db, 'Events');
            let q = query(eventsRef, where('id', '==', id));
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                q = query(eventsRef, where('displayId', '==', id));
                querySnapshot = await getDocs(q);
            }

            if (querySnapshot.empty) {
                Swal.fire("Error", "Event not found. Please check the link.", "error");
                setLoading(false);
                return;
            }

            const docSnap = querySnapshot.docs[0];
            const eventData = docSnap.data() as PublicEventData;
            const studioId = docSnap.ref.parent.parent?.id;

            if (!studioId) throw new Error("Invalid Data Structure");

            if (eventData.customerEmail?.toLowerCase().trim() !== authEmail.toLowerCase().trim()) {
                Swal.fire("Access Denied", "The email provided does not match our records.", "error");
                setLoading(false);
                return;
            }

            const [studioSnap, packagesSnap] = await Promise.all([
                getDoc(doc(db, "Studios", studioId)),
                getDocs(collection(db, "Studios", studioId, "Packages"))
            ]);

            const studioData = studioSnap.exists() ? studioSnap.data() : {};
            const pkgs = packagesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PackageData[];

            setEvent({ ...eventData, id: docSnap.id, studioId });
            setStudioInfo({
                privacy_policy_notice: studioData.privacy_policy_notice,
                banking_details: studioData.banking_details
            });
            setPackagesList(pkgs);
            setIsAuthenticated(true);

        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Failed to load event data.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. APPROVE ACTION ---
    const handleApprove = async () => {
        if (!event) return;

        if (!verifType || !verifDocNum) {
            return Swal.fire("Validation Error", "Please fill in all verification fields.", "warning");
        }
        
        setIsSubmitting(true);

        try {
            const eventRef = doc(db, "Studios", event.studioId, "Events", event.id);

            await updateDoc(eventRef, {
                status: "Scheduled",
                approval: {
                    customer_confirmed: true,
                    confirmedAt: serverTimestamp(),
                    verification_type: verifType === "id" ? "National ID" : "Passport",
                    verification_document_number: verifDocNum,
                    customer_email: event.customerEmail,
                    customer_phone: event.customerMobile
                }
            });

            setEvent(prev => prev ? ({
                ...prev,
                status: "Scheduled",
                approval: {
                    customer_confirmed: true,
                    confirmedAt: new Date(),
                    verification_type: verifType === "id" ? "National ID" : "Passport",
                    verification_document_number: verifDocNum
                }
            }) : null);

            Swal.fire({ title: "Success", text: "Event approved successfully!", icon: "success", confirmButtonColor: "#1C4D8D" });

        } catch (error) {
            Swal.fire("Error", "Failed to process approval.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- GALLERY LOGIC ---
    const allImages = useMemo(() => {
        if (!event) return [];
        const imgs = [];
        if (event.couplePhotoUrl) imgs.push(event.couplePhotoUrl);
        if (event.galleryUrls && Array.isArray(event.galleryUrls)) imgs.push(...event.galleryUrls);
        return imgs;
    }, [event]);

    const downloadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `event-image-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed", error);
            window.open(url, '_blank'); // Fallback
        }
    };

    // --- CALCULATIONS ---
    const financials = useMemo(() => {
        if (!event) return { 
            baseCost: 0, servicesCost: 0, totalBudget: 0, 
            discountAmount: 0, finalBudget: 0, paid: 0, due: 0, currency: "LKR" 
        }; 
        
        const paid = event.transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;
        const baseCost = event.days?.reduce((acc, day) => acc + (day.cost || 0), 0) || 0;
        const servicesCost = event.additionalServices?.reduce((acc, s) => acc + (s.total || 0), 0) || 0;
        const totalBudget = baseCost + servicesCost;
        
        let discountAmount = 0;
        if (event.discountType === 'percentage') {
            discountAmount = totalBudget * ((event.discount || 0) / 100);
        } else {
            discountAmount = Number(event.discount || 0);
        }
        
        const finalBudget = Math.max(0, totalBudget - discountAmount);

        return { 
            baseCost, servicesCost, totalBudget, discountAmount, 
            finalBudget, paid, due: finalBudget - paid, currency: "LKR" 
        };
    }, [event]);

    // --- VIEW: LOGIN GATE ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-lg border-t-4 border-t-[#1C4D8D]">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-[#1C4D8D]" />
                        </div>
                        <CardTitle>Customer Verification</CardTitle>
                        <CardDescription>Enter email to access event details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input type="email" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required className="h-11"/>
                            </div>
                            <Button type="submit" className="w-full h-11 bg-[#1C4D8D] hover:bg-[#163b6b]" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Access Document
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!event) return null;
    const isApproved = event.approval?.customer_confirmed;

    // --- MAIN DASHBOARD (Single Column) ---
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            
            {/* TOP NAVIGATION */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <span className="font-bold text-[#1C4D8D] text-lg">Event Quotation</span>
                    {isApproved ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1 px-3 py-1">
                            <CheckCircle className="w-3 h-3"/> Approved
                        </Badge>
                    ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 px-3 py-1">
                            Pending Approval
                        </Badge>
                    )}
                </div>
            </div>

            {/* HERO COVER SECTION */}
            <div className="relative w-full h-[400px] md:h-[500px] bg-slate-900">
                <img 
                    src={event.couplePhotoUrl || "/api/placeholder/1200/500"} 
                    alt="Event Cover" 
                    className="w-full h-full object-cover opacity-70" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 max-w-3xl mx-auto">
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 uppercase tracking-wider text-xs px-3 py-1">{event.eventType}</Badge>
                            <Badge variant="outline" className="text-white border-white/40 backdrop-blur-md px-3 py-1">{event.status}</Badge>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">{event.eventName}</h1>
                        <p className="text-slate-300 font-medium text-lg md:text-xl flex items-center gap-2 mt-1">
                            <CalendarIcon className="w-5 h-5 text-blue-400" />
                            {event.days.length > 0 ? format(safeDate(event.days[0].date), 'MMMM do, yyyy') : 'Date TBD'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in -mt-8 relative z-0">
                
                {/* 1. GALLERY CARD (New) */}
                {allImages.length > 0 && (
                    <Card className="shadow-lg border-slate-200 overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100 py-4">
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4"/> Event Gallery ({allImages.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {allImages.slice(0, 8).map((img, idx) => (
                                    <div 
                                        key={idx} 
                                        className="relative group aspect-square rounded-md overflow-hidden cursor-pointer bg-slate-100"
                                        onClick={() => setLightboxIndex(idx)}
                                    >
                                        <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2 className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-md transition-opacity"/>
                                        </div>
                                    </div>
                                ))}
                                {allImages.length > 8 && (
                                    <div 
                                        className="relative flex items-center justify-center bg-slate-100 rounded-md cursor-pointer hover:bg-slate-200 transition-colors"
                                        onClick={() => setLightboxIndex(8)}
                                    >
                                        <span className="text-sm font-bold text-slate-500">+{allImages.length - 8} more</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 2. CUSTOMER DETAILS */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-sm font-bold text-slate-700">Customer Details</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-400 uppercase">Full Name</Label>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><User className="w-4 h-4 text-slate-400"/> {event.customerName}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400 uppercase">Mobile</Label>
                                    <div className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-3 h-3"/> {event.customerMobile}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400 uppercase">Email</Label>
                                    <div className="flex items-center gap-2 text-sm text-slate-700"><Mail className="w-3 h-3"/> {event.customerEmail}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. EVENT ITINERARY & PACKAGES */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                        <CardTitle className="text-sm font-bold text-slate-700">Event Day Itinerary & Packages</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {event.days?.map((day, idx) => {
                            const pkg = day.type === 'package' && day.packageId ? packagesList.find(p => p.id === day.packageId) : null;
                            return (
                                <div key={idx} className="border rounded-xl bg-white overflow-hidden shadow-sm border-slate-200">
                                    <div className="p-6 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">Day {idx + 1}</h3>
                                                <p className="text-slate-500 text-sm mt-0.5">{day.date ? format(safeDate(day.date), 'MMMM do, yyyy') : "Date TBD"}</p>
                                            </div>
                                            <Badge variant="outline" className={day.type === 'package' ? "text-blue-600 border-blue-200 bg-blue-50/50" : "text-amber-600 border-amber-200 bg-amber-50/50"}>
                                                {day.type === 'package' ? 'Package' : 'Custom Plan'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4">
                                        {day.type === 'package' && pkg && (
                                            <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-bold text-slate-800 text-base">{pkg.name}</span>
                                                    <span className="font-semibold text-slate-700">{financials.currency} {Number(pkg.price).toLocaleString()}</span>
                                                </div>
                                                {pkg.parameters && (
                                                    <ul className="space-y-2.5">
                                                        {Object.entries(pkg.parameters).map(([key, value], i) => {
                                                            if (value === false) return null;
                                                            return (
                                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                                    <span>{key}{typeof value !== 'boolean' ? `: ${value}` : ''}</span>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                        {day.type === 'custom' && (
                                            <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-5">
                                                <div className="space-y-3">
                                                    {day.customItems?.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm text-slate-700">
                                                            <span>{item.name} <span className="text-slate-400 text-xs ml-1">× {item.quantity}</span></span>
                                                            <span className="font-medium">{financials.currency} {(item.price * item.quantity).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    {!day.customItems?.length && <p className="text-slate-400 italic text-sm">No custom items listed.</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
                                        <span className="font-semibold text-slate-700">Day {idx + 1} Total</span>
                                        <span className="font-bold text-slate-900 text-lg">{financials.currency} {day.cost.toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        })}

                        {event.additionalServices && event.additionalServices.length > 0 && (
                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-base"><Plus className="w-5 h-5 text-blue-600" /> Additional Services & Charges</h4>
                                <div className="border rounded-xl bg-white overflow-hidden shadow-sm border-slate-200">
                                    <div className="p-6">
                                        <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-5">
                                            <div className="space-y-3">
                                                {event.additionalServices.map((svc, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm text-slate-700">
                                                        <span>{svc.name} <span className="text-slate-400 text-xs ml-1">× {svc.quantity}</span></span>
                                                        <span className="font-medium">{financials.currency} {svc.total.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
                                        <span className="font-bold text-slate-700">Total Additional Services & Charges</span>
                                        <span className="font-bold text-slate-900 text-lg">{financials.currency} {financials.servicesCost.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 4. FINANCIAL SUMMARY */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-sm font-bold text-slate-700">Financial Summary</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3 max-w-sm ml-auto">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Sub Total</span>
                                <span className="font-medium text-slate-900">{financials.currency} {financials.totalBudget.toLocaleString()}</span>
                            </div>
                            {financials.discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Discount {event.discountType === 'percentage' ? `(${event.discount}%)` : ''}</span>
                                    <span>- {financials.currency} {financials.discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold text-[#1C4D8D]">
                                <span>Final Total</span>
                                <span>{financials.currency} {financials.finalBudget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600 font-medium">
                                <span>Paid to Date</span>
                                <span>{financials.currency} {financials.paid.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600 font-bold bg-red-50 p-3 rounded border border-red-100">
                                <span>Due Amount</span>
                                <span>{financials.currency} {financials.due.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. ADDITIONAL NOTES */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-sm font-bold text-slate-700">Additional Notes</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        {event.notes ? <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{event.notes}</p> : <p className="text-sm text-slate-400 italic">No additional notes.</p>}
                    </CardContent>
                </Card>

                {/* 6. LOCATIONS & CONTACTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-slate-200 h-full">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-sm font-bold text-slate-700">Event Locations</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            {event.locations && event.locations.length > 0 ? (
                                event.locations.map((l, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50/50">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5"/>
                                            <div>
                                                <div className="font-medium text-slate-800 text-sm">{l.name}</div>
                                                <div className="text-xs text-slate-500 mt-1">{format(safeDate(l.date), 'MMM dd')} {l.time && `@ ${l.time}`}</div>
                                            </div>
                                        </div>
                                        {l.mapUrl && <a href={l.mapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"><ExternalLink className="h-3 w-3"/> Map</a>}
                                    </div>
                                ))
                            ) : <p className="p-6 text-sm text-slate-400 italic">No locations added.</p>}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 h-full">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-sm font-bold text-slate-700">Event Contacts</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            {event.contacts && event.contacts.length > 0 ? (
                                <div className="divide-y">
                                    {event.contacts.map((c, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                                            <div>
                                                <div className="font-medium text-slate-800 text-sm">{c.name}</div>
                                                <div className="text-xs text-slate-500">{c.role}</div>
                                            </div>
                                            <div className="text-sm font-mono text-slate-600">{c.phone}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="p-6 text-sm text-slate-400 italic">No contacts listed.</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* 7. BANK & TERMS */}
                <div className="grid grid-cols-1 gap-6">
                    {studioInfo?.banking_details && (
                        <Card className="bg-blue-50/30 border-blue-100 shadow-sm">
                            <CardHeader className="py-4 pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Payment Details</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="text-sm space-y-2 text-slate-600">
                                    <div className="flex justify-between border-b border-blue-100 pb-1"><span>Bank</span><span className="font-semibold text-slate-800">{studioInfo.banking_details.bank_name}</span></div>
                                    <div className="flex justify-between border-b border-blue-100 pb-1"><span>Branch</span><span>{studioInfo.banking_details.branch}</span></div>
                                    <div className="flex justify-between border-b border-blue-100 pb-1"><span>Account Name</span><span>{studioInfo.banking_details.account_name}</span></div>
                                    <div className="flex justify-between pt-1"><span>Account No</span><span className="font-mono font-bold text-slate-800">{studioInfo.banking_details.account_number}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {studioInfo?.privacy_policy_notice && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="py-4 pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Privacy & Terms</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-2">
                                <p className="text-xs text-slate-500 leading-relaxed text-justify whitespace-pre-line">{studioInfo.privacy_policy_notice}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Separator className="my-4"/>

                {/* 8. APPROVAL FORM */}
                {isApproved ? (
                    <Card className="bg-green-50 border-green-200 shadow-sm text-center">
                        <CardContent className="p-8 space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                            <h2 className="text-2xl font-bold text-green-800">Quotation Approved</h2>
                            <p className="text-green-700 text-sm">You have successfully confirmed this event quotation.</p>
                            <div className="bg-white/60 rounded-lg p-4 text-sm text-left max-w-sm mx-auto space-y-2 border border-green-100 mt-4">
                                <div className="flex justify-between"><span className="text-slate-500">Approved By:</span><span className="font-medium text-slate-800">{event.customerName}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-medium text-slate-800">{event.approval?.confirmedAt ? format(safeDate(event.approval.confirmedAt), "PPP") : 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">ID Type:</span><span className="font-medium text-slate-800">{event.approval?.verification_type}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Doc No:</span><span className="font-medium text-slate-800">{event.approval?.verification_document_number}</span></div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-t-4 border-t-[#1C4D8D] shadow-lg">
                        <CardHeader>
                            <CardTitle>Final Approval</CardTitle>
                            <CardDescription>Verify your identity to electronically sign this quotation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2"><Label>Full Name (Read Only)</Label><Input value={event.customerName} disabled className="bg-slate-50"/></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Verification Type <span className="text-red-500">*</span></Label>
                                        <Select value={verifType} onValueChange={setVerifType}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="id">National Identity Card (NIC)</SelectItem>
                                                <SelectItem value="passport">Passport</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{verifType === 'id' ? 'NIC Number' : 'Passport Number'} <span className="text-red-500">*</span></Label>
                                        <Input placeholder={verifType === 'id' ? "e.g. 199012345678" : "Enter Passport Number"} value={verifDocNum} onChange={(e) => setVerifDocNum(e.target.value.toUpperCase())} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400">{verifType === 'id' ? "Accepts Sri Lankan Old (9 digits + V/X) or New (12 digits)." : "Must be a valid international passport number."}</p>
                            </div>
                            <Alert className="bg-blue-50 border-blue-100">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Declaration</AlertTitle>
                                <AlertDescription className="text-blue-700 text-xs mt-1">By clicking "Approve Event", I confirm the details above are accurate and agree to the pricing and privacy terms.</AlertDescription>
                            </Alert>
                            <Button onClick={handleApprove} className="w-full bg-[#1C4D8D] hover:bg-[#163b6b] h-12 text-lg" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</> : "Approve Event"}</Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* LIGHTBOX OVERLAY */}
            {lightboxIndex !== null && allImages.length > 0 && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-300">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <X className="w-6 h-6"/>
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-16 text-white hover:bg-white/20 z-50 rounded-full"
                        onClick={() => downloadImage(allImages[lightboxIndex])}
                        title="Download Image"
                    >
                        <Download className="w-6 h-6"/>
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : allImages.length - 1) }}
                    >
                        <ChevronLeft className="w-8 h-8"/>
                    </Button>

                    <img 
                        src={allImages[lightboxIndex]} 
                        alt="Full View" 
                        className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
                    />

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev < allImages.length - 1 ? prev + 1 : 0) }}
                    >
                        <ChevronRight className="w-8 h-8"/>
                    </Button>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
                        {lightboxIndex + 1} / {allImages.length}
                    </div>
                </div>
            )}
        </div>
    )
}