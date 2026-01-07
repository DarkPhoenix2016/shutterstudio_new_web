"use client"

import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Printer,
  Download,
  Share2,
  Mail,
  Loader2,
  FileText,
  X,
  ExternalLink
} from "lucide-react"

import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import Swal from "sweetalert2"
import { format, parseISO } from "date-fns"

/* ───────────────────────── TYPES ───────────────────────── */

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  discount: number // Item-wise discount
  total: number
}

export interface InvoiceDetails {
  id: string
  studioName: string
  amount: number // Grand Total
  subTotal?: number // Amount before global discount
  globalDiscount?: number // Invoice-wise discount
  status: "Paid" | "Pending" | "Overdue"
  generatedDate: string
  dueDate: string
  items: string // Summary Text
  lineItems?: InvoiceItem[] // Array of detailed items
  paidAt?: string
  cycle?: string
  studioEmail?: string
  studioAddress?: string
}

interface InvoiceDialogProps {
  invoice: InvoiceDetails
  isOpen: boolean
  onClose: () => void
}

/* ─────────────────────── CONSTANTS ─────────────────────── */

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
})

const STATUS_STYLES: Record<InvoiceDetails["status"], string> = {
  Paid: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Overdue: "bg-red-100 text-red-800"
}

/* ─────────────────────── COMPONENT ─────────────────────── */

export function InvoiceDialog({
  invoice,
  isOpen,
  onClose
}: InvoiceDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Use subTotal if available, otherwise assume amount is subTotal (legacy compatibility)
  const subTotal = invoice.subTotal || invoice.amount
  const globalDiscount = invoice.globalDiscount || 0

  /* ───────────────────── ACTIONS ───────────────────── */

  const generatePdf = async (): Promise<jsPDF | null> => {
    if (!invoiceRef.current) return null

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        const allElements = clonedDoc.querySelectorAll("*");
        allElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor && style.backgroundColor.startsWith("lab")) {
                (el as HTMLElement).style.backgroundColor = "#ffffff";
            }
            if (style.color && style.color.startsWith("lab")) {
                (el as HTMLElement).style.color = "#000000";
            }
            if (style.borderColor && style.borderColor.startsWith("lab")) {
                (el as HTMLElement).style.borderColor = "#e5e7eb";
            }
        });
      }
    })

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft > 0) {
      position -= pdfHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    return pdf
  }

  const handlePrint = () => window.print()

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const pdf = await generatePdf()
      if (!pdf) throw new Error()
      pdf.save(`Invoice-${invoice.id}.pdf`)
      Toast.fire({ icon: "success", title: "Invoice downloaded" })
    } catch {
      Toast.fire({ icon: "error", title: "Download failed" })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleOpenNewTab = async () => {
    setIsOpening(true)
    try {
      const pdf = await generatePdf()
      if (!pdf) throw new Error()
      const blob = pdf.output("blob")
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      Toast.fire({ icon: "error", title: "Failed to open PDF" })
    } finally {
      setIsOpening(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Invoice ${invoice.id}`,
        text: `Invoice for ${invoice.studioName} - LKR ${invoice.amount.toLocaleString()}`,
        url: window.location.href
      })
    } else {
      await navigator.clipboard.writeText(
        `Invoice ${invoice.id} - LKR ${invoice.amount.toLocaleString()}`
      )
      Toast.fire({ icon: "success", title: "Invoice copied" })
    }
  }

  const handleSendEmailPreview = async () => {
    if (!invoice.studioEmail) {
      Toast.fire({ icon: "warning", title: "No email available" })
      return
    }
    setIsSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsSending(false)
    Toast.fire({ icon: "success", title: `Sent to ${invoice.studioEmail}` })
  }

  /* ───────────────────── RENDER ───────────────────── */

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-50/50 gap-0">
        <DialogTitle className="sr-only">Invoice {invoice.id}</DialogTitle>
        <DialogDescription className="sr-only">Details for {invoice.studioName}</DialogDescription>

        {/* HEADER CONTROLS */}
        <div className="flex flex-col gap-4 p-4 bg-white border-b print:hidden sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#1C4D8D]" />
            Invoice Details
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleOpenNewTab} disabled={isOpening}>
              {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />} Open PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />} Download
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
            <Button size="sm" className="bg-[#1C4D8D] text-white" onClick={handleSendEmailPreview} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />} Send Email
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto sm:ml-0"><X className="h-5 w-5 text-slate-500" /></Button>
          </div>
        </div>

        {/* INVOICE DOCUMENT */}
        <div className="p-8 max-h-[85vh] overflow-y-auto print:p-0">
          <div ref={invoiceRef} className="print-area bg-white p-8 border rounded-lg min-h-[900px] flex flex-col justify-between" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
            
            {/* INVOICE HEADER */}
            <div>
              <div className="flex justify-between mb-8">
                <div>
                  <div className="h-12 w-12 bg-[#1C4D8D] text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">S</div>
                  <h1 className="text-2xl font-bold">ShutterStudio</h1>
                  <p className="text-sm text-gray-500">Colombo 03, Sri Lanka<br />billing@shutterstudio.com</p>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-bold text-gray-200 uppercase">Invoice</h2>
                  <p className="font-mono text-lg">#{invoice.id}</p>
                  <Badge className={`mt-2 ${STATUS_STYLES[invoice.status]}`}>{invoice.status}</Badge>
                </div>
              </div>

              <Separator className="my-8" />

              {/* BILL TO */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400 mb-2">Billed To</p>
                  <p className="font-semibold text-lg">{invoice.studioName}</p>
                  {invoice.studioEmail && <p className="text-sm text-gray-500">{invoice.studioEmail}</p>}
                  {invoice.studioAddress && <p className="text-sm text-gray-500 whitespace-pre-wrap">{invoice.studioAddress}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Info label="Issued">{format(parseISO(invoice.generatedDate), "MMM dd, yyyy")}</Info>
                  <Info label="Due">{format(parseISO(invoice.dueDate), "MMM dd, yyyy")}</Info>
                  {invoice.paidAt && <Info label="Paid On" highlight>{format(parseISO(invoice.paidAt), "MMM dd, yyyy HH:mm")}</Info>}
                </div>
              </div>

              {/* ITEMS TABLE */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 w-[40%]">Description</th>
                    {/* Only show detailed columns if we have detailed items */}
                    {invoice.lineItems && (
                        <>
                            <th className="text-center py-3 w-[10%]">Qty</th>
                            <th className="text-right py-3 w-[15%]">Price</th>
                            <th className="text-right py-3 w-[15%]">Discount</th>
                        </>
                    )}
                    {!invoice.lineItems && <th className="text-right py-3 w-32">Cycle</th>}
                    <th className="text-right py-3 w-[20%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems ? (
                      // RENDER DETAILED ITEMS
                      invoice.lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                            <td className="py-4 text-sm text-slate-800 font-medium">{item.description}</td>
                            <td className="py-4 text-sm text-center text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-sm text-right text-slate-600">{item.unitPrice.toLocaleString()}</td>
                            <td className="py-4 text-sm text-right text-red-500">{item.discount > 0 ? `-${item.discount.toLocaleString()}` : '-'}</td>
                            <td className="py-4 text-sm text-right font-medium text-slate-800">LKR {item.total.toLocaleString()}</td>
                        </tr>
                      ))
                  ) : (
                      // RENDER LEGACY / SIMPLE ITEM
                      <tr className="border-b border-gray-200">
                        <td className="py-4">
                          <p className="font-medium text-sm">{invoice.items}</p>
                          <p className="text-xs text-gray-500">Platform Subscription Fee</p>
                        </td>
                        <td className="py-4 text-right text-sm">{invoice.cycle || "Monthly"}</td>
                        <td className="py-4 text-right font-medium text-sm">LKR {invoice.amount.toLocaleString()}</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div>
              <div className="flex justify-end mb-8">
                <div className="w-1/2 space-y-3">
                  <Row label="Subtotal" value={subTotal} />
                  {globalDiscount > 0 && (
                      <Row label="Global Discount" value={globalDiscount} isDiscount />
                  )}
                  <Row label="Tax (0%)" value={0} />
                  <Separator />
                  <Row label="Total Due" value={invoice.amount} highlight />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600">
                <p className="font-semibold mb-1">Terms & Conditions</p>
                <p>Payment due within 7 days. Include invoice #<b> {invoice.id}</b> in transfers.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, children, highlight }: { label: string, children: React.ReactNode, highlight?: boolean }) {
  return (
    <div className={highlight ? "col-span-2 text-green-700" : ""}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

function Row({ label, value, highlight, isDiscount }: { label: string, value: number, highlight?: boolean, isDiscount?: boolean }) {
  return (
    <div className={`flex justify-between ${highlight ? "text-lg font-bold text-[#1C4D8D]" : "text-sm"} ${isDiscount ? "text-red-500" : ""}`}>
      <span>{label}</span>
      <span>{isDiscount ? "-" : ""}LKR {value.toLocaleString()}</span>
    </div>
  )
}