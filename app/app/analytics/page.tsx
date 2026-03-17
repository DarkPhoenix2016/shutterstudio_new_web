"use client"

import { useEffect, useState, useCallback } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Package,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  BarChart2,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/AuthContext"
import { fetchAnalyticsData, type AnalyticsData } from "@/services/analytics-service"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = {
  primary: "#1C4D8D",
  secondary: "#4988C4",
  navy: "#0F2854",
  light: "#BDE8F5",
}

const CHART_COLORS = [
  "#1C4D8D",
  "#4988C4",
  "#0F2854",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
]

const STATUS_COLOR: Record<string, string> = {
  completed: "#22c55e",
  done: "#22c55e",
  delivered: "#22c55e",
  confirmed: "#3b82f6",
  booked: "#3b82f6",
  scheduled: "#3b82f6",
  in_progress: "#f59e0b",
  shooting: "#f59e0b",
  cancelled: "#ef4444",
  canceled: "#ef4444",
  quotation: "#8b5cf6",
  inquiry: "#8b5cf6",
  pending: "#f97316",
}

const PERIOD_OPTIONS = [
  { label: "Last 3 Months", value: 3 },
  { label: "Last 6 Months", value: 6 },
  { label: "Last 12 Months", value: 12 },
  { label: "All Time", value: 0 },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n))
}

function fmtCurrency(n: number, symbol: string): string {
  if (n >= 100000) return `${symbol}${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`
  return `${symbol}${fmtNum(n)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

// ─── Tooltip components ───────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currency?: string
}

function CustomTooltip({ active, payload, label, currency = "$" }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-slate-600">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-800">
            {typeof p.value === "number" && p.name.toLowerCase().includes("event")
              ? fmtNum(p.value)
              : fmtCurrency(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

function EventTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-slate-600">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-800">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string
  value: string
  sub?: string
  icon: React.ReactNode
  accent: string
  trend?: number
  badge?: string
}

function KpiCard({ title, value, sub, icon, accent, trend, badge }: KpiCardProps) {
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: `${accent}18` }}
          >
            <span style={{ color: accent }}>{icon}</span>
          </div>
          {badge && (
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wide">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {(sub || trend !== undefined) && (
          <div className="flex items-center gap-1 mt-1">
            {trend !== undefined && (
              trend >= 0
                ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                : <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-foreground">{children}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { userData, studioData } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(12)

  const currency: string = (studioData as Record<string, unknown> | null)?.base_currency as string ?? "$"
  const fmt = (n: number) => fmtCurrency(n, currency)

  const loadData = useCallback(async () => {
    if (!userData?.studioID) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAnalyticsData(userData.studioID, period)
      setData(result)
    } catch (err) {
      console.error("Analytics error:", err)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [userData?.studioID, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" />
        <p className="text-sm text-muted-foreground">Crunching your studio data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "Custom"

  // Trend for collection rate: compare first half vs second half of monthlyTrends
  const half = Math.floor(data.monthlyTrends.length / 2)
  const firstHalfRevenue = data.monthlyTrends.slice(0, half).reduce((s, m) => s + m.revenue, 0)
  const secondHalfRevenue = data.monthlyTrends.slice(half).reduce((s, m) => s + m.revenue, 0)
  const revenueTrend = firstHalfRevenue > 0
    ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Studio performance insights for{" "}
            <span className="font-semibold text-[#1C4D8D]">{studioData?.name}</span>
            {" "}· {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-[160px] border-[#1C4D8D]/20 focus:ring-[#1C4D8D]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="bg-[#1C4D8D] text-white hover:bg-[#0F2854]"
            onClick={handlePrint}
          >
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Print header (only shown in print) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {studioData?.name} — Analytics Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {periodLabel} · Generated on{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Revenue"
          value={fmt(data.totalRevenue)}
          sub={`${fmtPct(revenueTrend)} vs prev period`}
          trend={revenueTrend}
          icon={<DollarSign className="h-5 w-5" />}
          accent={BRAND.primary}
          badge="Revenue"
        />
        <KpiCard
          title="Collected"
          value={fmt(data.totalCollected)}
          sub={`${fmtPct(data.collectionRate)} rate`}
          icon={<CheckCircle className="h-5 w-5" />}
          accent="#22c55e"
          badge="Cash-in"
        />
        <KpiCard
          title="Outstanding"
          value={fmt(data.totalOutstanding)}
          sub="Pending collection"
          icon={<Target className="h-5 w-5" />}
          accent="#f59e0b"
          badge="Due"
        />
        <KpiCard
          title="Total Events"
          value={fmtNum(data.totalEvents)}
          sub={`${data.completedEvents} completed`}
          icon={<Calendar className="h-5 w-5" />}
          accent={BRAND.secondary}
          badge="Period"
        />
        <KpiCard
          title="Avg Event Value"
          value={fmt(data.avgEventValue)}
          sub="Per booking"
          icon={<Activity className="h-5 w-5" />}
          accent={BRAND.navy}
        />
        <KpiCard
          title="Collection Rate"
          value={fmtPct(data.collectionRate)}
          sub={`${fmt(data.totalOutstanding)} outstanding`}
          trend={data.collectionRate - 70}
          icon={<BarChart2 className="h-5 w-5" />}
          accent="#8b5cf6"
        />
      </div>

      {/* ── Historical Analysis ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle description="Monthly revenue, collections, and event volume trends">
          Historical Analysis
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Trend */}
          <Card className="lg:col-span-2 border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue & Collection Trend</CardTitle>
              <CardDescription>Monthly billed vs collected amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={data.monthlyTrends}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={BRAND.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmt(v)}
                  />
                  <Tooltip content={<CustomTooltip currency={currency} />} />
                  <Legend iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={BRAND.primary}
                    strokeWidth={2}
                    fill="url(#gradRevenue)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#gradCollected)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="outstanding"
                    name="Outstanding"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="none"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Event Volume */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Event Volume</CardTitle>
              <CardDescription>Bookings per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.monthlyTrends}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<EventTooltip />} />
                  <Bar dataKey="events" name="Events" fill={BRAND.primary} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Income vs Expense ───────────────────────────────────────────────── */}
      {data.incomeVsExpense.some((p) => p.income > 0 || p.expense > 0) && (
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income vs Expense (from Transactions)</CardTitle>
            <CardDescription>Cash flow based on recorded event transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.incomeVsExpense}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke={BRAND.primary}
                  strokeWidth={2}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Tabbed Analysis ─────────────────────────────────────────────────── */}
      <div>
        <SectionTitle description="Deep-dive into finance, workforce, and resource metrics">
          Detailed Analysis
        </SectionTitle>
        <Tabs defaultValue="finance" className="space-y-4">
          <TabsList className="h-10 bg-muted/60 p-1 rounded-xl print:hidden">
            <TabsTrigger value="finance" className="rounded-lg px-5 text-sm font-medium">
              Finance
            </TabsTrigger>
            <TabsTrigger value="workforce" className="rounded-lg px-5 text-sm font-medium">
              Workforce
            </TabsTrigger>
            <TabsTrigger value="resources" className="rounded-lg px-5 text-sm font-medium">
              Resources
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg px-5 text-sm font-medium">
              Clients
            </TabsTrigger>
          </TabsList>

          {/* ── Finance Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Event Type Breakdown */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue by Event Type</CardTitle>
                  <CardDescription>Distribution across {data.eventTypeBreakdown.length} types</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.eventTypeBreakdown.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      No data available
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={data.eventTypeBreakdown}
                            dataKey="revenue"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {data.eventTypeBreakdown.map((_, i) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                stroke="white"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number) => fmt(val)}
                            labelFormatter={(l) => l}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 min-w-[140px]">
                        {data.eventTypeBreakdown.map((item, i) => (
                          <div key={item.type} className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <div>
                              <p className="text-xs font-medium leading-none">{item.type}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.count} events · {fmt(item.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Events by Status</CardTitle>
                  <CardDescription>Booking pipeline snapshot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.statusBreakdown.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      No data available
                    </div>
                  ) : (
                    data.statusBreakdown.map((item) => {
                      const color = STATUS_COLOR[item.status.toLowerCase()] ?? "#94a3b8"
                      const pct = data.totalEvents > 0 ? (item.count / data.totalEvents) * 100 : 0
                      return (
                        <div key={item.status}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ background: color }}
                              />
                              <span className="text-sm capitalize font-medium">
                                {item.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{item.count}</span>
                              <span>·</span>
                              <span>{fmt(item.revenue)}</span>
                              <span className="ml-1 font-medium">{fmtPct(pct)}</span>
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-1.5"
                            style={{ "--progress-color": color } as React.CSSProperties}
                          />
                        </div>
                      )
                    })
                  )}

                  <Separator className="my-4" />

                  {/* Finance summary */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Completed", count: data.completedEvents, color: "#22c55e" },
                      { label: "Active", count: data.activeEvents, color: BRAND.primary },
                      { label: "Cancelled", count: data.cancelledEvents, color: "#ef4444" },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p
                          className="text-2xl font-bold"
                          style={{ color: item.color }}
                        >
                          {item.count}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Finance KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Billed Revenue",
                  value: fmt(data.totalRevenue),
                  sub: `${data.totalEvents} events`,
                  color: BRAND.primary,
                },
                {
                  label: "Collected",
                  value: fmt(data.totalCollected),
                  sub: `${fmtPct(data.collectionRate)} rate`,
                  color: "#22c55e",
                },
                {
                  label: "Outstanding",
                  value: fmt(data.totalOutstanding),
                  sub: "Pending payment",
                  color: "#f59e0b",
                },
                {
                  label: "Avg Booking Value",
                  value: fmt(data.avgEventValue),
                  sub: "Per event",
                  color: "#8b5cf6",
                },
              ].map((item) => (
                <Card key={item.label} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Workforce Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="workforce" className="space-y-4">
            {/* Workforce Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Crew",
                  value: String(data.totalCrew),
                  icon: <Users className="h-5 w-5" />,
                  color: BRAND.primary,
                },
                {
                  label: "Assigned (Period)",
                  value: String(data.assignedCrew),
                  icon: <CheckCircle className="h-5 w-5" />,
                  color: "#22c55e",
                },
                {
                  label: "Unassigned",
                  value: String(data.totalCrew - data.assignedCrew),
                  icon: <XCircle className="h-5 w-5" />,
                  color: "#94a3b8",
                },
                {
                  label: "Events / Crew",
                  value:
                    data.totalCrew > 0
                      ? (data.totalEvents / data.totalCrew).toFixed(1)
                      : "–",
                  icon: <Activity className="h-5 w-5" />,
                  color: BRAND.navy,
                },
              ].map((item) => (
                <Card key={item.label} className="border-none shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ background: `${item.color}18`, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Crew Chart */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Crew Assignment Distribution</CardTitle>
                  <CardDescription>Events assigned per crew member</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.crewUtilization.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No crew data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(data.crewUtilization.length * 40, 200)}>
                      <BarChart
                        data={data.crewUtilization.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={90}
                        />
                        <Tooltip content={<EventTooltip />} />
                        <Bar
                          dataKey="eventsAssigned"
                          name="Events"
                          fill={BRAND.primary}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Crew Table */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Crew Utilization Details</CardTitle>
                  <CardDescription>Ranked by event assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.crewUtilization.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No crew data available
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {data.crewUtilization.map((member, idx) => (
                        <div key={member.uid}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {member.designation || member.role || "Crew"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-sm font-bold text-[#1C4D8D]">
                                {member.eventsAssigned}
                              </p>
                              <p className="text-[11px] text-muted-foreground">events</p>
                            </div>
                          </div>
                          <Progress value={member.utilizationPct} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                            {fmtPct(member.utilizationPct)} of total events
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Resources Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="resources" className="space-y-4">
            {/* Inventory Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Items",
                  value: String(data.totalInventory),
                  color: BRAND.primary,
                },
                {
                  label: "Active",
                  value: String(data.activeInventory),
                  color: "#22c55e",
                },
                {
                  label: "Maintenance",
                  value: String(data.maintenanceInventory),
                  color: "#f59e0b",
                },
                {
                  label: "Categories",
                  value: String(data.inventoryCategoryBreakdown.length),
                  color: "#8b5cf6",
                },
              ].map((item) => (
                <Card key={item.label} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Used Equipment */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Used Equipment</CardTitle>
                  <CardDescription>By number of event assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.inventoryUtilization.filter((i) => i.timesUsed > 0).length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No usage data in this period
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {data.inventoryUtilization
                        .filter((i) => i.timesUsed > 0)
                        .slice(0, 12)
                        .map((item, idx) => (
                          <div key={item.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    background: item.color ?? CHART_COLORS[idx % CHART_COLORS.length],
                                  }}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.category}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-sm font-bold text-[#1C4D8D]">
                                  {item.timesUsed}×
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {item.daysScheduled}d
                                </p>
                              </div>
                            </div>
                            <Progress value={Math.min(item.utilizationPct, 100)} className="h-1.5" />
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Category Utilization</CardTitle>
                  <CardDescription>Items per category and usage rate</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.inventoryCategoryBreakdown.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No inventory data
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.inventoryCategoryBreakdown
                        .sort((a, b) => b.count - a.count)
                        .map((cat, i) => {
                          const pct = cat.count > 0 ? (cat.used / cat.count) * 100 : 0
                          return (
                            <div key={cat.name}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Package
                                    className="h-3.5 w-3.5"
                                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                                  />
                                  <span className="text-sm font-medium">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground">{cat.used}</span>
                                  <span>/ {cat.count} used</span>
                                  <span className="font-medium text-[#1C4D8D]">{fmtPct(pct)}</span>
                                </div>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unused Equipment */}
              {data.inventoryUtilization.filter((i) => i.timesUsed === 0).length > 0 && (
                <Card className="lg:col-span-2 border-none shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Idle Equipment
                    </CardTitle>
                    <CardDescription>
                      Not assigned to any event in this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {data.inventoryUtilization
                        .filter((i) => i.timesUsed === 0)
                        .map((item) => (
                          <Badge
                            key={item.id}
                            variant="outline"
                            className="text-xs text-muted-foreground border-muted"
                          >
                            {item.name}
                            <span className="ml-1 opacity-60">·</span>
                            <span className="ml-1 opacity-60">{item.category}</span>
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Clients Tab ───────────────────────────────────────────────────── */}
          <TabsContent value="clients" className="space-y-4">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Clients by Revenue</CardTitle>
                <CardDescription>
                  {data.topClients.length} clients · {periodLabel}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.topClients.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    No client data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Client
                          </th>
                          <th className="text-center py-2.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Events
                          </th>
                          <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Revenue
                          </th>
                          <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Collected
                          </th>
                          <th className="text-right py-2.5 pl-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClients.map((client, idx) => {
                          const rate =
                            client.revenue > 0
                              ? (client.collected / client.revenue) * 100
                              : 0
                          return (
                            <tr
                              key={client.name}
                              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                    style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                                  >
                                    {client.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium">{client.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="outline" className="font-bold">
                                  {client.events}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-[#1C4D8D]">
                                {fmt(client.revenue)}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                                {fmt(client.collected)}
                              </td>
                              <td className="py-3 pl-4 text-right">
                                <span
                                  className={cn(
                                    "text-xs font-bold",
                                    rate >= 80
                                      ? "text-emerald-600"
                                      : rate >= 50
                                      ? "text-amber-600"
                                      : "text-red-500"
                                  )}
                                >
                                  {fmtPct(rate)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Revenue Chart */}
            {data.topClients.length > 0 && (
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Client Revenue Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={data.topClients.slice(0, 8)}
                      margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => fmt(v)}
                      />
                      <Tooltip content={<CustomTooltip currency={currency} />} />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="revenue" name="Revenue" fill={BRAND.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Report Summary (printable footer) ─────────────────────────────── */}
      <div className="hidden print:block mt-8 border-t pt-6 text-xs text-slate-500">
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <p className="font-bold text-slate-700 mb-1">Revenue Summary</p>
            <p>Billed: {fmt(data.totalRevenue)}</p>
            <p>Collected: {fmt(data.totalCollected)}</p>
            <p>Outstanding: {fmt(data.totalOutstanding)}</p>
            <p>Collection Rate: {fmtPct(data.collectionRate)}</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">Event Summary</p>
            <p>Total Events: {data.totalEvents}</p>
            <p>Completed: {data.completedEvents}</p>
            <p>Active: {data.activeEvents}</p>
            <p>Cancelled: {data.cancelledEvents}</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">Studio</p>
            <p>{studioData?.name}</p>
            <p>Period: {periodLabel}</p>
            <p>Crew: {data.totalCrew}</p>
            <p>Inventory: {data.totalInventory} items</p>
          </div>
        </div>
        <p>
          Generated by ShutterStudio Analytics ·{" "}
          {new Date().toLocaleString("en-IN")}
        </p>
      </div>

    </div>
  )
}
