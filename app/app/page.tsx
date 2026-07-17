"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { fetchInventory } from "@/services/inventory-service"
import { getStatusColor } from "@/lib/event-utils"
import { safeDate } from "@/lib/date-utils"
import { EventFormDialog } from "@/components/events/EventFormDialog"
import { format, isToday, isTomorrow, isWithinInterval, addDays, startOfMonth, endOfMonth, isPast, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  DollarSign, Calendar, Users, Camera, Loader2,
  ArrowUpRight, Plus, CheckSquare, AlertTriangle,
  TrendingUp, Clock, Package, ChevronRight, Star,
  CircleDot, BarChart2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawEvent {
  id: string
  eventName?: string
  customerName?: string
  eventType?: string
  status?: string
  days?: Array<{ date: unknown; cost?: number }>
  finalBudget?: number
  advancePaid?: number
  transactions?: Array<{ type: string; amount: number; date: unknown }>
  createdAt?: unknown
  inquiryDate?: unknown
}

interface RawTask {
  id: string
  title?: string
  status?: string
  priority?: string
  dueDate?: unknown
  linkedEventName?: string
  assignedTo?: Array<{ uid: string; name: string }>
}

interface DashboardData {
  // KPIs
  thisMonthRevenue: number
  outstanding: number
  activeEvents: number
  thisMonthEvents: number
  crewCount: number
  pendingTasks: number
  inventoryCount: number
  // Lists
  upcomingEvents: RawEvent[]
  todayEvents: RawEvent[]
  urgentTasks: RawTask[]
  // Pipeline
  pipeline: { label: string; count: number; revenue: number; color: string }[]
  // Trends
  collectionRate: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEventPrimaryDate(e: RawEvent): Date {
  const d = e.days?.[0]?.date
  if (d) return safeDate(d)
  if (e.inquiryDate) return safeDate(e.inquiryDate)
  return safeDate(e.createdAt)
}

function getCollected(e: RawEvent): number {
  if (e.transactions?.length) {
    const sum = e.transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0)
    if (sum > 0) return sum
  }
  return e.advancePaid ?? 0
}

function isActiveStatus(s: string) {
  return !["completed", "done", "cancelled", "canceled", "handed over"].includes(s.toLowerCase())
}

function isCompletedStatus(s: string) {
  return ["completed", "done", "handed over"].includes(s.toLowerCase())
}

function pipelineStage(status: string): number {
  const s = status.toLowerCase()
  if (s.includes("quotation") || s.includes("inquiry")) return 0
  if (s.includes("scheduled") || s.includes("confirmed") || s.includes("booked")) return 1
  if (s.includes("progress") || s.includes("post") || s.includes("review")) return 2
  if (isCompletedStatus(s)) return 3
  return -1 // cancelled
}

const PIPELINE_STAGES = [
  { label: "Quotation",   color: "#8b5cf6", bg: "bg-violet-500" },
  { label: "Confirmed",   color: "#3b82f6", bg: "bg-blue-500" },
  { label: "In Progress", color: "#f59e0b", bg: "bg-amber-500" },
  { label: "Completed",   color: "#22c55e", bg: "bg-emerald-500" },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Urgent",  color: "text-red-600",    dot: "bg-red-500" },
  high:   { label: "High",    color: "text-orange-600", dot: "bg-orange-400" },
  medium: { label: "Medium",  color: "text-amber-600",  dot: "bg-amber-400" },
  low:    { label: "Low",     color: "text-slate-500",  dot: "bg-slate-300" },
}

function fmtMoney(n: number, currency: string) {
  if (n >= 100000) return `${currency}${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${currency}${(n / 1000).toFixed(1)}K`
  return `${currency}${Math.round(n).toLocaleString("en-IN")}`
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  const diff = differenceInDays(date, new Date())
  if (diff > 0 && diff <= 7) return format(date, "EEEE")
  return format(date, "MMM d")
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, accent, trend, onClick,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  accent: string; trend?: "up" | "down" | "neutral"; onClick?: () => void
}) {
  return (
    <Card
      className={cn("border-none shadow-sm hover:shadow-md transition-all duration-200", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg" style={{ background: `${accent}15` }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>
          {trend && (
            <TrendingUp className={cn("h-3.5 w-3.5", trend === "up" ? "text-emerald-500" : "text-slate-300")} />
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { userData, studioData, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [newEventOpen, setNewEventOpen] = useState(false)

  const currency: string = (studioData as Record<string, unknown> | null)?.base_currency as string ?? "$"

  // ── Data loading ──
  useEffect(() => {
    if (authLoading || !userData?.studioID) return
    const studioID = userData.studioID

    async function load() {
      try {
        const [eventsSnap, tasksSnap, memSnap, invItems] = await Promise.all([
          getDocs(collection(db, "Studios", studioID, "Events")),
          getDocs(collection(db, "Studios", studioID, "tasks")),
          getDoc(doc(db, "Studios", studioID, "Members", "MEM_LIST")),
          fetchInventory(studioID).catch(() => []),
        ])

        const allEvents: RawEvent[] = eventsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<RawEvent, "id">) }))
        const allTasks: RawTask[] = tasksSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<RawTask, "id">) }))
        const crewCount = memSnap.exists() ? ((memSnap.data().ID_LIST as string[]) ?? []).length : 0
        const inventoryCount = invItems.length

        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const next14 = addDays(now, 14)

        // ── Event processing ──
        const activeEvents = allEvents.filter(e => isActiveStatus(e.status ?? ""))
        const thisMonthEvents = allEvents.filter(e => {
          const d = getEventPrimaryDate(e)
          return isWithinInterval(d, { start: monthStart, end: monthEnd })
        })

        const thisMonthRevenue = thisMonthEvents.reduce((s, e) => s + (e.finalBudget ?? 0), 0)

        const outstanding = activeEvents.reduce((s, e) => {
          const budget = e.finalBudget ?? 0
          const collected = getCollected(e)
          return s + Math.max(0, budget - collected)
        }, 0)

        const totalRevenue = allEvents.reduce((s, e) => s + (e.finalBudget ?? 0), 0)
        const totalCollected = allEvents.reduce((s, e) => s + getCollected(e), 0)
        const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0

        // Upcoming = active, date within next 14 days, sorted
        const upcomingEvents = allEvents
          .filter(e => {
            const d = getEventPrimaryDate(e)
            return isActiveStatus(e.status ?? "") &&
              isWithinInterval(d, { start: now, end: next14 })
          })
          .sort((a, b) => getEventPrimaryDate(a).getTime() - getEventPrimaryDate(b).getTime())
          .slice(0, 8)

        // Today's events
        const todayEvents = allEvents.filter(e => {
          const d = getEventPrimaryDate(e)
          return isToday(d)
        })

        // ── Task processing ──
        const pendingTasks = allTasks.filter(t =>
          !["completed", "cancelled"].includes(t.status ?? "")
        ).length

        const urgentTasks = allTasks
          .filter(t => {
            if (["completed", "cancelled"].includes(t.status ?? "")) return false
            if (t.priority === "urgent") return true
            if (t.dueDate && isPast(safeDate(t.dueDate)) && t.status !== "completed") return true
            return false
          })
          .sort((a, b) => {
            const pa = a.priority === "urgent" ? 0 : 1
            const pb = b.priority === "urgent" ? 0 : 1
            return pa - pb
          })
          .slice(0, 5)

        // ── Pipeline ──
        const stageTotals = [0, 0, 0, 0].map(() => ({ count: 0, revenue: 0 }))
        allEvents.forEach(e => {
          const stage = pipelineStage(e.status ?? "")
          if (stage >= 0) {
            stageTotals[stage].count++
            stageTotals[stage].revenue += e.finalBudget ?? 0
          }
        })
        const pipeline = PIPELINE_STAGES.map((s, i) => ({
          label: s.label, color: s.color, bg: s.bg,
          count: stageTotals[i].count, revenue: stageTotals[i].revenue,
        }))

        setData({
          thisMonthRevenue, outstanding, collectionRate,
          activeEvents: activeEvents.length,
          thisMonthEvents: thisMonthEvents.length,
          crewCount, pendingTasks, inventoryCount,
          upcomingEvents, todayEvents, urgentTasks, pipeline,
        })
      } catch (err) {
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userData?.studioID, authLoading])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }, [])

  if (authLoading || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!data) return null

  const totalPipelineRevenue = data.pipeline.reduce((s, p) => s + p.revenue, 0)
  const name = userData?.displayName || userData?.email?.split("@")[0] || "there"

  return (
    <div className="space-y-6 animate-in fade-in duration-400">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-medium text-brand-primary">{studioData?.name}</span>
            {" · "}
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button
          className="bg-brand-primary text-white hover:bg-brand-primary-hover gap-2 shadow-sm"
          onClick={() => setNewEventOpen(true)}
        >
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="This Month Revenue"
          value={fmtMoney(data.thisMonthRevenue, currency)}
          sub={`${data.thisMonthEvents} event${data.thisMonthEvents !== 1 ? "s" : ""} this month`}
          accent="#d97706"
          trend="up"
          onClick={() => router.push("/app/analytics")}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Outstanding Balance"
          value={fmtMoney(data.outstanding, currency)}
          sub={`${data.collectionRate.toFixed(0)}% collection rate`}
          accent="#f59e0b"
          onClick={() => router.push("/app/analytics")}
        />
        <KpiCard
          icon={<Camera className="h-4 w-4" />}
          label="Active Events"
          value={String(data.activeEvents)}
          sub={`${data.upcomingEvents.length} in next 14 days`}
          accent="#f59e0b"
          onClick={() => router.push("/app/events")}
        />
        <KpiCard
          icon={<CheckSquare className="h-4 w-4" />}
          label="Pending Tasks"
          value={String(data.pendingTasks)}
          sub={data.urgentTasks.length > 0 ? `${data.urgentTasks.length} urgent` : "All on track"}
          accent={data.urgentTasks.length > 0 ? "#ef4444" : "#22c55e"}
          trend={data.urgentTasks.length > 0 ? "down" : "neutral"}
          onClick={() => router.push("/app/tasks")}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Crew Members"
          value={String(data.crewCount)}
          sub="Active team"
          accent="#18181b"
          onClick={() => router.push("/app/crew/overview")}
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Inventory Items"
          value={String(data.inventoryCount)}
          sub="Equipment tracked"
          accent="#64748b"
          onClick={() => router.push("/app/inventory/overview")}
        />
      </div>

      {/* ── Today's alert banner ────────────────────────────────────── */}
      {data.todayEvents.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-brand-primary px-4 py-3 text-white shadow-md">
          <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Star className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              You have {data.todayEvents.length} event{data.todayEvents.length !== 1 ? "s" : ""} today
            </p>
            <p className="text-white/70 text-xs truncate">
              {data.todayEvents.map(e => e.eventName || e.customerName).join(" · ")}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/15 shrink-0 gap-1 text-xs"
            onClick={() => router.push("/app/events")}
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Upcoming events — 2 cols */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
              <CardDescription>Next 14 days</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-brand-primary hover:bg-brand-primary-light text-xs gap-1"
              onClick={() => router.push("/app/events")}
            >
              All events <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Calendar className="h-9 w-9 opacity-20" />
                <p className="text-sm">No upcoming events in the next 14 days</p>
                <Button variant="link" size="sm" onClick={() => setNewEventOpen(true)}>
                  Schedule one now
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.upcomingEvents.map((event) => {
                  const date = getEventPrimaryDate(event)
                  const label = dayLabel(date)
                  const isUrgent = isToday(date) || isTomorrow(date)
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/app/events/${event.id}`)}
                    >
                      {/* Date pill */}
                      <div className={cn(
                        "shrink-0 w-14 text-center rounded-lg py-1.5 border",
                        isUrgent
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      )}>
                        <p className="text-[10px] font-semibold uppercase leading-none">
                          {format(date, "MMM")}
                        </p>
                        <p className="text-lg font-bold leading-tight">{format(date, "d")}</p>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {event.eventName || "Untitled"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400 truncate">
                            {event.customerName}
                          </span>
                          {event.eventType && (
                            <>
                              <span className="text-slate-200">·</span>
                              <span className="text-xs text-slate-400">{event.eventType}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-[11px] font-medium",
                          "text-brand-primary"
                        )}>
                          {label}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 h-5 capitalize", getStatusColor(event.status ?? ""))}
                        >
                          {event.status}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-5">

          {/* Urgent tasks */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base">Tasks to Action</CardTitle>
                <CardDescription>Urgent & overdue</CardDescription>
              </div>
              <Button
                variant="ghost" size="sm"
                className="text-brand-primary hover:bg-brand-primary-light text-xs gap-1"
                onClick={() => router.push("/app/tasks")}
              >
                All <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.urgentTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-8 text-muted-foreground">
                  <CheckSquare className="h-7 w-7 opacity-20" />
                  <p className="text-xs">No urgent tasks — all clear!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {data.urgentTasks.map((task) => {
                    const p = PRIORITY_CONFIG[task.priority ?? "medium"] ?? PRIORITY_CONFIG.medium
                    const overdue = task.dueDate ? isPast(safeDate(task.dueDate)) : false
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
                        onClick={() => router.push("/app/tasks")}
                      >
                        <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", p.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate leading-tight">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {task.linkedEventName && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {task.linkedEventName}
                              </span>
                            )}
                            {overdue && (
                              <span className="text-[10px] font-semibold text-red-500">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 shrink-0", p.color)}>
                          {p.label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "New Booking",  icon: Calendar,   action: () => setNewEventOpen(true),               accent: "#d97706" },
                  { label: "Crew",         icon: Users,       action: () => router.push("/app/crew/overview"),    accent: "#18181b" },
                  { label: "Inventory",    icon: Package,     action: () => router.push("/app/inventory/overview"), accent: "#f59e0b" },
                  { label: "Analytics",   icon: BarChart2,   action: () => router.push("/app/analytics"),        accent: "#8b5cf6" },
                  { label: "Tasks",        icon: CheckSquare, action: () => router.push("/app/tasks"),            accent: "#22c55e" },
                  { label: "Catalogue",   icon: Star,        action: () => router.push("/app/catalogue/overview"), accent: "#f59e0b" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-600 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.accent }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Revenue pipeline ────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-base">Revenue Pipeline</CardTitle>
            <CardDescription>
              Total across all stages — {fmtMoney(totalPipelineRevenue, currency)}
            </CardDescription>
          </div>
          <Button
            variant="ghost" size="sm"
            className="text-brand-primary hover:bg-brand-primary-light text-xs gap-1"
            onClick={() => router.push("/app/analytics")}
          >
            Full report <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Progress bar */}
          <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-px mb-5">
            {data.pipeline.map((stage) => {
              const pct = totalPipelineRevenue > 0 ? (stage.revenue / totalPipelineRevenue) * 100 : 0
              return pct > 0 ? (
                <div
                  key={stage.label}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: stage.color }}
                  title={`${stage.label}: ${pct.toFixed(1)}%`}
                />
              ) : null
            })}
            {totalPipelineRevenue === 0 && (
              <div className="h-full w-full bg-slate-100 rounded-full" />
            )}
          </div>

          {/* Stage cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.pipeline.map((stage) => {
              const pct = totalPipelineRevenue > 0 ? (stage.revenue / totalPipelineRevenue) * 100 : 0
              return (
                <div key={stage.label} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-medium text-slate-600">{stage.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {fmtMoney(stage.revenue, currency)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-400">{stage.count} event{stage.count !== 1 ? "s" : ""}</span>
                    <span className="text-[11px] font-medium" style={{ color: stage.color }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <EventFormDialog
        open={newEventOpen}
        onOpenChange={setNewEventOpen}
        initialData={null}
        onSuccess={() => setNewEventOpen(false)}
      />
    </div>
  )
}
