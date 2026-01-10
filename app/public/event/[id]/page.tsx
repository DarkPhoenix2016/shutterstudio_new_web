"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  updateDoc,
  collectionGroup,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"
import {
  Loader2,
  Calendar,
  MapPin,
  CheckCircle,
  Lock,
  CreditCard,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import Swal from "sweetalert2"

// UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

/* ================= TYPES ================= */

interface PublicEventData {
  id: string
  displayId?: string
  studioId: string
  eventName: string
  eventType: string
  status: string
  customerName: string
  customerEmail: string
  customerMobile: string
  couplePhotoUrl?: string
  days: { date: any; cost: number }[]
  totalBudget: number
  discount: number
  discountType: "fixed" | "percentage"
  finalBudget: number
  transactions: { amount: number; type: "income" | "expense" }[]
  approval?: {
    customer_confirmed: boolean
    confirmedAt?: any
    verification_type?: string
    verification_document_number?: string
  }
  locations?: { name: string; date: any; mapUrl?: string; time?: string }[]
  additionalServices?: { name: string; quantity: number; total: number }[]
  notes?: string
}

interface StudioInfo {
  privacy_policy_notice?: string
  banking_details?: {
    account_name: string
    account_number: string
    bank_name: string
    branch: string
    mobile_number?: string
  }
}

/* ================= HELPERS ================= */

const safeDate = (d: any) => {
  if (!d) return new Date()
  if (d instanceof Date) return d
  if (typeof d?.toDate === "function") return d.toDate()
  if (d?.seconds) return new Date(d.seconds * 1000)
  return new Date(d)
}

const normalizeUrl = (url?: string) => {
  if (!url) return "#"
  return url.startsWith("http") ? url : `https://${url}`
}

/* ================= PAGE ================= */

export default function CustomerEventApprovalPage() {
  const { id } = useParams()

  const [loading, setLoading] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [event, setEvent] = useState<PublicEventData | null>(null)
  const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /* ---------- AUTH & FETCH ---------- */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const eventsRef = collectionGroup(db, "Events")
      let q = query(eventsRef, where("id", "==", id))
      let snap = await getDocs(q)

      if (snap.empty) {
        q = query(eventsRef, where("displayId", "==", id))
        snap = await getDocs(q)
      }

      if (snap.empty) {
        Swal.fire("Error", "Event not found", "error")
        return
      }

      const docSnap = snap.docs[0]
      const data = docSnap.data() as PublicEventData
      const studioId = docSnap.ref.parent.parent?.id

      if (data.customerEmail.toLowerCase() !== authEmail.toLowerCase()) {
        Swal.fire("Access denied", "Email does not match", "error")
        return
      }

      const studioSnap = await getDoc(doc(db, "Studios", studioId!))
      const studioData = studioSnap.data() || {}

      setEvent({ ...data, id: docSnap.id, studioId: studioId! })
      setStudioInfo({
        privacy_policy_notice: studioData.privacy_policy_notice,
        banking_details: studioData.banking_details,
      })
      setIsAuthenticated(true)
    } catch {
      Swal.fire("Error", "Failed to load event", "error")
    } finally {
      setLoading(false)
    }
  }

  /* ---------- APPROVE ---------- */
  const handleApprove = async () => {
    if (!event) return
    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "Studios", event.studioId, "Events", event.id), {
        status: "Scheduled",
        approval: {
          customer_confirmed: true,
          confirmedAt: serverTimestamp(),
        },
      })

      setEvent({
        ...event,
        status: "Scheduled",
        approval: {
          customer_confirmed: true,
          confirmedAt: new Date(),
        },
      })

      Swal.fire("Success", "Event approved successfully", "success")
    } catch {
      Swal.fire("Error", "Approval failed", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---------- FINANCIALS ---------- */
  const financials = useMemo(() => {
    if (!event) return { paid: 0, due: 0 }
    const paid =
      event.transactions
        ?.filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0) || 0
    return { paid, due: event.finalBudget - paid }
  }, [event])

  /* ================= LOGIN ================= */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-t-4 border-t-[#1C4D8D]">
          <CardHeader className="text-center">
            <Lock className="mx-auto w-8 h-8 text-[#1C4D8D]" />
            <CardTitle>Customer Verification</CardTitle>
            <CardDescription>
              Enter your email to view your event details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Access Event
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-xs text-slate-400">
            Secured by ShutterStudio
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!event) return null
  const approved = event.approval?.customer_confirmed

  /* ================= VIEW ================= */
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HERO */}
        <Card className="overflow-hidden">
          <div className="relative h-56 bg-slate-900">
            <img
              src={event.couplePhotoUrl || "/api/placeholder/800/400"}
              className="w-full h-full object-cover opacity-80"
              alt="Cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <Badge className="mb-2">{event.eventType}</Badge>
              <h1 className="text-2xl font-bold">{event.eventName}</h1>
              <p className="flex items-center gap-2 text-sm text-slate-200">
                <Calendar className="w-4 h-4" />
                {format(safeDate(event.days?.[0]?.date), "PPP")}
              </p>
            </div>
          </div>
        </Card>

        {/* CUSTOMER DETAILS */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Name:</strong> {event.customerName}</p>
            <p><strong>Email:</strong> {event.customerEmail}</p>
            <p><strong>Phone:</strong> {event.customerMobile}</p>
          </CardContent>
        </Card>

        {/* LOCATIONS */}
        <Card>
          <CardHeader>
            <CardTitle>Event Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.locations?.length ? (
              event.locations.map((loc, i) => (
                <div key={i}>
                  <p className="font-medium">{loc.name}</p>
                  <p className="text-sm text-slate-500">
                    {format(safeDate(loc.date), "PPP")}
                    {loc.time && ` @ ${loc.time}`}
                  </p>
                  {loc.mapUrl && (
                    <a
                      href={normalizeUrl(loc.mapUrl)}
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
          </CardContent>
        </Card>

        {/* PACKAGE & SERVICES */}
        <Card>
          <CardHeader>
            <CardTitle>Packages & Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {event.days.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span>Day {i + 1}</span>
                <span>LKR {d.cost.toLocaleString()}</span>
              </div>
            ))}
            {event.additionalServices?.map((s, i) => (
              <div key={i} className="flex justify-between">
                <span>{s.name} × {s.quantity}</span>
                <span>LKR {s.total.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* FINANCIAL SUMMARY */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Final Budget</span>
              <span>LKR {event.finalBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Paid</span>
              <span>LKR {financials.paid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-700 font-semibold">
              <span>Due</span>
              <span>LKR {financials.due.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* NOTES */}
        {event.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line text-slate-600">
              {event.notes}
            </CardContent>
          </Card>
        )}

        {/* BANK + PRIVACY */}
        {studioInfo?.banking_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>{studioInfo.banking_details.bank_name}</p>
              <p>{studioInfo.banking_details.branch}</p>
              <p>{studioInfo.banking_details.account_name}</p>
              <p>{studioInfo.banking_details.account_number}</p>
            </CardContent>
          </Card>
        )}

        {studioInfo?.privacy_policy_notice && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Privacy Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs whitespace-pre-line text-slate-500">
              {studioInfo.privacy_policy_notice}
            </CardContent>
          </Card>
        )}

        {/* APPROVAL */}
        <Card>
          <CardContent className="text-center">
            {approved ? (
              <>
                <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-700">
                  Approved on{" "}
                  {format(safeDate(event.approval?.confirmedAt), "PPP p")}
                </p>
              </>
            ) : (
              <>
                <Alert className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Declaration</AlertTitle>
                  <AlertDescription>
                    By approving, you confirm the above details are accurate.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full h-12"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : null}
                  Approve Event
                </Button>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
