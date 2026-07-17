"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Calendar,
  Users,
  Package,
  CheckSquare,
  Loader2,
  ArrowRight,
  BarChart2,
  Camera,
  Settings,
  LayoutDashboard,
  AlertCircle,
} from "lucide-react"
import { getStatusColor } from "@/lib/event-utils"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultType = "event" | "task" | "crew" | "inventory"

interface SearchResult {
  id: string
  type: ResultType
  title: string
  subtitle: string
  href: string
  status?: string
  badge?: string
}

interface SearchData {
  events: SearchResult[]
  tasks: SearchResult[]
  crew: SearchResult[]
  inventory: SearchResult[]
  loaded: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ResultType, { icon: React.ElementType; color: string; label: string }> = {
  event:     { icon: Camera,      color: "#d97706", label: "Events" },
  task:      { icon: CheckSquare, color: "#8b5cf6", label: "Tasks" },
  crew:      { icon: Users,       color: "#18181b", label: "Crew" },
  inventory: { icon: Package,     color: "#f59e0b", label: "Inventory" },
}

const QUICK_LINKS = [
  { label: "Dashboard",  href: "/app",                      icon: LayoutDashboard, desc: "Studio overview" },
  { label: "Events",     href: "/app/events",               icon: Camera,          desc: "All events & bookings" },
  { label: "Crew",       href: "/app/crew/overview",        icon: Users,           desc: "Manage crew members" },
  { label: "Inventory",  href: "/app/inventory/overview",   icon: Package,         desc: "Equipment tracking" },
  { label: "Tasks",      href: "/app/tasks",                icon: CheckSquare,     desc: "Task planning" },
  { label: "Analytics",  href: "/app/analytics",            icon: BarChart2,       desc: "Reports & insights" },
  { label: "Settings",   href: "/app/studio/settings",      icon: Settings,        desc: "Studio settings" },
]

// ─── Data fetching ────────────────────────────────────────────────────────────

async function loadSearchData(studioID: string): Promise<SearchData> {
  const [eventsSnap, tasksSnap, memSnap, invSnap] = await Promise.all([
    getDocs(collection(db, "Studios", studioID, "Events")),
    getDocs(collection(db, "Studios", studioID, "tasks")),
    getDoc(doc(db, "Studios", studioID, "Members", "MEM_LIST")),
    getDocs(collection(db, "Studios", studioID, "Inventory")),
  ])

  // Events
  const events: SearchResult[] = eventsSnap.docs.map((d) => {
    const data = d.data()
    const name = data.eventName || data.customerName || "Untitled Event"
    const client = data.customerName || ""
    const type = data.eventType || "Event"
    return {
      id: d.id,
      type: "event",
      title: name,
      subtitle: [client, type].filter(Boolean).join(" · "),
      href: `/app/events/${d.id}`,
      status: data.status,
    }
  })

  // Tasks
  const tasks: SearchResult[] = tasksSnap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      type: "task",
      title: data.title || "Untitled Task",
      subtitle: data.linkedEventName
        ? `Linked to ${data.linkedEventName}`
        : data.description?.slice(0, 60) || `Priority: ${data.priority || "normal"}`,
      href: "/app/tasks",
      status: data.status,
      badge: data.priority,
    }
  })

  // Crew members
  const memberIds: string[] = memSnap.exists() ? (memSnap.data().ID_LIST ?? []) : []
  const memberDocs = await Promise.all(memberIds.map((uid) => getDoc(doc(db, "Users", uid))))
  const crew: SearchResult[] = memberDocs
    .filter((d) => d.exists())
    .map((d) => {
      const data = d.data()!
      return {
        id: d.id,
        type: "crew",
        title: data.displayName || data.name || "Unknown",
        subtitle: [data.designation || data.role, data.email].filter(Boolean).join(" · "),
        href: "/app/crew/overview",
        badge: data.role,
      }
    })

  // Inventory
  const inventory: SearchResult[] = invSnap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      type: "inventory",
      title: data.name || "Unknown Item",
      subtitle: [data.category || "Uncategorized", data.type === "rented" ? "Rented" : "Owned"].join(" · "),
      href: "/app/inventory/overview",
      status: data.status,
    }
  })

  return { events, tasks, crew, inventory, loaded: true }
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function matchScore(result: SearchResult, q: string): number {
  const lq = q.toLowerCase()
  const title = result.title.toLowerCase()
  const sub = result.subtitle.toLowerCase()
  if (title === lq) return 4
  if (title.startsWith(lq)) return 3
  if (title.includes(lq)) return 2
  if (sub.includes(lq)) return 1
  return 0
}

function filterSection(items: SearchResult[], q: string): SearchResult[] {
  return items
    .map((r) => ({ r, score: matchScore(r, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ r }) => r)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultItem({
  result,
  onSelect,
}: {
  result: SearchResult
  onSelect: () => void
}) {
  const cfg = TYPE_CONFIG[result.type]
  const Icon = cfg.icon
  return (
    <CommandItem
      value={`${result.type}-${result.id}-${result.title}`}
      onSelect={onSelect}
      className="gap-3 py-2.5"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${cfg.color}15` }}
      >
        <Icon className="h-4 w-4" style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{result.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {result.status && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 capitalize", getStatusColor(result.status))}
          >
            {result.status.replace(/_/g, " ")}
          </Badge>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
    </CommandItem>
  )
}

function QuickLinkItem({
  item,
  onSelect,
}: {
  item: (typeof QUICK_LINKS)[number]
  onSelect: () => void
}) {
  const Icon = item.icon
  return (
    <CommandItem value={`nav-${item.href}`} onSelect={onSelect} className="gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light">
        <Icon className="h-4 w-4 text-brand-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
    </CommandItem>
  )
}

function SectionGroup({
  heading,
  items,
  onSelect,
  showSeparator,
}: {
  heading: string
  items: SearchResult[]
  onSelect: (href: string) => void
  showSeparator?: boolean
}) {
  if (items.length === 0) return null
  return (
    <>
      {showSeparator && <CommandSeparator />}
      <CommandGroup heading={heading}>
        {items.slice(0, 6).map((r) => (
          <ResultItem key={r.id} result={r} onSelect={() => onSelect(r.href)} />
        ))}
        {items.length > 6 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            +{items.length - 6} more results
          </p>
        )}
      </CommandGroup>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalSearch() {
  const { userData } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const loadedForStudio = useRef<string | null>(null)

  // ── Ctrl+K / Cmd+K shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Lazy-load data when dialog opens (once per studio session) ──
  useEffect(() => {
    if (!open || !userData?.studioID) return
    if (loadedForStudio.current === userData.studioID) return

    setLoading(true)
    setError(false)
    loadSearchData(userData.studioID)
      .then((d) => {
        setData(d)
        loadedForStudio.current = userData.studioID
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [open, userData?.studioID])

  // ── Reset query on close ──
  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  const q = query.trim()
  const hasQuery = q.length > 0

  const filtered = data && hasQuery
    ? {
        events:    filterSection(data.events,    q),
        tasks:     filterSection(data.tasks,     q),
        crew:      filterSection(data.crew,      q),
        inventory: filterSection(data.inventory, q),
      }
    : null

  const totalResults = filtered
    ? filtered.events.length + filtered.tasks.length + filtered.crew.length + filtered.inventory.length
    : 0

  const hasResults = totalResults > 0

  return (
    <>
      {/* ── Navbar trigger (desktop) ──────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="relative hidden md:flex h-9 w-96 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition-all hover:border-brand-primary/30 hover:bg-white hover:text-slate-500"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search events, clients, crew…</span>
        <kbd className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </button>

      {/* ── Mobile trigger (icon only) ────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-brand-primary transition-colors"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* ── Command palette dialog ────────────────────────────────── */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search across events, tasks, crew, and inventory"
        className="max-w-2xl"
        showCloseButton={false}
      >
        <CommandInput
          placeholder="Search events, clients, crew, tasks…"
          value={query}
          onValueChange={setQuery}
          autoFocus
        />

        <CommandList className="max-h-[500px]">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading studio data…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span>Failed to load search data</span>
            </div>
          )}

          {/* No query → show quick navigation */}
          {!loading && !error && !hasQuery && (
            <CommandGroup heading="Quick Navigation">
              {QUICK_LINKS.map((item) => (
                <QuickLinkItem key={item.href} item={item} onSelect={() => navigate(item.href)} />
              ))}
            </CommandGroup>
          )}

          {/* Has query, no results */}
          {!loading && !error && hasQuery && !hasResults && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <Search className="h-8 w-8 opacity-15" />
                <p className="font-medium">No results for "{q}"</p>
                <p className="text-xs text-muted-foreground">Try searching by event name, client name, or crew member</p>
              </div>
            </CommandEmpty>
          )}

          {/* Search results */}
          {!loading && !error && filtered && hasResults && (
            <>
              <SectionGroup
                heading={`Events (${filtered.events.length})`}
                items={filtered.events}
                onSelect={navigate}
              />
              <SectionGroup
                heading={`Tasks (${filtered.tasks.length})`}
                items={filtered.tasks}
                onSelect={navigate}
                showSeparator={filtered.events.length > 0}
              />
              <SectionGroup
                heading={`Crew (${filtered.crew.length})`}
                items={filtered.crew}
                onSelect={navigate}
                showSeparator={filtered.events.length > 0 || filtered.tasks.length > 0}
              />
              <SectionGroup
                heading={`Inventory (${filtered.inventory.length})`}
                items={filtered.inventory}
                onSelect={navigate}
                showSeparator={
                  filtered.events.length > 0 ||
                  filtered.tasks.length > 0 ||
                  filtered.crew.length > 0
                }
              />
            </>
          )}
        </CommandList>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {hasQuery && !loading
              ? hasResults
                ? `${totalResults} result${totalResults !== 1 ? "s" : ""} found`
                : "No results"
              : loading
              ? "Loading…"
              : "Type to search · Quick links above"}
          </p>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">esc</kbd>
              close
            </span>
          </div>
        </div>
      </CommandDialog>
    </>
  )
}
