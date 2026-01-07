"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Building2, Activity, DollarSign, AlertCircle, CheckCircle2, Loader2, ArrowUpRight, FileText, Clock } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc } from "firebase/firestore"
import { ref, listAll, getMetadata } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { format, subDays, parseISO, isSameDay, isBefore } from "date-fns"

// --- TYPES ---
interface DashboardMetrics {
  mrr: number
  activeStudios: number
  storageUsed: number // in Bytes
  status: "Operational" | "Issues"
  totalInvoices: number
  pendingInvoices: number
  paidInvoices: number
}

interface ActivityLog {
  id: string
  action: string
  details: string
  user: string
  timestamp: string
}

interface GrowthData {
  date: string
  signups: number
}

interface PendingInvoice {
    id: string
    studioName: string
    amount: number
    dueDate: Date
    isOverdue: boolean
}

// --- COLORS ---
const CHART_COLORS = ['#1C4D8D', '#F59E0B', '#10B981', '#EF4444']

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ 
      mrr: 0, activeStudios: 0, storageUsed: 0, status: "Operational",
      totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0 
  })
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [pendingList, setPendingList] = useState<PendingInvoice[]>([])
  const [loading, setLoading] = useState(true)

  // --- HELPERS ---
  const safeDate = (dateInput: any): Date => {
    if (!dateInput) return new Date()
    if (typeof dateInput?.toDate === 'function') return dateInput.toDate()
    if (dateInput instanceof Date) return dateInput
    if (typeof dateInput === 'string') {
        try { return parseISO(dateInput) } catch (e) { return new Date() }
    }
    return new Date()
  }

  const calculateTotalStorage = async (): Promise<number> => {
      let totalBytes = 0
      const traverse = async (currentPath: string) => {
          const folderRef = ref(storage, currentPath)
          try {
              const res = await listAll(folderRef)
              const metadataPromises = res.items.map(item => getMetadata(item))
              const metaSnapshots = await Promise.all(metadataPromises)
              metaSnapshots.forEach(meta => totalBytes += meta.size)
              for (const folder of res.prefixes) {
                  await traverse(folder.fullPath)
              }
          } catch (error) {
              console.warn(`Skipping folder ${currentPath}`, error)
          }
      }
      await traverse("Studios") 
      return totalBytes
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // 1. STUDIOS & MRR (Fetch Sub-config for accurate pricing)
        const studiosSnap = await getDocs(collection(db, "Studios"))
        
        let totalMrr = 0
        let activeCount = 0
        const signupDates: Date[] = []

        // Use Promise.all to fetch sub-collection configs in parallel
        await Promise.all(studiosSnap.docs.map(async (docSnap) => {
            const data = docSnap.data()
            const status = data.status || "Inactive"
            
            if (status.toLowerCase() === 'active') {
                activeCount++
                
                // [!code highlight] Fetch Real MRR from Subscription Config
                try {
                    const configRef = doc(db, `Studios/${docSnap.id}/Subscription/config`)
                    const configSnap = await getDoc(configRef)
                    if (configSnap.exists()) {
                        const configData = configSnap.data()
                        // Add Price (Monthly) - If Annual, divide by 12 ideally, but simplifed here to just price
                        const price = configData.price || 0
                        const cycle = configData.cycle || "monthly"
                        totalMrr += cycle === 'annual' ? (price / 12) : price
                    }
                } catch (e) {
                    console.warn(`Failed to fetch config for ${docSnap.id}`)
                }
            }
            
            const rawDate = data.regDate || data.createdAt
            if (rawDate) signupDates.push(safeDate(rawDate))
        }))

        // Build Growth Chart
        const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i))
        const chartData = last30Days.map(day => ({
            date: format(day, "MMM dd"),
            signups: signupDates.filter(signup => isSameDay(signup, day)).length
        }))
        setGrowthData(chartData)

        // 2. INVOICES (Stats & Pending List)
        const invoicesSnap = await getDocs(collection(db, "Invoices"))
        let pending = 0
        let paid = 0
        const pendingInvoicesArr: PendingInvoice[] = []
        
        invoicesSnap.forEach(doc => {
            const d = doc.data()
            const status = d.status || "Pending"
            
            if (status === "Paid") paid++
            else if (status === "Pending" || status === "Overdue") {
                pending++
                const dueDate = safeDate(d.dueDate)
                pendingInvoicesArr.push({
                    id: doc.id,
                    studioName: d.studioName || "Unknown",
                    amount: d.amount || 0,
                    dueDate: dueDate,
                    isOverdue: isBefore(dueDate, new Date())
                })
            }
        })

        // Sort Pending by Due Date (Earliest First)
        pendingInvoicesArr.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        setPendingList(pendingInvoicesArr.slice(0, 5)) // Top 5

        // 3. AUDIT LOGS (Sorted Client-Side fallback)
        let logsSnap
        try {
            const logsQuery = query(collection(db, "AuditLogs"), orderBy("timestamp", "desc"), limit(10))
            logsSnap = await getDocs(logsQuery)
        } catch {
            const basicQuery = query(collection(db, "AuditLogs"), limit(20))
            logsSnap = await getDocs(basicQuery)
        }

        const logs = logsSnap.docs.map(doc => {
            const d = doc.data()
            return {
                id: doc.id,
                action: d.action || "System Event",
                details: d.details || "No details provided",
                user: d.performedBy || "System",
                timestamp: d.timestamp ? format(safeDate(d.timestamp), "MMM dd, HH:mm") : "Unknown"
            }
        })
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setActivities(logs.slice(0, 8)) // Show 8 items

        // 4. STORAGE
        const totalBytes = await calculateTotalStorage()

        setMetrics({
            mrr: totalMrr,
            activeStudios: activeCount,
            storageUsed: totalBytes,
            status: "Operational",
            totalInvoices: paid + pending,
            pendingInvoices: pending,
            paidInvoices: paid
        })

      } catch (e) {
        console.error("Dashboard Critical Error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(val)
  const formatStorage = (bytes: number) => {
      if (bytes === 0) return "0 GB"
      const gb = bytes / (1024 * 1024 * 1024)
      return gb.toFixed(2) + " GB"
  }

  const invoiceChartData = [
      { name: 'Paid', value: metrics.paidInvoices },
      { name: 'Pending', value: metrics.pendingInvoices }
  ]

  if (loading) {
      return <div className="flex items-center justify-center h-full min-h-[80vh] flex-col gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-[#1C4D8D]" />
          <p className="text-sm text-muted-foreground">Calculating live metrics...</p>
      </div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of platform health and business metrics</p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <Card className="border-none shadow-md bg-gradient-to-br from-[#1C4D8D]/10 to-[#4988C4]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#1C4D8D]/20">
                <DollarSign className="h-5 w-5 text-[#1C4D8D]" />
              </div>
              <Badge variant="outline" className="bg-white text-green-600 border-green-200 flex gap-1">
                <ArrowUpRight className="h-3 w-3" /> Live
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold text-[#1C4D8D]">{formatCurrency(metrics.mrr)}</p>
            <p className="text-xs text-muted-foreground mt-2">Calculated from active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-[#4988C4]/10 to-[#BDE8F5]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#4988C4]/20">
                <Building2 className="h-5 w-5 text-[#4988C4]" />
              </div>
              <Badge variant="outline" className="bg-white text-[#4988C4] border-[#4988C4]/20">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Active Tenants</p>
            <p className="text-3xl font-bold text-[#4988C4]">{metrics.activeStudios}</p>
            <p className="text-xs text-muted-foreground mt-2">Registered Studios</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-200/50">
                <AlertCircle className="h-5 w-5 text-orange-700" />
              </div>
              <Badge variant="outline" className="bg-white text-orange-700 border-orange-200">Scanned</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Storage Load</p>
            <p className="text-3xl font-bold text-orange-700">{formatStorage(metrics.storageUsed)}</p>
            <p className="text-xs text-muted-foreground mt-2">Total 'Studios/' folder size</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-200/50">
                <FileText className="h-5 w-5 text-purple-700" />
              </div>
              <Badge variant="outline" className="bg-white text-purple-700 border-purple-200">{metrics.pendingInvoices} Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
            <p className="text-3xl font-bold text-purple-700">{metrics.totalInvoices}</p>
            <p className="text-xs text-muted-foreground mt-2">Paid: {metrics.paidInvoices} | Pending: {metrics.pendingInvoices}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GROWTH CHART */}
          <Card className="border-none shadow-md lg:col-span-2">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#1C4D8D]" /> Studio Growth Chart</CardTitle>
              <CardDescription>New studio acquisitions over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={30}/>
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }} itemStyle={{ color: '#1C4D8D', fontWeight: 'bold' }}/>
                    <Line type="monotone" dataKey="signups" stroke="#1C4D8D" strokeWidth={3} dot={{ fill: "#1C4D8D", r: 4 }} activeDot={{ r: 6 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* INVOICE DISTRIBUTION */}
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
                <CardTitle>Invoice Health</CardTitle>
                <CardDescription>Paid vs Pending Distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {metrics.totalInvoices === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No invoice data yet</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={invoiceChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                <Cell key="cell-paid" fill="#10B981" />
                                <Cell key="cell-pending" fill="#F59E0B" />
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* [!code highlight] PENDING INVOICES LIST */}
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-600" /> Outstanding Payments</CardTitle>
              <CardDescription>Top 5 invoices pending payment (Earliest Due First)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {pendingList.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">No pending invoices.</div>
                    ) : pendingList.map(inv => (
                        <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-medium text-slate-800">{inv.studioName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{inv.id}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-700">{formatCurrency(inv.amount)}</p>
                                <p className={`text-xs ${inv.isOverdue ? "text-red-500 font-semibold" : "text-slate-500"}`}>
                                    Due: {format(inv.dueDate, "MMM dd")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          {/* ACTIVITY FEED */}
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest 8 system events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No recent activity.</div>
                ) : (
                    activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                {activity.user.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-medium text-foreground text-sm">{activity.action}</p>
                                <p className="text-xs text-muted-foreground">{activity.details}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-muted-foreground block">{activity.timestamp}</span>
                        </div>
                    </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}