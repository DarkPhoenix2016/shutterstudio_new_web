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
            <CardDescription>Enter your email to view the quotation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Access
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
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden space-y-6">

        {/* HEADER */}
        <div className="p-6 border-b flex justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1C4D8D]">Event Quotation</h1>
            <p className="text-sm text-slate-500">
              Ref: {event.displayId || event.id}
            </p>
          </div>
          <Badge
            className={
              approved
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }
          >
            {approved ? "Approved" : "Pending"}
          </Badge>
        </div>

        {/* SUMMARY */}
        <div className="px-6 space-y-1">
          <h2 className="text-xl font-semibold">{event.eventName}</h2>
          <p className="text-sm text-slate-600">
            {event.eventType} ·{" "}
            {format(safeDate(event.days?.[0]?.date), "PPP")}
          </p>
        </div>

        {/* CUSTOMER */}
        <div className="px-6 text-sm space-y-1">
          <p><strong>Name:</strong> {event.customerName}</p>
          <p><strong>Email:</strong> {event.customerEmail}</p>
          <p><strong>Phone:</strong> {event.customerMobile}</p>
        </div>

        {/* LOCATIONS */}
        {event.locations?.length && (
          <div className="px-6 space-y-3">
            {event.locations.map((l, i) => (
              <div key={i}>
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-slate-500">
                  {format(safeDate(l.date), "PPP")} {l.time && `@ ${l.time}`}
                </p>
                {l.mapUrl && (
                  <a
                    href={normalizeUrl(l.mapUrl)}
                    target="_blank"
                    className="text-xs text-blue-600 underline"
                  >
                    View Map
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* SERVICES */}
        <div className="px-6 space-y-2 text-sm">
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
        </div>

        <Separator />

        {/* FINANCIALS */}
        <div className="px-6 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>LKR {event.totalBudget.toLocaleString()}</span>
          </div>
          {event.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>- LKR {event.discount.toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Final</span>
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
        </div>

        {/* NOTES */}
        {event.notes && (
          <div className="px-6 text-sm whitespace-pre-line text-slate-600">
            {event.notes}
          </div>
        )}

        {/* BANK + PRIVACY */}
        {studioInfo?.banking_details && (
          <div className="px-6 text-sm">
            <h4 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Bank Details
            </h4>
            <p>{studioInfo.banking_details.bank_name}</p>
            <p>{studioInfo.banking_details.branch}</p>
            <p>{studioInfo.banking_details.account_name}</p>
            <p>{studioInfo.banking_details.account_number}</p>
          </div>
        )}

        {studioInfo?.privacy_policy_notice && (
          <div className="px-6 text-xs whitespace-pre-line text-slate-500">
            <ShieldCheck className="inline w-4 h-4 mr-1" />
            {studioInfo.privacy_policy_notice}
          </div>
        )}

        {/* APPROVAL */}
        <div className="px-6 pb-6">
          {approved ? (
            <div className="text-center text-green-700">
              <CheckCircle className="mx-auto w-10 h-10" />
              Approved on{" "}
              {format(
                safeDate(event.approval?.confirmedAt),
                "PPP p"
              )}
            </div>
          ) : (
            <Button
              className="w-full h-12"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" />
              ) : null}
              Approve Quotation
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
