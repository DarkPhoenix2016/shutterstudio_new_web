"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { 
    doc, getDoc, updateDoc, collectionGroup, query, where, getDocs, 
    serverTimestamp 
} from "firebase/firestore"
import { 
    Loader2, Calendar, MapPin, Phone, Mail, 
    CheckCircle, FileText, Lock, ShieldCheck, 
    CreditCard, AlertCircle, Info 
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
    id: string; // The internal doc ID
    displayId?: string; // The visible ID (e.g. EVT0001)
    studioId: string;
    eventName: string;
    eventType: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    couplePhotoUrl?: string;
    days: { date: any; cost: number }[];
    totalBudget: number;
    discount: number;
    discountType: 'fixed' | 'percentage';
    finalBudget: number;
    transactions: { amount: number; type: 'income' | 'expense' }[];
    approval?: {
        customer_confirmed: boolean;
        confirmedAt?: any;
        verification_type?: string;
        verification_document_number?: string;
    };
    locations?: { name: string; date: any; mapUrl?: string; time?: string }[];
    additionalServices?: { name: string; quantity: number; total: number }[];
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

// --- HELPER: VALIDATION ---
const validateNIC = (nic: string): boolean => {
    // Old NIC: 9 digits + V/X (e.g., 901234567V)
    const oldNicRegex = /^[0-9]{9}[vVxX]$/;
    // New NIC: 12 digits (e.g., 199012345678)
    const newNicRegex = /^[0-9]{12}$/;
    return oldNicRegex.test(nic) || newNicRegex.test(nic);
}

const validatePassport = (passport: string): boolean => {
    // Alphanumeric, 6-15 chars
    const passportRegex = /^[A-Z0-9]{6,15}$/i;
    return passportRegex.test(passport);
}

// --- HELPER: SAFE DATE ---
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
    
    // States
    const [loading, setLoading] = useState(false)
    const [authEmail, setAuthEmail] = useState("")
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [event, setEvent] = useState<PublicEventData | null>(null)
    const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null)
    
    // Form States
    const [verifType, setVerifType] = useState<string>("id")
    const [verifDocNum, setVerifDocNum] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 1. AUTHENTICATE & FETCH
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // [FIXED QUERY]: Use collectionGroup but filter by a field, not __name__
            // NOTE: Ensure your Event documents have an 'id' field stored in them. 
            // If searching by Display ID (e.g. EVT001), change 'id' to 'displayId'.
            const eventsRef = collectionGroup(db, 'Events');
            
            // Try to find by internal ID field first (assuming you save doc ID as 'id' in data)
            // If you don't save 'id' in the doc, this will be empty. 
            // Fallback: If your URL uses displayId (e.g. EVT005), change this to 'displayId'
            let q = query(eventsRef, where('id', '==', id)); 
            let querySnapshot = await getDocs(q);

            // Fallback: Try searching by displayId if regular ID failed
            if (querySnapshot.empty) {
                 q = query(eventsRef, where('displayId', '==', id));
                 querySnapshot = await getDocs(q);
            }

            if (querySnapshot.empty) {
                Swal.fire("Error", "Event not found. Please check the link or ensure the Event ID is correct.", "error");
                setLoading(false);
                return;
            }

            const docSnap = querySnapshot.docs[0];
            const eventData = docSnap.data() as PublicEventData;
            const studioId = docSnap.ref.parent.parent?.id; // Events -> Studio -> [StudioID]

            if (!studioId) throw new Error("Invalid Data Structure");

            // Verify Email
            if (eventData.customerEmail?.toLowerCase().trim() !== authEmail.toLowerCase().trim()) {
                Swal.fire("Access Denied", "The email provided does not match our records for this event.", "error");
                setLoading(false);
                return;
            }

            // Fetch Studio Info
            const studioSnap = await getDoc(doc(db, "Studios", studioId));
            const studioData = studioSnap.exists() ? studioSnap.data() : {};

            setEvent({ ...eventData, id: docSnap.id, studioId });
            setStudioInfo({
                privacy_policy_notice: studioData.privacy_policy_notice,
                banking_details: studioData.banking_details
            });
            setIsAuthenticated(true);

        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Failed to load event data. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    // 2. APPROVE ACTION
    const handleApprove = async () => {
        if (!event) return;

        // Validation
        if (!verifType || !verifDocNum) {
            return Swal.fire("Validation Error", "Please fill in all verification fields.", "warning");
        }

        if (verifType === "id" && !validateNIC(verifDocNum)) {
            return Swal.fire("Invalid ID", "Please enter a valid Sri Lankan NIC number.", "warning");
        }

        if (verifType === "passport" && !validatePassport(verifDocNum)) {
            return Swal.fire("Invalid Passport", "Please enter a valid passport number.", "warning");
        }

        setIsSubmitting(true);

        try {
            const eventRef = doc(db, "Studios", event.studioId, "Events", event.id);
            
            await updateDoc(eventRef, {
                status: "Scheduled", // Change status upon approval
                approval: {
                    customer_confirmed: true,
                    confirmedAt: serverTimestamp(),
                    verification_type: verifType === "id" ? "National ID" : "Passport",
                    verification_document_number: verifDocNum,
                    customer_email: event.customerEmail,
                    customer_phone: event.customerMobile
                }
            });

            // Update Local State to reflect change immediately
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

            Swal.fire({
                title: "Success",
                text: "Event approved and scheduled successfully!",
                icon: "success",
                confirmButtonColor: "#1C4D8D"
            });

        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Failed to process approval. Please check your connection.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculations
    const financials = useMemo(() => {
        if (!event) return { paid: 0, due: 0 };
        const paid = event.transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;
        return { paid, due: event.finalBudget - paid };
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
                        <CardDescription>
                            Please enter your email address to access your event details and approval document.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    required 
                                    className="h-11"
                                />
                            </div>
                            <Button type="submit" className="w-full h-11 bg-[#1C4D8D] hover:bg-[#163b6b]" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                Access Document
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-xs text-slate-400">Secured by ShutterStudio</p>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!event) return null;

    const isApproved = event.approval?.customer_confirmed;

    // --- VIEW: MAIN CONTENT ---
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Top Bar */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <span className="font-bold text-[#1C4D8D] text-lg">Event Quotation & Approval</span>
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

            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* 1. HERO SECTION */}
                <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                    <img 
                        src={event.couplePhotoUrl || "/api/placeholder/800/400"} 
                        alt="Cover" 
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-white">
                        <div className="flex flex-col gap-2">
                            <Badge className="w-fit bg-blue-600 hover:bg-blue-600 border-0 uppercase tracking-wider text-[10px]">{event.eventType}</Badge>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{event.eventName}</h1>
                            <p className="text-slate-300 font-medium text-lg flex items-center gap-2 mt-1">
                                <Calendar className="w-5 h-5"/>
                                {event.days && event.days.length > 0 ? format(safeDate(event.days[0].date), 'MMMM do, yyyy') : 'Date TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. MAIN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* LEFT: Details */}
                    <div className="space-y-8">
                        {/* Customer Details */}
                        <section>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                                <FileText className="w-5 h-5"/> Customer Details
                            </h3>
                            <Card className="shadow-sm border-slate-200">
                                <CardContent className="p-5 grid grid-cols-1 gap-4 text-sm">
                                    <div className="grid grid-cols-3">
                                        <span className="text-slate-500">Name</span>
                                        <span className="col-span-2 font-medium">{event.customerName}</span>
                                    </div>
                                    <div className="grid grid-cols-3">
                                        <span className="text-slate-500">Email</span>
                                        <span className="col-span-2 font-medium">{event.customerEmail}</span>
                                    </div>
                                    <div className="grid grid-cols-3">
                                        <span className="text-slate-500">Phone</span>
                                        <span className="col-span-2 font-medium">{event.customerMobile}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Package Details */}
                        <section>
                            <h3 className="text-lg font-bold mb-4 text-slate-700">Package & Services</h3>
                            <Card className="shadow-sm border-slate-200">
                                <CardContent className="p-5 space-y-4">
                                    {event.additionalServices && event.additionalServices.length > 0 ? (
                                        <div className="space-y-3">
                                            {event.additionalServices.map((svc, i) => (
                                                <div key={i} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0 border-slate-100">
                                                    <div>
                                                        <span className="font-medium text-slate-700">{svc.name}</span>
                                                        <div className="text-xs text-slate-400">Qty: {svc.quantity}</div>
                                                    </div>
                                                    <span className="font-semibold text-slate-600">LKR {svc.total.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Standard Package Configuration</p>
                                    )}
                                    
                                    {/* Financial Summary Block */}
                                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 mt-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Total Estimate</span>
                                            <span className="font-medium">LKR {event.totalBudget.toLocaleString()}</span>
                                        </div>
                                        {event.discount > 0 && (
                                            <div className="flex justify-between text-red-600">
                                                <span>Discount</span>
                                                <span>- LKR {event.discountType === 'percentage' ? `${event.discount}%` : event.discount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <Separator className="my-2"/>
                                        <div className="flex justify-between font-bold text-base text-slate-900">
                                            <span>Final Total</span>
                                            <span>LKR {event.finalBudget.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-green-700 pt-2">
                                            <span>Paid to Date</span>
                                            <span>LKR {financials.paid.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-red-700 font-bold">
                                            <span>Balance Due</span>
                                            <span>LKR {financials.due.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </div>

                    {/* RIGHT: Locations & Info */}
                    <div className="space-y-8">
                        {/* Locations */}
                        <section>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                                <MapPin className="w-5 h-5"/> Event Locations
                            </h3>
                            <div className="space-y-3">
                                {event.locations && event.locations.length > 0 ? (
                                    event.locations.map((loc, i) => (
                                        <Card key={i} className="shadow-sm border-slate-200">
                                            <CardContent className="p-4 flex gap-4 items-start">
                                                <div className="bg-blue-50 p-2 rounded-full text-blue-600 mt-1">
                                                    <MapPin className="w-4 h-4"/>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{loc.name}</h4>
                                                    <p className="text-sm text-slate-500">
                                                        {format(safeDate(loc.date), 'PPP')} 
                                                        {loc.time && <span> @ {loc.time}</span>}
                                                    </p>
                                                    {loc.mapUrl && (
                                                        <a href={loc.mapUrl} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View Map</a>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No locations confirmed yet.</p>
                                )}
                            </div>
                        </section>

                        {/* Studio Info (Banking & Privacy) */}
                        {studioInfo && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                                    <Info className="w-5 h-5"/> Payment & Legal
                                </h3>
                                <Card className="bg-slate-50 border-slate-200 shadow-sm">
                                    <CardContent className="p-5 space-y-6">
                                        {/* Banking */}
                                        {studioInfo.banking_details && (
                                            <div>
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4"/> Bank Details
                                                </h4>
                                                <div className="bg-white border rounded-md p-3 text-sm space-y-1 text-slate-600">
                                                    <p><span className="font-medium">Bank:</span> {studioInfo.banking_details.bank_name}</p>
                                                    <p><span className="font-medium">Branch:</span> {studioInfo.banking_details.branch}</p>
                                                    <p><span className="font-medium">Account Name:</span> {studioInfo.banking_details.account_name}</p>
                                                    <p><span className="font-medium">Account No:</span> {studioInfo.banking_details.account_number}</p>
                                                    {studioInfo.banking_details.mobile_number && <p><span className="font-medium">Mobile:</span> {studioInfo.banking_details.mobile_number}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Privacy */}
                                        {studioInfo.privacy_policy_notice && (
                                            <div>
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4"/> Privacy Notice
                                                </h4>
                                                <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                                    {studioInfo.privacy_policy_notice}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </section>
                        )}
                    </div>
                </div>

                <Separator className="my-8"/>

                {/* 3. APPROVAL SECTION */}
                <div className="max-w-2xl mx-auto">
                    {isApproved ? (
                        /* APPROVED STATE */
                        <Card className="bg-green-50 border-green-200 shadow-sm text-center">
                            <CardContent className="p-8 space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-800">Event Approved</h2>
                                <p className="text-green-700">Thank you for confirming your event details.</p>
                                
                                <div className="bg-white/60 rounded-lg p-4 text-sm text-left max-w-sm mx-auto space-y-2 border border-green-100">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Approved By:</span>
                                        <span className="font-medium text-slate-800">{event.customerName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Date:</span>
                                        <span className="font-medium text-slate-800">
                                            {event.approval?.confirmedAt ? format(safeDate(event.approval.confirmedAt), "PPP p") : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Verification:</span>
                                        <span className="font-medium text-slate-800">{event.approval?.verification_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Doc Number:</span>
                                        <span className="font-medium text-slate-800">{event.approval?.verification_document_number}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        /* APPROVAL FORM */
                        <Card className="border-t-4 border-t-[#1C4D8D] shadow-lg">
                            <CardHeader>
                                <CardTitle>Final Approval</CardTitle>
                                <CardDescription>Please verify your identity to electronically sign this quotation.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Read Only Pre-filled */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input value={event.customerName} disabled className="bg-slate-50"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mobile Number</Label>
                                        <Input value={event.customerMobile} disabled className="bg-slate-50"/>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Email Address</Label>
                                        <Input value={event.customerEmail} disabled className="bg-slate-50"/>
                                    </div>
                                </div>

                                <Separator />

                                {/* Verification Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Verification Document Type <span className="text-red-500">*</span></Label>
                                        <Select value={verifType} onValueChange={setVerifType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Document Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="id">National Identity Card (NIC)</SelectItem>
                                                <SelectItem value="passport">Passport</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>
                                            {verifType === 'id' ? 'NIC Number' : 'Passport Number'} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            placeholder={verifType === 'id' ? "e.g. 199012345678 or 901234567V" : "Enter Passport Number"}
                                            value={verifDocNum}
                                            onChange={(e) => setVerifDocNum(e.target.value.toUpperCase())}
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            {verifType === 'id' 
                                                ? "Accepts Sri Lankan Old (9 digits + V/X) or New (12 digits) format." 
                                                : "Enter your valid international passport number."}
                                        </p>
                                    </div>
                                </div>

                                <Alert className="bg-blue-50 border-blue-100">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-800">Declaration</AlertTitle>
                                    <AlertDescription className="text-blue-700 text-xs">
                                        By clicking "Approve Event", I confirm that the details provided above are accurate and I agree to the pricing and terms set forth by the studio.
                                    </AlertDescription>
                                </Alert>

                                <Button 
                                    onClick={handleApprove} 
                                    className="w-full bg-[#1C4D8D] hover:bg-[#163b6b] h-12 text-lg"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                                    ) : (
                                        "Approve Event"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
        </div>
    )
}