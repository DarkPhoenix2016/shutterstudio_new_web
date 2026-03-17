import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { safeDate } from "@/lib/date-utils"
import {
  format,
  subMonths,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
} from "date-fns"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyTrend {
  month: string
  revenue: number
  collected: number
  outstanding: number
  events: number
}

export interface IncomeExpensePoint {
  month: string
  income: number
  expense: number
  net: number
}

export interface EventTypeData {
  type: string
  count: number
  revenue: number
  pct: number
}

export interface StatusBreakdownData {
  status: string
  count: number
  revenue: number
}

export interface CrewUtilizationData {
  uid: string
  name: string
  designation: string
  role: string
  eventsAssigned: number
  utilizationPct: number
  photoURL?: string
}

export interface InventoryUtilizationData {
  id: string
  name: string
  category: string
  timesUsed: number
  daysScheduled: number
  utilizationPct: number
  status: string
  color?: string
}

export interface TopClientData {
  name: string
  events: number
  revenue: number
  collected: number
}

export interface AnalyticsData {
  // KPI Summary
  totalRevenue: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  totalEvents: number
  completedEvents: number
  cancelledEvents: number
  activeEvents: number
  avgEventValue: number
  periodMonths: number

  // Historical
  monthlyTrends: MonthlyTrend[]
  incomeVsExpense: IncomeExpensePoint[]

  // Finance breakdown
  eventTypeBreakdown: EventTypeData[]
  statusBreakdown: StatusBreakdownData[]

  // Workforce
  totalCrew: number
  assignedCrew: number
  crewUtilization: CrewUtilizationData[]

  // Resources
  totalInventory: number
  activeInventory: number
  maintenanceInventory: number
  inventoryUtilization: InventoryUtilizationData[]
  inventoryCategoryBreakdown: { name: string; count: number; used: number }[]

  // Top clients
  topClients: TopClientData[]
}

// ─── Internal raw types ───────────────────────────────────────────────────────

interface RawEvent {
  id: string
  customerName?: string
  eventName?: string
  eventType?: string
  status?: string
  days?: Array<{ date: unknown; cost?: number }>
  finalBudget?: number
  advancePaid?: number
  assignedCrew?: string[]
  assignedEquipment?: string[]
  transactions?: Array<{ type?: string; amount?: number; date?: unknown; method?: string }>
  createdAt?: unknown
  inquiryDate?: unknown
}

interface RawInventory {
  id: string
  name: string
  category?: string
  categoryId?: string
  status?: string
  color?: string
  schedules?: Record<string, string[]>
}

interface RawMember {
  uid: string
  displayName?: string
  name?: string
  designation?: string
  role?: string
  photoURL?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEventDate(event: RawEvent): Date {
  const firstDay = event.days?.[0]?.date
  if (firstDay) return safeDate(firstDay)
  if (event.inquiryDate) return safeDate(event.inquiryDate)
  return safeDate(event.createdAt)
}

function getEventCollected(event: RawEvent): number {
  if (event.transactions && event.transactions.length > 0) {
    const incomeSum = event.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)
    if (incomeSum > 0) return incomeSum
  }
  return event.advancePaid ?? 0
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "done", "delivered", "closed"].includes(status.toLowerCase())
}

function isCancelledStatus(status: string): boolean {
  return ["cancelled", "canceled", "rejected"].includes(status.toLowerCase())
}

function isActiveStatus(status: string): boolean {
  return ["confirmed", "booked", "in_progress", "shooting", "scheduled"].includes(
    status.toLowerCase()
  )
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function fetchAnalyticsData(
  studioID: string,
  periodMonths: number = 12
): Promise<AnalyticsData> {
  const now = new Date()
  const periodStart =
    periodMonths === 0 ? new Date(2000, 0, 1) : subMonths(now, periodMonths)

  // ── 1. Events ──────────────────────────────────────────────────────────────
  const eventsSnap = await getDocs(collection(db, "Studios", studioID, "Events"))
  const allEvents: RawEvent[] = eventsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RawEvent, "id">),
  }))

  const events = allEvents.filter((e) => isAfter(getEventDate(e), periodStart))

  // ── 2. Crew ────────────────────────────────────────────────────────────────
  const memSnap = await getDoc(doc(db, "Studios", studioID, "Members", "MEM_LIST"))
  const memberIds: string[] = memSnap.exists() ? (memSnap.data().ID_LIST ?? []) : []

  const memberDocs = await Promise.all(memberIds.map((uid) => getDoc(doc(db, "Users", uid))))
  const members: RawMember[] = memberDocs
    .filter((d) => d.exists())
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<RawMember, "uid">) }))

  // ── 3. Inventory ───────────────────────────────────────────────────────────
  const invSnap = await getDocs(collection(db, "Studios", studioID, "Inventory"))
  const inventoryItems: RawInventory[] = invSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RawInventory, "id">),
  }))

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalEvents = events.length
  const completedEvents = events.filter((e) => isCompletedStatus(e.status ?? "")).length
  const cancelledEvents = events.filter((e) => isCancelledStatus(e.status ?? "")).length
  const activeEvents = events.filter((e) => isActiveStatus(e.status ?? "")).length
  const totalRevenue = events.reduce((s, e) => s + (e.finalBudget ?? 0), 0)
  const totalCollected = events.reduce((s, e) => s + getEventCollected(e), 0)
  const totalOutstanding = totalRevenue - totalCollected
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0
  const avgEventValue = totalEvents > 0 ? totalRevenue / totalEvents : 0

  // ── Monthly Trends ─────────────────────────────────────────────────────────
  let monthIntervalStart = startOfMonth(periodStart)
  if (periodMonths === 0 && allEvents.length > 0) {
    const oldest = allEvents.reduce((min, e) => {
      const d = getEventDate(e)
      return isBefore(d, min) ? d : min
    }, now)
    monthIntervalStart = startOfMonth(oldest)
  }

  const months = eachMonthOfInterval({ start: monthIntervalStart, end: now })

  const monthlyTrends: MonthlyTrend[] = months.map((ms) => {
    const me = endOfMonth(ms)
    const label = format(ms, "MMM yy")
    const monthEvents = events.filter((e) => {
      const d = getEventDate(e)
      return !isBefore(d, ms) && !isAfter(d, me)
    })
    const rev = monthEvents.reduce((s, e) => s + (e.finalBudget ?? 0), 0)
    const col = monthEvents.reduce((s, e) => s + getEventCollected(e), 0)
    return { month: label, revenue: rev, collected: col, outstanding: rev - col, events: monthEvents.length }
  })

  // ── Income vs Expense (from transactions) ──────────────────────────────────
  const ieMap = new Map<string, { income: number; expense: number }>()
  months.forEach((m) => ieMap.set(format(m, "MMM yy"), { income: 0, expense: 0 }))

  events.forEach((e) => {
    ;(e.transactions ?? []).forEach((t) => {
      const tDate = safeDate(t.date)
      const key = format(tDate, "MMM yy")
      if (!ieMap.has(key)) return
      const entry = ieMap.get(key)!
      if (t.type === "income") entry.income += t.amount ?? 0
      else if (t.type === "expense") entry.expense += t.amount ?? 0
    })
  })

  const incomeVsExpense: IncomeExpensePoint[] = Array.from(ieMap.entries()).map(
    ([month, { income, expense }]) => ({ month, income, expense, net: income - expense })
  )

  // ── Event Type Breakdown ───────────────────────────────────────────────────
  const typeMap = new Map<string, { count: number; revenue: number }>()
  events.forEach((e) => {
    const t = e.eventType || "Other"
    const prev = typeMap.get(t) ?? { count: 0, revenue: 0 }
    typeMap.set(t, { count: prev.count + 1, revenue: prev.revenue + (e.finalBudget ?? 0) })
  })
  const eventTypeBreakdown: EventTypeData[] = Array.from(typeMap.entries())
    .map(([type, d]) => ({
      type,
      count: d.count,
      revenue: d.revenue,
      pct: totalEvents > 0 ? (d.count / totalEvents) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Status Breakdown ───────────────────────────────────────────────────────
  const statusMap = new Map<string, { count: number; revenue: number }>()
  events.forEach((e) => {
    const s = e.status || "unknown"
    const prev = statusMap.get(s) ?? { count: 0, revenue: 0 }
    statusMap.set(s, { count: prev.count + 1, revenue: prev.revenue + (e.finalBudget ?? 0) })
  })
  const statusBreakdown: StatusBreakdownData[] = Array.from(statusMap.entries())
    .map(([status, d]) => ({ status, count: d.count, revenue: d.revenue }))
    .sort((a, b) => b.count - a.count)

  // ── Crew Utilization ───────────────────────────────────────────────────────
  const crewEventCount = new Map<string, number>()
  events.forEach((e) => {
    ;(e.assignedCrew ?? []).forEach((uid) => {
      crewEventCount.set(uid, (crewEventCount.get(uid) ?? 0) + 1)
    })
  })

  const assignedCrew = Array.from(crewEventCount.keys()).length

  const crewUtilization: CrewUtilizationData[] = members
    .map((m) => {
      const count = crewEventCount.get(m.uid) ?? 0
      return {
        uid: m.uid,
        name: m.displayName ?? m.name ?? "Unknown",
        designation: m.designation ?? "",
        role: m.role ?? "",
        eventsAssigned: count,
        utilizationPct: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
        photoURL: m.photoURL,
      }
    })
    .sort((a, b) => b.eventsAssigned - a.eventsAssigned)

  // ── Inventory Utilization ─────────────────────────────────────────────────
  const periodStartStr = format(periodStart, "yyyy-MM-dd")
  const periodEndStr = format(now, "yyyy-MM-dd")
  const totalDaysInPeriod = Math.max(periodMonths === 0 ? 365 : periodMonths * 30, 1)

  const activeInventory = inventoryItems.filter((i) => (i.status ?? "active") === "active").length
  const maintenanceInventory = inventoryItems.filter((i) => i.status === "maintenance").length

  const categoryCountMap = new Map<string, { count: number; used: number }>()
  const inventoryUtilization: InventoryUtilizationData[] = inventoryItems.map((item) => {
    const schedules = item.schedules ?? {}
    const relevantEntries = Object.entries(schedules).filter(
      ([date]) => date >= periodStartStr && date <= periodEndStr
    )
    const uniqueEventIds = new Set(relevantEntries.flatMap(([, ids]) => ids))
    const timesUsed = uniqueEventIds.size
    const daysScheduled = relevantEntries.length
    const utilizationPct = Math.min((daysScheduled / totalDaysInPeriod) * 100, 100)

    const catName = item.category ?? "Uncategorized"
    const catPrev = categoryCountMap.get(catName) ?? { count: 0, used: 0 }
    categoryCountMap.set(catName, {
      count: catPrev.count + 1,
      used: catPrev.used + (timesUsed > 0 ? 1 : 0),
    })

    return {
      id: item.id,
      name: item.name,
      category: catName,
      timesUsed,
      daysScheduled,
      utilizationPct,
      status: item.status ?? "active",
      color: item.color,
    }
  })
  inventoryUtilization.sort((a, b) => b.timesUsed - a.timesUsed)

  const inventoryCategoryBreakdown = Array.from(categoryCountMap.entries()).map(
    ([name, d]) => ({ name, count: d.count, used: d.used })
  )

  // ── Top Clients ────────────────────────────────────────────────────────────
  const clientMap = new Map<string, { events: number; revenue: number; collected: number }>()
  events.forEach((e) => {
    const name = e.customerName || "Unknown"
    const prev = clientMap.get(name) ?? { events: 0, revenue: 0, collected: 0 }
    clientMap.set(name, {
      events: prev.events + 1,
      revenue: prev.revenue + (e.finalBudget ?? 0),
      collected: prev.collected + getEventCollected(e),
    })
  })
  const topClients: TopClientData[] = Array.from(clientMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    totalRevenue,
    totalCollected,
    totalOutstanding,
    collectionRate,
    totalEvents,
    completedEvents,
    cancelledEvents,
    activeEvents,
    avgEventValue,
    periodMonths,
    monthlyTrends,
    incomeVsExpense,
    eventTypeBreakdown,
    statusBreakdown,
    totalCrew: members.length,
    assignedCrew,
    crewUtilization,
    totalInventory: inventoryItems.length,
    activeInventory,
    maintenanceInventory,
    inventoryUtilization,
    inventoryCategoryBreakdown,
    topClients,
  }
}
