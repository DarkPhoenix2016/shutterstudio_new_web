"use client"

import { format } from "date-fns"
import jsPDF from "jspdf"
import { Download, Loader2, Printer, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { safeDate } from "@/lib/date-utils"
import { EventData, PackageData } from "@/services/event-service"

interface StudioBranding {
  name?: string
  logo_url?: string
  address?: string
  phone?: string
  website?: string
}

interface SavePayload {
  blob: Blob
  invoiceNumber: string
  fileName: string
  total: number
}

interface EventInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: EventData
  packages: PackageData[]
  studio: StudioBranding | null
  currency: string
  invoiceNumber: string
  onAutoSave: (payload: SavePayload) => Promise<void>
}

const mm = (n: number) => n

const money = (value: number, currency: string) =>
  `${currency} ${(Number(value) || 0).toLocaleString()}`

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" })
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function EventInvoiceDialog({
  open,
  onOpenChange,
  event,
  packages,
  studio,
  currency,
  invoiceNumber,
  onAutoSave
}: EventInvoiceDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedForInvoiceRef = useRef<string | null>(null)

  const packageMap = useMemo(() => {
    return new Map(packages.map((p) => [p.id, p.name]))
  }, [packages])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!open) return

    let active = true
    const run = async () => {
      setGenerating(true)
      setSaved(false)
      setSaveError(null)

      const pdf = await buildInvoicePdf({
        event,
        invoiceNumber,
        currency,
        studio,
        packageMap
      })
      const blob = pdf.output("blob")
      const blobUrl = URL.createObjectURL(blob)

      if (!active) {
        URL.revokeObjectURL(blobUrl)
        return
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPdfBlob(blob)
      setPreviewUrl(blobUrl)
      setGenerating(false)
    }

    run().catch(() => setGenerating(false))
    return () => {
      active = false
    }
  }, [open, event, invoiceNumber, currency, studio, packageMap])

  useEffect(() => {
    if (!open || !pdfBlob) return
    if (savedForInvoiceRef.current === invoiceNumber) return

    const save = async () => {
      setSaving(true)
      try {
        await onAutoSave({
          blob: pdfBlob,
          invoiceNumber,
          fileName: `${invoiceNumber}.pdf`,
          total: Number(event.finalBudget || 0)
        })
        savedForInvoiceRef.current = invoiceNumber
        setSaved(true)
        setSaveError(null)
      } catch (e) {
        console.error(e)
        setSaveError("Failed to save invoice to cloud")
      } finally {
        setSaving(false)
      }
    }

    save()
  }, [open, pdfBlob, invoiceNumber, event.finalBudget, onAutoSave])

  const handleDownload = () => {
    if (!previewUrl || !pdfBlob) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = `${invoiceNumber}.pdf`
    a.click()
  }

  const handlePrint = () => {
    if (!previewUrl) return
    const w = window.open(previewUrl, "_blank")
    if (!w) return
    w.addEventListener("load", () => w.print(), { once: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[180vw] max-w-[98vw] p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Event Invoice</DialogTitle>
        <DialogDescription className="sr-only">Generated invoice for the event</DialogDescription>

        <div className="flex items-center justify-between border-b bg-white p-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-800">Invoice Preview</h3>
            <Badge variant="outline">{invoiceNumber}</Badge>
            {saving && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Saving...</Badge>}
            {!saving && saved && <Badge className="bg-green-100 text-green-800 border-green-200">Saved</Badge>}
            {saveError && <Badge className="bg-red-100 text-red-800 border-red-200">{saveError}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!previewUrl || generating}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!previewUrl || generating}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="h-[82vh] overflow-y-auto bg-slate-50 p-4">
          {generating ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating invoice PDF...
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title="Invoice PDF Preview"
              className="w-full h-full min-h-[70vh] bg-white border rounded-md"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Unable to generate preview.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function buildInvoicePdf({
  event,
  invoiceNumber,
  currency,
  studio,
  packageMap
}: {
  event: EventData
  invoiceNumber: string
  currency: string
  studio: StudioBranding | null
  packageMap: Map<string, string>
}) {
  const doc = new jsPDF("p", "mm", "a4")
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = mm(14)
  const usableW = pageW - margin * 2
  const headerH = mm(28)
  const footerH = mm(10)
  const lineH = mm(6)

  let y = margin + headerH
  let page = 1

  const logo = studio?.logo_url ? await toDataUrl(studio.logo_url) : null

  const addHeader = () => {
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(margin, margin + headerH - 4, pageW - margin, margin + headerH - 4)

    if (logo) {
      try {
        doc.addImage(logo, "PNG", margin, margin, 18, 18)
      } catch {
        // ignore logo rendering failure
      }
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text(studio?.name || "Studio", margin + (logo ? 22 : 0), margin + 6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const brandLine = [studio?.address, studio?.phone, studio?.website].filter(Boolean).join(" | ")
    if (brandLine) {
      doc.text(brandLine, margin + (logo ? 22 : 0), margin + 12)
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("EVENT INVOICE", pageW - margin, margin + 7, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Invoice #: ${invoiceNumber}`, pageW - margin, margin + 13, { align: "right" })
    doc.text(`Generated: ${format(new Date(), "PPP p")}`, pageW - margin, margin + 18, { align: "right" })
    y = margin + headerH
  }

  const addFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 5, { align: "right" })
  }

  const ensure = (h = lineH) => {
    if (y + h > pageH - margin - footerH) {
      addFooter(page)
      doc.addPage()
      page += 1
      addHeader()
    }
  }

  const section = (title: string) => {
    ensure(10)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(28, 77, 141)
    doc.text(title, margin, y)
    y += 2
    doc.setDrawColor(203, 213, 225)
    doc.line(margin, y + 2, pageW - margin, y + 2)
    y += 8
    doc.setTextColor(0)
  }

  const kv = (label: string, value: string) => {
    ensure(lineH)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(`${label}:`, margin, y)
    doc.setFont("helvetica", "normal")
    const wrapped = doc.splitTextToSize(value || "-", usableW - 30)
    doc.text(wrapped, margin + 30, y)
    y += Math.max(lineH, wrapped.length * 4.5)
  }

  addHeader()

  section("Event Information")
  const eventDate = event.days?.[0]?.date ? format(safeDate(event.days[0].date), "PPP") : "Date TBD"
  kv("Event", event.eventName || "-")
  kv("Type", event.eventType || "-")
  kv("Event ID", event.displayId || event.id || "-")
  kv("Date", eventDate)
  kv("Status", event.status || "-")

  section("Customer Information")
  kv("Name", event.customerName || "-")
  kv("Email", event.customerEmail || "-")
  kv("Mobile", event.customerMobile || "-")

  section("Schedule & Package Breakdown")
  const days = event.days || []
  if (days.length === 0) {
    kv("Schedule", "No schedule configured")
  } else {
    days.forEach((d, i) => {
      const dayDate = d.date ? format(safeDate(d.date), "PPP") : "Date TBD"
      const packageName = d.type === "package" && d.packageId ? (packageMap.get(d.packageId) || "Package") : "Custom"
      kv(`Day ${i + 1}`, `${dayDate} | ${packageName} | ${money(d.cost || 0, currency)}`)

      if (d.type === "custom" && d.customItems?.length) {
        d.customItems.forEach((item) => {
          kv(
            "  - Item",
            `${item.name || "Item"} x${item.quantity || 0}${item.unit ? ` ${item.unit}` : ""} @ ${money(item.price || 0, currency)}`
          )
        })
      }
    })
  }

  section("Additional Services")
  if (!event.additionalServices?.length) {
    kv("Services", "No additional services")
  } else {
    event.additionalServices.forEach((s, i) => {
      kv(
        `Service ${i + 1}`,
        `${s.name} | Qty ${s.quantity} | Unit ${money(s.pricePerUnit || 0, currency)} | Total ${money(s.total || 0, currency)}`
      )
    })
  }

  section("Financial Summary")
  const baseCost = (event.days || []).reduce((acc, d) => acc + (Number(d.cost) || 0), 0)
  const servicesCost = (event.additionalServices || []).reduce((acc, s) => acc + (Number(s.total) || 0), 0)
  const subtotal = baseCost + servicesCost
  const discountAmount = event.discountType === "percentage"
    ? subtotal * ((Number(event.discount) || 0) / 100)
    : Number(event.discount || 0)
  const finalBudget = Math.max(0, subtotal - discountAmount)
  const paid = (event.transactions || [])
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
  const due = finalBudget - paid

  kv("Base Cost", money(baseCost, currency))
  kv("Additional Services", money(servicesCost, currency))
  kv("Subtotal", money(subtotal, currency))
  kv(
    "Discount",
    event.discountType === "percentage"
      ? `${Number(event.discount || 0)}% (${money(discountAmount, currency)})`
      : money(discountAmount, currency)
  )
  kv("Final Budget", money(finalBudget, currency))
  kv("Payments Received", money(paid, currency))
  kv("Amount Due", money(due, currency))

  if (event.locations?.length) {
    section("Locations")
    event.locations.forEach((l, i) => {
      const locDate = l.date ? format(safeDate(l.date), "PPP") : "Date TBD"
      kv(`Location ${i + 1}`, `${l.name} | ${locDate}${l.time ? ` | ${l.time}` : ""}`)
    })
  }

  if (event.contacts?.length) {
    section("Event Contacts")
    event.contacts.forEach((c, i) => {
      kv(`Contact ${i + 1}`, `${c.name} (${c.role}) | ${c.phone}`)
    })
  }

  if (event.notes) {
    section("Notes")
    kv("Details", event.notes)
  }

  ensure(14)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(110)
  doc.text(
    "This invoice is generated from event data. Update the event details and regenerate if corrections are required.",
    margin,
    pageH - margin - 2
  )

  addFooter(page)
  return doc
}
