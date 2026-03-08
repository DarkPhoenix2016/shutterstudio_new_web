"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog"
import { 
  CreditCard, Calendar, CheckCircle2, Clock, FileText, Loader2, Link as LinkIcon, AlertTriangle, Edit, Trash2, Plus, ChevronLeft, ChevronRight, Search 
} from "lucide-react"
import Swal from "sweetalert2"
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logAuditAction } from "@/lib/logger"
import { format, addMonths, addYears, differenceInDays } from "date-fns"
import { InvoiceDialog, InvoiceDetails, InvoiceItem } from "@/components/admin/InvoiceDialog"
import { safeDate } from "@/lib/date-utils"

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(amount)
}

// --- TYPES ---
interface PackageConfig {
  id: string
  name: string
  price: number
}

interface StudioBillingInfo {
  id: string
  name: string
  packageId: string
  packageName: string
  price: number
  cycle: "monthly" | "annual"
  registeredDate: string
  lastInvoiceNo: string
  nextInvoiceSeq: number
  invoicePrefix: string
  nextBillingDate: Date | null
  daysPending: number
  isMapped: boolean
  email?: string 
  address?: string 
}

interface InvoiceData extends InvoiceDetails {
  studioId: string
}

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
})

const ITEMS_PER_PAGE = 20
const DIALOG_ITEMS_PER_PAGE = 5

export default function BillingPage() {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [studios, setStudios] = useState<StudioBillingInfo[]>([])
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [packages, setPackages] = useState<Record<string, PackageConfig>>({})

  // Search States
  const [studioSearch, setStudioSearch] = useState("")
  const [invoiceSearch, setInvoiceSearch] = useState("")

  // Pagination States
  const [studioPage, setStudioPage] = useState(1)
  const [invoicePage, setInvoicePage] = useState(1)

  // Mapping State
  const [isMappingOpen, setIsMappingOpen] = useState(false)
  const [mappingStudio, setMappingStudio] = useState<StudioBillingInfo | null>(null)
  const [mapForm, setMapForm] = useState({ packageId: "", cycle: "monthly", prefix: "INV", regDate: "" })
  const [isSavingMap, setIsSavingMap] = useState(false)

  // Invoice Gen State
  const [isGenInvoiceOpen, setIsGenInvoiceOpen] = useState(false)
  const [genInvType, setGenInvType] = useState<"standard" | "custom">("standard")
  const [targetStudio, setTargetStudio] = useState<StudioBillingInfo | null>(null)
  const [customItems, setCustomItems] = useState<Array<{ desc: string, qty: number, price: number, discount: number }>>([
      { desc: "", qty: 1, price: 0, discount: 0 }
  ])
  const [globalDiscount, setGlobalDiscount] = useState(0)

  // Invoice View State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)

  // Studio Invoice History State
  const [historyStudio, setHistoryStudio] = useState<StudioBillingInfo | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [studioHistoryInvoices, setStudioHistoryInvoices] = useState<InvoiceData[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState("")
  const [historyPage, setHistoryPage] = useState(1)

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        // A. Packages
        const platformPkgDoc = await getDoc(doc(db, "Platform", "packages"))
        const pkgMap: Record<string, PackageConfig> = {}
        if (platformPkgDoc.exists()) {
            const data = platformPkgDoc.data()
            const list = data.packages_list || []
            list.forEach((pid: string) => {
                if(data[pid]) {
                    pkgMap[pid] = { id: pid, name: data[pid].name, price: data[pid].price }
                    if(data[pid].name) pkgMap[data[pid].name] = { id: pid, name: data[pid].name, price: data[pid].price }
                }
            })
        }
        setPackages(pkgMap)

        // B. Studios
        const studiosSnap = await getDocs(collection(db, "Studios"))
        const studioList = await Promise.all(studiosSnap.docs.map(async (docSnap) => {
            const d = docSnap.data()
            const studioId = docSnap.id
            const configRef = doc(db, `Studios/${studioId}/Subscription/config`)
            const configSnap = await getDoc(configRef)
            const config = configSnap.exists() ? configSnap.data() : null
            const isMapped = !!config && !!config.packageId
            const regDateObj = config?.regDate ? safeDate(config.regDate) : (d.createdAt ? safeDate(d.createdAt) : new Date())
            const pkgInfo = isMapped ? pkgMap[config.packageId] : null
            let nextDate = regDateObj
            let daysLeft = 0
            if (isMapped) {
                const cycle = config.cycle?.toLowerCase() || "monthly"
                const today = new Date()
                let tempDate = new Date(regDateObj)
                while (tempDate < today) {
                    tempDate = cycle === "annual" ? addYears(tempDate, 1) : addMonths(tempDate, 1)
                }
                nextDate = tempDate
                daysLeft = differenceInDays(nextDate, today)
            }
            const currentSeq = config?.invoice_number || 1000
            const prefix = config?.invoice_prefix || "INV"
            const lastInvStr = currentSeq > 1000 ? `${prefix}-${currentSeq - 1}` : "N/A"
            return {
                id: studioId,
                name: d.name || "Unnamed",
                email: d.email || "",
                address: d.address || "",
                isMapped,
                packageId: config?.packageId || "",
                packageName: pkgInfo?.name || "Unassigned",
                price: pkgInfo?.price || 0,
                cycle: config?.cycle || "monthly",
                registeredDate: format(regDateObj, 'yyyy-MM-dd'),
                invoicePrefix: prefix,
                nextInvoiceSeq: currentSeq,
                lastInvoiceNo: lastInvStr,
                nextBillingDate: isMapped ? nextDate : null,
                daysPending: isMapped ? daysLeft : 0
            } as StudioBillingInfo
        }))
        setStudios(studioList)

        // C. Invoices
        const invQuery = query(collection(db, "Invoices"), orderBy("generatedDate", "desc"))
        const invSnap = await getDocs(invQuery)
        const invList: InvoiceData[] = invSnap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                generatedDate: safeDate(data.generatedDate).toISOString(),
                dueDate: safeDate(data.dueDate).toISOString(),
                paidAt: data.paidAt ? safeDate(data.paidAt).toISOString() : undefined
            } as InvoiceData
        })
        setInvoices(invList)

      } catch (e) {
        console.error("Billing Load Error:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // --- FILTERS ---
  const filteredStudios = studios.filter(s => 
    s.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
    s.packageName.toLowerCase().includes(studioSearch.toLowerCase()) ||
    s.lastInvoiceNo.toLowerCase().includes(studioSearch.toLowerCase())
  )
  const totalStudioPages = Math.ceil(filteredStudios.length / ITEMS_PER_PAGE)
  const currentStudioItems = filteredStudios.slice((studioPage - 1) * ITEMS_PER_PAGE, studioPage * ITEMS_PER_PAGE)
  useEffect(() => { setStudioPage(1) }, [studioSearch])

  const filteredInvoices = invoices.filter(inv => 
    inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) || 
    inv.studioName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.status.toLowerCase().includes(invoiceSearch.toLowerCase())
  )
  const totalInvoicePages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  const currentInvoiceItems = filteredInvoices.slice((invoicePage - 1) * ITEMS_PER_PAGE, invoicePage * ITEMS_PER_PAGE)
  useEffect(() => { setInvoicePage(1) }, [invoiceSearch])

  // --- MAPPING ---
  const openMappingDialog = (studio: StudioBillingInfo) => {
    setMappingStudio(studio)
    setMapForm({
        packageId: studio.packageId || Object.keys(packages)[0] || "",
        cycle: studio.cycle || "monthly",
        prefix: studio.invoicePrefix || "INV",
        regDate: studio.registeredDate
    })
    setIsMappingOpen(true)
  }

  const handleSaveMapping = async () => {
    if (!mappingStudio || !mapForm.packageId) return
    setIsSavingMap(true)
    try {
        const pkgName = packages[mapForm.packageId]?.name || mapForm.packageId
        const subConfigRef = doc(db, `Studios/${mappingStudio.id}/Subscription/config`)
        const updateData: any = {
            packageId: mapForm.packageId,
            packageName: pkgName,
            cycle: mapForm.cycle,
            price: packages[mapForm.packageId]?.price || 0,
            regDate: new Date(mapForm.regDate).toISOString(),
            invoice_prefix: mapForm.prefix.toUpperCase(),
            mappedAt: new Date().toISOString()
        }
        if (!mappingStudio.isMapped) updateData.invoice_number = 1000
        await setDoc(subConfigRef, updateData, { merge: true })
        setStudios(prev => prev.map(s => {
            if (s.id === mappingStudio.id) {
                const regDateObj = new Date(mapForm.regDate)
                let nextDate = new Date(regDateObj)
                const today = new Date()
                while (nextDate < today) {
                    nextDate = mapForm.cycle === "annual" ? addYears(nextDate, 1) : addMonths(nextDate, 1)
                }
                return {
                    ...s,
                    isMapped: true,
                    packageId: mapForm.packageId,
                    packageName: pkgName,
                    price: packages[mapForm.packageId]?.price || 0,
                    cycle: mapForm.cycle as any,
                    invoicePrefix: mapForm.prefix.toUpperCase(),
                    registeredDate: mapForm.regDate,
                    nextBillingDate: nextDate,
                    daysPending: differenceInDays(nextDate, today),
                    nextInvoiceSeq: s.isMapped ? s.nextInvoiceSeq : 1000 
                }
            }
            return s
        }))
        Toast.fire({ icon: 'success', title: 'Configuration saved' })
        setIsMappingOpen(false)
        if (currentUser) await logAuditAction("MAP_PACKAGE", `Updated billing for ${mappingStudio.name}`, currentUser, "Billing")
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Mapping failed' })
    } finally {
        setIsSavingMap(false)
    }
  }

  // --- INVOICE GEN ---
  const addCustomItem = () => setCustomItems([...customItems, { desc: "", qty: 1, price: 0, discount: 0 }])
  const removeCustomItem = (idx: number) => setCustomItems(customItems.filter((_, i) => i !== idx))
  const updateCustomItem = (idx: number, field: string, value: any) => {
      const newItems = [...customItems]
      // @ts-ignore
      newItems[idx][field] = value
      setCustomItems(newItems)
  }
  const calculateCustomTotals = () => {
      const subTotal = customItems.reduce((acc, item) => acc + ((item.price * item.qty) - item.discount), 0)
      const total = subTotal - globalDiscount
      return { subTotal, total }
  }

  const openGenInvoiceDialog = (studio: StudioBillingInfo) => {
      setTargetStudio(studio)
      setGenInvType("standard")
      setCustomItems([{ desc: "", qty: 1, price: 0, discount: 0 }])
      setGlobalDiscount(0)
      setIsGenInvoiceOpen(true)
  }

  const handleGenerateInvoice = async () => {
    if (!targetStudio) return
    const prefix = targetStudio.invoicePrefix || "INV"
    const seq = targetStudio.nextInvoiceSeq || 1000
    const invId = `${prefix}-${seq}`
    const dueDate = addDays(new Date(), 7)
    let finalAmount = 0, subTotal = 0, itemsSummary = "", lineItems: InvoiceItem[] = []

    if (genInvType === "custom") {
        const totals = calculateCustomTotals()
        finalAmount = totals.total
        subTotal = totals.subTotal
        if (finalAmount <= 0) return Toast.fire({ icon: 'warning', title: 'Total > 0 required' })
        lineItems = customItems.map(i => ({
            description: i.desc || "Item",
            quantity: i.qty,
            unitPrice: i.price,
            discount: i.discount,
            total: (i.price * i.qty) - i.discount
        }))
        itemsSummary = `Custom Invoice (${customItems.length} items)`
    } else {
        finalAmount = targetStudio.price
        subTotal = targetStudio.price
        itemsSummary = `${targetStudio.packageName} Subscription`
        lineItems = [{
            description: `${targetStudio.packageName} Subscription`,
            quantity: 1,
            unitPrice: targetStudio.price,
            discount: 0,
            total: targetStudio.price
        }]
    }

    try {
        const newInvoice: InvoiceData = {
            id: invId,
            studioId: targetStudio.id,
            studioName: targetStudio.name,
            amount: finalAmount || 0,
            subTotal: subTotal || 0,
            globalDiscount: globalDiscount || 0,
            status: "Pending",
            generatedDate: new Date().toISOString(),
            dueDate: dueDate.toISOString(),
            cycle: genInvType === "standard" ? (targetStudio.cycle || "Monthly") : "One-Time",
            items: itemsSummary || "Invoice",
            lineItems: lineItems
        }
        await setDoc(doc(db, "Invoices", invId), newInvoice)
        await setDoc(doc(db, `Studios/${targetStudio.id}/Subscription/config/Invoices/${invId}`), newInvoice)
        await updateDoc(doc(db, `Studios/${targetStudio.id}/Subscription/config`), {
            invoice_number: increment(1),
            last_invoice_date: new Date().toISOString(),
            last_invoice_amount: finalAmount
        })
        setInvoices(prev => [newInvoice, ...prev])
        setStudios(prev => prev.map(s => {
            if (s.id === targetStudio.id) return { ...s, nextInvoiceSeq: s.nextInvoiceSeq + 1, lastInvoiceNo: invId }
            return s
        }))
        if (currentUser) await logAuditAction("GENERATE_INVOICE", `Generated ${invId}`, currentUser, "Billing")
        Toast.fire({ icon: 'success', title: 'Invoice Generated' })
        setIsGenInvoiceOpen(false)
    } catch (e: any) {
        Toast.fire({ icon: 'error', title: `Failed: ${e.message}` })
    }
  }

  // --- ACTIONS: INVOICE MANAGEMENT ---
  
  const handleViewHistory = async (studio: StudioBillingInfo) => {
      setHistoryStudio(studio)
      setIsHistoryOpen(true)
      setHistoryLoading(true)
      setHistorySearch("")
      setHistoryPage(1)
      setStudioHistoryInvoices([])
      try {
          const q = query(collection(db, `Studios/${studio.id}/Subscription/config/Invoices`), orderBy("generatedDate", "desc"))
          const snapshot = await getDocs(q)
          const list = snapshot.docs.map(doc => {
              const d = doc.data()
              return {
                  id: doc.id,
                  ...d,
                  generatedDate: safeDate(d.generatedDate).toISOString(),
                  dueDate: safeDate(d.dueDate).toISOString(),
                  paidAt: d.paidAt ? safeDate(d.paidAt).toISOString() : undefined
              } as InvoiceData
          })
          setStudioHistoryInvoices(list)
          if(currentUser) await logAuditAction("VIEW_HISTORY", `Viewed invoices for ${studio.name}`, currentUser, "Billing")
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Failed to load history' })
      } finally {
          setHistoryLoading(false)
      }
  }

  const markAsPaid = async (invoice: InvoiceData) => {
    if (invoice.status === "Paid") return
    Swal.fire({
        title: 'Mark as Paid?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Yes, Mark Paid'
    }).then(async (res) => {
        if (res.isConfirmed) {
            const paidData = { status: "Paid", paidAt: new Date().toISOString(), paidBy: currentUser?.uid || "admin" }
            await updateDoc(doc(db, "Invoices", invoice.id), paidData)
            try { await updateDoc(doc(db, `Studios/${invoice.studioId}/Subscription/config/Invoices/${invoice.id}`), paidData) } catch (e) {}
            
            // UI Updates
            setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, status: "Paid" } : inv))
            setStudioHistoryInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, status: "Paid" } : inv))
            
            if (currentUser) await logAuditAction("MARK_PAID", `Marked ${invoice.id} as paid`, currentUser, "Billing")
            Toast.fire({ icon: 'success', title: 'Payment Recorded' })
        }
    })
  }

  const handleDeleteInvoice = async (invoice: InvoiceData) => {
    Swal.fire({
        title: 'Delete Invoice?',
        text: `Permanently delete ${invoice.id}? This cannot be undone.`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Yes, Delete'
    }).then(async (res) => {
        if (res.isConfirmed) {
            try {
                // Delete from Root
                await deleteDoc(doc(db, "Invoices", invoice.id))
                // Delete from Sub-collection
                await deleteDoc(doc(db, `Studios/${invoice.studioId}/Subscription/config/Invoices/${invoice.id}`))

                // Update UI
                setInvoices(prev => prev.filter(inv => inv.id !== invoice.id))
                setStudioHistoryInvoices(prev => prev.filter(inv => inv.id !== invoice.id))

                if (currentUser) await logAuditAction("DELETE_INVOICE", `Deleted invoice ${invoice.id}`, currentUser, "Billing")
                Toast.fire({ icon: 'success', title: 'Invoice Deleted' })
            } catch (e) {
                console.error(e)
                Toast.fire({ icon: 'error', title: 'Delete Failed' })
            }
        }
    })
  }

  const handleViewInvoice = (inv: InvoiceData) => {
    const studio = studios.find(s => s.id === inv.studioId)
    setSelectedInvoice({
        ...inv,
        studioEmail: studio?.email,
        studioAddress: studio?.address || "Address not provided"
    })
    setIsInvoiceOpen(true)
  }

  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const filteredHistory = studioHistoryInvoices.filter(inv => inv.id.toLowerCase().includes(historySearch.toLowerCase()))
  const totalHistoryPages = Math.ceil(filteredHistory.length / DIALOG_ITEMS_PER_PAGE)
  const currentHistoryPage = filteredHistory.slice((historyPage - 1) * DIALOG_ITEMS_PER_PAGE, historyPage * DIALOG_ITEMS_PER_PAGE)
  const historyTotal = studioHistoryInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const historyPending = studioHistoryInvoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0)

  const uniquePackages = Object.values(packages).filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage studio subscriptions and track payments</p>
      </div>

      <Tabs defaultValue="studios" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="studios">Active Studios</TabsTrigger>
          <TabsTrigger value="invoices">Invoice History</TabsTrigger>
        </TabsList>

        <TabsContent value="studios" className="mt-6">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Overview of billing cycles</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search studios by name or package..." 
                            value={studioSearch} 
                            onChange={(e) => setStudioSearch(e.target.value)} 
                            className="pl-10 max-w-sm"
                        />
                    </div>
                </div>

                {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div> : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Studio Name</TableHead>
                                <TableHead>Package Details</TableHead>
                                <TableHead>Cycle</TableHead>
                                <TableHead>Next Bill</TableHead>
                                <TableHead>Last Invoice</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentStudioItems.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No studios matching filter.</TableCell></TableRow> :
                            currentStudioItems.map(studio => (
                                <TableRow key={studio.id}>
                                    <TableCell className="font-medium">{studio.name}</TableCell>
                                    <TableCell>
                                        {studio.isMapped ? (
                                            <div className="flex flex-col"><span className="font-medium">{studio.packageName}</span><span className="text-xs text-muted-foreground">LKR {studio.price.toLocaleString()}</span></div>
                                        ) : <span className="text-sm text-red-500 flex items-center"><AlertTriangle className="h-3 w-3 mr-1"/> Unassigned</span>}
                                    </TableCell>
                                    <TableCell className="capitalize text-muted-foreground">{studio.cycle}</TableCell>
                                    <TableCell>{studio.isMapped && studio.nextBillingDate ? <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-slate-400"/>{format(studio.nextBillingDate, "MMM dd, yyyy")}</div> : <span className="text-slate-300">-</span>}</TableCell>
                                    <TableCell><span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{studio.lastInvoiceNo}</span></TableCell>
                                    <TableCell>{studio.isMapped ? <Badge variant="outline" className={studio.daysPending < 7 ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-600 border-blue-200"}><Clock className="h-3 w-3 mr-1" />{studio.daysPending} Days</Badge> : <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Setup</Badge>}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => openMappingDialog(studio)} className={studio.isMapped ? "text-slate-600" : "text-blue-600 border-blue-200 bg-blue-50"}><Edit className="h-3 w-3 mr-2" /> {studio.isMapped ? "Edit" : "Map"}</Button>
                                        {studio.isMapped && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleViewHistory(studio)} title="History"><Clock className="h-4 w-4 text-slate-500"/></Button>
                                                <Button size="sm" onClick={() => openGenInvoiceDialog(studio)} className="bg-[#1C4D8D] text-white hover:bg-[#1C4D8D]/90"><FileText className="h-3 w-3 mr-2" /> Invoice</Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {totalStudioPages > 1 && (
                        <div className="border-t p-4 flex items-center justify-between bg-slate-50/30">
                            <p className="text-xs text-muted-foreground">Showing {((studioPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(studioPage * ITEMS_PER_PAGE, filteredStudios.length)} of {filteredStudios.length}</p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={studioPage === 1} onClick={() => setStudioPage(p => p - 1)}><ChevronLeft className="h-4 w-4"/></Button>
                                <span className="text-sm font-medium px-2">Page {studioPage} of {totalStudioPages}</span>
                                <Button variant="outline" size="sm" disabled={studioPage === totalStudioPages} onClick={() => setStudioPage(p => p + 1)}><ChevronRight className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Payment history</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by Invoice ID, Studio, or Status..." 
                            value={invoiceSearch} 
                            onChange={(e) => setInvoiceSearch(e.target.value)} 
                            className="pl-10 max-w-sm"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Studio</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Issued</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentInvoiceItems.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell></TableRow> :
                        currentInvoiceItems.map(inv => (
                            <TableRow key={inv.id} className="cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleViewInvoice(inv)}>
                                <TableCell className="font-mono text-xs text-blue-600 font-medium group-hover:underline">{inv.id}</TableCell>
                                <TableCell className="font-medium">{inv.studioName}</TableCell>
                                <TableCell>LKR {inv.amount.toLocaleString()}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{format(safeDate(inv.generatedDate), "MMM dd, yyyy")}</TableCell>
                                <TableCell><Badge className={inv.status === "Paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"}>{inv.status}</Badge></TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-1">
                                        {inv.status !== "Paid" && <Button size="sm" variant="ghost" onClick={() => markAsPaid(inv)} className="text-green-600 hover:bg-green-50 hover:text-green-700"><CheckCircle2 className="h-4 w-4" /></Button>}
                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteInvoice(inv)} className="text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                
                {totalInvoicePages > 1 && (
                    <div className="border-t p-4 flex items-center justify-between bg-slate-50/30">
                        <p className="text-xs text-muted-foreground">Showing {((invoicePage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(invoicePage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={invoicePage === 1} onClick={() => setInvoicePage(p => p - 1)}><ChevronLeft className="h-4 w-4"/></Button>
                            <span className="text-sm font-medium px-2">Page {invoicePage} of {totalInvoicePages}</span>
                            <Button variant="outline" size="sm" disabled={invoicePage === totalInvoicePages} onClick={() => setInvoicePage(p => p + 1)}><ChevronRight className="h-4 w-4"/></Button>
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MAPPING DIALOG */}
      <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>{mappingStudio?.isMapped ? "Edit Billing" : "Map Package"}</DialogTitle><DialogDescription>Config for <b>{mappingStudio?.name}</b></DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Package</Label><Select value={mapForm.packageId} onValueChange={(v) => setMapForm({...mapForm, packageId: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{uniquePackages.map(pkg => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} (LKR {pkg.price})</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Cycle</Label><Select value={mapForm.cycle} onValueChange={(v) => setMapForm({...mapForm, cycle: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Prefix</Label><Input value={mapForm.prefix} onChange={(e) => setMapForm({...mapForm, prefix: e.target.value.toUpperCase()})} /></div>
                </div>
                <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={mapForm.regDate} onChange={(e) => setMapForm({...mapForm, regDate: e.target.value})} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsMappingOpen(false)}>Cancel</Button><Button className="bg-[#1C4D8D]" onClick={handleSaveMapping} disabled={isSavingMap}>{isSavingMap ? <Loader2 className="animate-spin h-4 w-4"/> : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INVOICE GENERATION DIALOG */}
      <Dialog open={isGenInvoiceOpen} onOpenChange={setIsGenInvoiceOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Generate Invoice</DialogTitle><DialogDescription>For <b>{targetStudio?.name}</b></DialogDescription></DialogHeader>
            <Tabs value={genInvType} onValueChange={(v) => setGenInvType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="standard">Standard Subscription</TabsTrigger><TabsTrigger value="custom">Custom Invoice</TabsTrigger></TabsList>
                <TabsContent value="standard">
                    <div className="p-4 bg-blue-50 rounded-md border border-blue-100 flex justify-between items-center">
                        <div><p className="font-semibold text-blue-900">{targetStudio?.packageName} Plan</p><p className="text-xs text-blue-700 capitalize">{targetStudio?.cycle} Billing</p></div>
                        <span className="text-xl font-bold text-blue-800">LKR {targetStudio?.price.toLocaleString()}</span>
                    </div>
                </TabsContent>
                <TabsContent value="custom">
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        <div className="flex justify-between items-center"><Label>Line Items</Label><Button size="sm" variant="outline" onClick={addCustomItem}><Plus className="h-3 w-3 mr-1"/> Add Item</Button></div>
                        {customItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                                <div className="col-span-5"><Label className="text-xs">Description</Label><Input value={item.desc} onChange={e => updateCustomItem(idx, 'desc', e.target.value)} placeholder="Item name" /></div>
                                <div className="col-span-2"><Label className="text-xs">Qty</Label><Input type="number" value={item.qty} onChange={e => updateCustomItem(idx, 'qty', Number(e.target.value))} /></div>
                                <div className="col-span-2"><Label className="text-xs">Price</Label><Input type="number" value={item.price} onChange={e => updateCustomItem(idx, 'price', Number(e.target.value))} /></div>
                                <div className="col-span-2"><Label className="text-xs">Disc.</Label><Input type="number" value={item.discount} onChange={e => updateCustomItem(idx, 'discount', Number(e.target.value))} className="text-red-600"/></div>
                                <div className="col-span-1 flex justify-center"><Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 h-8 w-8" onClick={() => removeCustomItem(idx)}><Trash2 className="h-4 w-4"/></Button></div>
                            </div>
                        ))}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-2"><span className="text-sm font-medium">Subtotal</span><span>LKR {calculateCustomTotals().subTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center mb-2"><span className="text-sm font-medium">Global Discount</span><div className="w-32"><Input type="number" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} className="text-right h-8" /></div></div>
                            <Separator /><div className="flex justify-between items-center mt-2 text-lg font-bold text-[#1C4D8D]"><span>Total</span><span>LKR {calculateCustomTotals().total.toLocaleString()}</span></div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <DialogFooter><Button variant="outline" onClick={() => setIsGenInvoiceOpen(false)}>Cancel</Button><Button className="bg-[#1C4D8D]" onClick={handleGenerateInvoice}><CheckCircle2 className="h-4 w-4 mr-2"/> Generate</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STUDIO HISTORY DIALOG */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-[#1C4D8D]"/> Invoice History: {historyStudio?.name}</DialogTitle>
                <DialogDescription>Full billing record for this studio.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 my-2">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                    <div><p className="text-xs font-semibold text-green-700 uppercase">Total Billed</p><p className="text-2xl font-bold text-green-800">{formatCurrency(historyTotal)}</p></div>
                    <CreditCard className="h-8 w-8 text-green-200" />
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex justify-between items-center">
                    <div><p className="text-xs font-semibold text-yellow-700 uppercase">Outstanding</p><p className="text-2xl font-bold text-yellow-800">{formatCurrency(historyPending)}</p></div>
                    <AlertTriangle className="h-8 w-8 text-yellow-200" />
                </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search invoice ID..." value={historySearch} onChange={(e) => {setHistorySearch(e.target.value); setHistoryPage(1)}} className="max-w-sm h-8" />
            </div>

            <div className="border rounded-md min-h-[300px]">
                {historyLoading ? <div className="flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-slate-400"/></div> : (
                    <Table>
                        <TableHeader><TableRow className="bg-slate-50"><TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {currentHistoryPage.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell></TableRow> : currentHistoryPage.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs font-medium">{inv.id}</TableCell>
                                    <TableCell className="text-sm">{format(safeDate(inv.generatedDate), "MMM dd, yyyy")}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inv.items}</TableCell>
                                    <TableCell><Badge variant={inv.status === 'Paid' ? 'default' : 'outline'} className={inv.status === 'Paid' ? 'bg-green-600 hover:bg-green-700' : 'text-yellow-600 border-yellow-600'}>{inv.status}</Badge></TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(inv.amount)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {inv.status !== "Paid" && <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" title="Mark Paid" onClick={() => markAsPaid(inv)}><CheckCircle2 className="h-4 w-4"/></Button>}
                                            {/* [!code highlight] DELETE INVOICE BUTTON */}
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteInvoice(inv)}><Trash2 className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" onClick={() => handleViewInvoice(inv)}><FileText className="h-4 w-4"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
            
            {totalHistoryPages > 1 && (
                <div className="flex justify-between items-center mt-2">
                    <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}><ChevronLeft className="h-4 w-4"/></Button>
                    <span className="text-xs text-muted-foreground">Page {historyPage} of {totalHistoryPages}</span>
                    <Button variant="outline" size="sm" disabled={historyPage === totalHistoryPages} onClick={() => setHistoryPage(p => p + 1)}><ChevronRight className="h-4 w-4"/></Button>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* INVOICE VIEW */}
      {selectedInvoice && (
        <InvoiceDialog isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} invoice={selectedInvoice} />
      )}
    </div>
  )
}