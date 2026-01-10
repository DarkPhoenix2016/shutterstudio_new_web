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
  <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans text-slate-800">
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">

      {/* HEADER */}
      <div className="border-b p-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#1C4D8D]">
            Event Quotation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reference: {event.displayId || event.id}
          </p>
        </div>

        {isApproved ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
            <CheckCircle className="w-3 h-3" /> Approved
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Pending Approval
          </Badge>
        )}
      </div>

      {/* EVENT SUMMARY */}
      <div className="p-6 space-y-2 border-b">
        <h2 className="text-xl font-semibold">{event.eventName}</h2>
        <p className="text-sm text-slate-600">
          {event.eventType} ·{" "}
          {event.days?.[0]?.date
            ? format(safeDate(event.days[0].date), "PPP")
            : "Date TBD"}
        </p>
      </div>

      {/* CUSTOMER DETAILS */}
      <section className="p-6 border-b space-y-3">
        <h3 className="text-sm font-bold uppercase text-slate-500">
          Customer Details
        </h3>

        <div className="text-sm space-y-1">
          <p><strong>Name:</strong> {event.customerName}</p>
          <p><strong>Email:</strong> {event.customerEmail}</p>
          <p><strong>Phone:</strong> {event.customerMobile}</p>
        </div>
      </section>

      {/* EVENT LOCATIONS */}
      {event.locations?.length ? (
        event.locations.map((loc, i) => (
            <div key={i} className="text-sm">
            <p className="font-medium">{loc.name}</p>
            <p className="text-slate-500">
                {format(safeDate(loc.date), "PPP")} {loc.time && `@ ${loc.time}`}
            </p>
            {loc.mapUrl && (
                <a
                href={loc.mapUrl}
                target="_blank"
                className="text-xs text-blue-600 underline"
                >
                View Map
                </a>
            )}
            </div>
        ))
        ) : (
        <p className="text-sm text-slate-400 italic">
            No locations confirmed yet.
        </p>
        )}

      {/* LINE ITEMS */}
      <section className="p-6 border-b space-y-4">
        <h3 className="text-sm font-bold uppercase text-slate-500">
          Services & Packages
        </h3>

        {/* Day-based packages */}
        {event.days.map((day, i) => (
        <div key={i} className="flex justify-between text-sm">
            <span>
            Day {i + 1} — {day.type === "package" ? "Package" : "Custom Plan"}
            </span>
            <span className="font-medium">
            LKR {day.cost.toLocaleString()}
            </span>
        </div>
        ))}

        {/* Additional Services */}
        {event.additionalServices?.map((svc, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {svc.name} × {svc.quantity}
            </span>
            <span className="font-medium">
              LKR {svc.total.toLocaleString()}
            </span>
          </div>
        ))}
      </section>

      {/* FINANCIAL SUMMARY */}
      <section className="p-6 border-b space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total</span>
          <span>LKR {event.totalBudget.toLocaleString()}</span>
        </div>

        {event.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>
              Discount ({event.discountType})
            </span>
            <span>
              − LKR {event.discount.toLocaleString()}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-bold text-base">
          <span>Final Total</span>
          <span>LKR {event.finalBudget.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-green-700">
          <span>Paid</span>
          <span>LKR {financials.paid.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-red-700 font-semibold">
          <span>Balance Due</span>
          <span>LKR {financials.due.toLocaleString()}</span>
        </div>
      </section>

      {/* NOTES */}
      {event.notes && (
        <section className="p-6 border-b">
          <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">
            Notes
          </h3>
          <p className="text-sm text-slate-600 whitespace-pre-line">
            {event.notes}
          </p>
        </section>
      )}

      {/* APPROVAL */}
      <section className="p-6">
        {isApproved ? (
          <div className="text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-semibold text-green-700">
              Approved on{" "}
              {event.approval?.confirmedAt
                ? format(safeDate(event.approval.confirmedAt), "PPP p")
                : ""}
            </p>
            <p className="text-xs text-slate-500">
              Verified using {event.approval?.verification_type}
            </p>
          </div>
        ) : (
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full h-12 bg-[#1C4D8D] text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Approve Quotation"
            )}
          </Button>
        )}
      </section>

    </div>
  </div>
)



}