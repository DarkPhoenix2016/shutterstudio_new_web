"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { fetchEvents, EventData } from "@/services/event-service"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Loader2, Search, X, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Calendar, MapPin, User, Camera, Tag, Info,
  Download, LayoutGrid, List, Images, ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { safeDate } from "@/lib/date-utils"
import { getStatusColor } from "@/lib/event-utils"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryItem {
  id: string
  url: string
  type: "cover" | "gallery"
  event: EventData
  eventIndex: number // index within the event's images
}

type ViewMode = "masonry" | "events"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEventImages(event: EventData): GalleryItem[] {
  const items: GalleryItem[] = []
  let i = 0
  if (event.couplePhotoUrl) {
    items.push({ id: `${event.id}_cover`, url: event.couplePhotoUrl, type: "cover", event, eventIndex: i++ })
  }
  ;(event.galleryUrls ?? []).forEach((url) => {
    items.push({ id: `${event.id}_${i}`, url, type: "gallery", event, eventIndex: i++ })
  })
  return items
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageCard({
  item,
  onClick,
  className,
}: {
  item: GalleryItem
  onClick: () => void
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const eventDate = safeDate(item.event.days?.[0]?.date)

  return (
    <div
      className={cn(
        "group relative cursor-zoom-in overflow-hidden rounded-xl bg-slate-200 border border-white/60 shadow-sm",
        "ring-0 hover:ring-2 hover:ring-[#1C4D8D]/30 transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      {/* Skeleton shimmer */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
      )}

      <img
        src={item.url}
        alt={item.event.eventName}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.04]",
          !loaded && "opacity-0"
        )}
      />

      {/* Cover badge */}
      {item.type === "cover" && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#1C4D8D] shadow-sm backdrop-blur-sm">
            <Camera className="h-2.5 w-2.5" /> Cover
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-white text-xs font-semibold leading-tight drop-shadow truncate">
          {item.event.eventName}
        </p>
        <p className="text-white/70 text-[10px] mt-0.5 drop-shadow">
          {format(eventDate, "MMM d, yyyy")}
        </p>
      </div>
    </div>
  )
}

function EventGroupCard({
  event,
  items,
  onImageClick,
}: {
  event: EventData
  items: GalleryItem[]
  onImageClick: (item: GalleryItem, allItems: GalleryItem[], idx: number) => void
}) {
  const router = useRouter()
  const preview = items.slice(0, 7)
  const extra = items.length - 7

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Event header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-[#1C4D8D]/8 flex items-center justify-center shrink-0">
            <Camera className="h-4.5 w-4.5 text-[#1C4D8D]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#0F2854] truncate leading-tight">{event.eventName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">
                {event.days?.[0]?.date ? format(safeDate(event.days[0].date), "MMM d, yyyy") : "—"}
              </span>
              {event.eventType && (
                <>
                  <span className="text-slate-200">·</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-[#1C4D8D]/20 text-[#1C4D8D]">
                    {event.eventType}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium">{items.length} photo{items.length !== 1 ? "s" : ""}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-[#1C4D8D] hover:bg-[#1C4D8D]/5"
            onClick={() => router.push(`/app/events/${event.id}`)}
            title="View event"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Photo strip */}
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No photos for this event</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
            {preview.map((item, i) => (
              <div
                key={item.id}
                className="aspect-square rounded-lg overflow-hidden cursor-zoom-in group relative bg-slate-100 border border-slate-100 hover:border-[#1C4D8D]/30 transition-all"
                onClick={() => onImageClick(item, items, i)}
              >
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {item.type === "cover" && (
                  <div className="absolute inset-0 ring-1 ring-inset ring-[#1C4D8D]/30 rounded-lg" />
                )}
              </div>
            ))}

            {extra > 0 && (
              <button
                className="aspect-square rounded-lg bg-slate-100 hover:bg-[#1C4D8D]/5 border border-slate-200 hover:border-[#1C4D8D]/30 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#1C4D8D] transition-all cursor-pointer"
                onClick={() => onImageClick(items[7], items, 7)}
              >
                <span className="text-base font-bold">+{extra}</span>
                <span className="text-[9px] leading-none">more</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  items,
  startIndex,
  onClose,
}: {
  items: GalleryItem[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [showInfo, setShowInfo] = useState(true)
  const [zoom, setZoom] = useState(1)
  const thumbRef = useRef<HTMLDivElement>(null)
  const current = items[index]

  const goNext = useCallback(() => { setIndex((i) => (i + 1) % items.length); setZoom(1) }, [items.length])
  const goPrev = useCallback(() => { setIndex((i) => (i - 1 + items.length) % items.length); setZoom(1) }, [items.length])

  useEffect(() => {
    const el = thumbRef.current?.children[index] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [index])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "Escape") onClose()
      else if (e.key === "i" || e.key === "I") setShowInfo((v) => !v)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goNext, goPrev, onClose])

  const handleDownload = async () => {
    try {
      const res = await fetch(current.url)
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `${current.event.eventName ?? "photo"}-${current.id}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(current.url, "_blank")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-200">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Camera className="h-3.5 w-3.5 text-white/70" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">
              {current.event.eventName}
            </p>
            <p className="text-white/40 text-[11px]">
              {current.event.eventType} · {current.event.customerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Counter */}
          <span className="text-white/50 text-xs font-medium px-2">
            {index + 1} / {items.length}
          </span>

          <Separator orientation="vertical" className="h-5 bg-white/10" />

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={() => setZoom((z) => Math.min(z + 0.5, 3))}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 bg-white/10" />

          <Button
            variant="ghost" size="icon"
            className={cn(
              "h-8 w-8 rounded-lg transition-colors",
              showInfo ? "text-[#4988C4] bg-[#1C4D8D]/30 hover:bg-[#1C4D8D]/40" : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            onClick={() => setShowInfo((v) => !v)}
            title="Toggle info (I)"
          >
            <Info className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 bg-white/10" />

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Middle: image + info ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Image area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
          {/* Prev arrow */}
          <button
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all hover:scale-105 border border-white/10"
            onClick={goPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Image */}
          <div
            className="w-full h-full flex items-center justify-center p-6 cursor-zoom-in"
            onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
          >
            <img
              key={current.url}
              src={current.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain transition-transform duration-300 select-none"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>

          {/* Next arrow */}
          <button
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all hover:scale-105 border border-white/10"
            onClick={goNext}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Cover badge */}
          {current.type === "cover" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-medium text-white border border-white/10">
                <Camera className="h-3 w-3" /> Cover Photo
              </span>
            </div>
          )}
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="w-72 shrink-0 bg-[#0a0f1a] border-l border-white/8 overflow-y-auto animate-in slide-in-from-right duration-250">
            <div className="p-5 space-y-5">
              {/* Event title */}
              <div>
                <Badge variant="outline" className={cn("text-[10px] mb-2", getStatusColor(current.event.status))}>
                  {current.event.status}
                </Badge>
                <h3 className="text-white font-bold text-base leading-snug">
                  {current.event.eventName}
                </h3>
                {current.event.eventType && (
                  <p className="text-[#4988C4] text-xs mt-1 font-medium">{current.event.eventType}</p>
                )}
              </div>

              <Separator className="bg-white/8" />

              {/* Meta */}
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Event Date</p>
                    <p className="text-white/80 text-sm mt-0.5">
                      {current.event.days?.[0]?.date
                        ? format(safeDate(current.event.days[0].date), "MMMM d, yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Client</p>
                    <p className="text-white/80 text-sm mt-0.5">{current.event.customerName}</p>
                    {current.event.customerMobile && (
                      <p className="text-white/40 text-xs mt-0.5">{current.event.customerMobile}</p>
                    )}
                  </div>
                </div>

                {current.event.locations?.[0] && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Location</p>
                      <p className="text-white/80 text-sm mt-0.5 break-words">
                        {current.event.locations[0].name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-white/8" />

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Tag className="h-3.5 w-3.5 text-white/30" />
                  <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(current.event as EventData & { tags?: string[] }).tags?.length ? (
                    (current.event as EventData & { tags?: string[] }).tags!.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] text-white/60 border border-white/10"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-white/25 text-xs italic">No tags</span>
                  )}
                </div>
              </div>

              <Separator className="bg-white/8" />

              {/* Meta info box */}
              <div className="rounded-xl bg-white/5 border border-white/8 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>Photo type</span>
                  <span className="text-white/70 capitalize font-medium">{current.type}</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Position</span>
                  <span className="text-white/70 font-medium">{index + 1} of {items.length}</span>
                </div>
                {current.event.displayId && (
                  <div className="flex justify-between text-white/50">
                    <span>Event ID</span>
                    <span className="text-white/70 font-mono">{current.event.displayId}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-[#1C4D8D] hover:bg-[#0F2854] text-white gap-2 rounded-xl"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" /> Download Photo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Thumbnail filmstrip ── */}
      <div className="shrink-0 bg-black/90 border-t border-white/8 py-2.5 px-3">
        <div ref={thumbRef} className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => { setIndex(i); setZoom(1) }}
              className={cn(
                "relative shrink-0 h-12 w-12 rounded-md overflow-hidden transition-all duration-150",
                i === index
                  ? "ring-2 ring-[#4988C4] opacity-100 scale-105"
                  : "opacity-40 hover:opacity-75 hover:ring-1 hover:ring-white/30"
              )}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-3 text-[10px] text-white/20">
          <span><kbd className="font-mono">←→</kbd> navigate</span>
          <span><kbd className="font-mono">I</kbd> info</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventGalleryPage() {
  const { userData } = useAuth()

  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("All")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("masonry")

  // Lightbox — stores the full item list + index separately so event-group view works
  const [lightboxItems, setLightboxItems] = useState<GalleryItem[] | null>(null)
  const [lightboxStart, setLightboxStart] = useState(0)

  // ── Load data ──
  useEffect(() => {
    if (!userData?.studioID) return
    fetchEvents(userData.studioID)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userData?.studioID])

  // ── Derived filter options ──
  const { availableTags, availableTypes } = useMemo(() => {
    const tags = new Set<string>()
    const types = new Set<string>()
    events.forEach((e) => {
      ;(e as EventData & { tags?: string[] }).tags?.forEach((t) => tags.add(t))
      if (e.eventType) types.add(e.eventType)
    })
    return { availableTags: [...tags].sort(), availableTypes: [...types].sort() }
  }, [events])

  // ── Filter events ──
  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          !q ||
          e.eventName.toLowerCase().includes(q) ||
          e.customerName.toLowerCase().includes(q)
        const matchesType = selectedType === "All" || e.eventType === selectedType
        const tags = (e as EventData & { tags?: string[] }).tags ?? []
        const matchesTag = !selectedTag || tags.includes(selectedTag)
        return matchesSearch && matchesType && matchesTag
      }),
    [events, searchQuery, selectedType, selectedTag]
  )

  // ── Flat images for masonry view ──
  const flatImages = useMemo(
    () => filteredEvents.flatMap(getEventImages),
    [filteredEvents]
  )

  // ── Event groups for "by event" view ──
  const eventGroups = useMemo(
    () =>
      filteredEvents
        .map((e) => ({ event: e, items: getEventImages(e) }))
        .filter((g) => g.items.length > 0),
    [filteredEvents]
  )

  const totalPhotos = useMemo(() => events.reduce((n, e) => n + getEventImages(e).length, 0), [events])
  const hasActiveFilters = searchQuery || selectedType !== "All" || selectedTag

  const openLightbox = useCallback((items: GalleryItem[], idx: number) => {
    setLightboxItems(items)
    setLightboxStart(idx)
  }, [])

  const clearFilters = () => { setSearchQuery(""); setSelectedType("All"); setSelectedTag(null) }

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" />
        <p className="text-sm text-muted-foreground">Loading gallery…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-8 -mt-8 bg-slate-50">

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F2854] tracking-tight">Event Gallery</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {totalPhotos.toLocaleString()} photos across {events.length} events
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-0.5 shrink-0">
            <button
              onClick={() => setViewMode("masonry")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "masonry"
                  ? "bg-white text-[#1C4D8D] shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Masonry
            </button>
            <button
              onClick={() => setViewMode("events")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "events"
                  ? "bg-white text-[#1C4D8D] shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="h-3.5 w-3.5" />
              By Event
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-2 pb-4">
          {/* Search */}
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search events or clients…"
              className="pl-8 h-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-[#1C4D8D] focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Event type */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-9 w-40 border-slate-200 bg-white text-sm focus:ring-[#1C4D8D]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag chips */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all",
                    selectedTag === tag
                      ? "bg-[#1C4D8D] text-white border-[#1C4D8D] shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:border-[#1C4D8D]/30 hover:text-[#1C4D8D]"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-colors"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          {/* Result count */}
          <span className="ml-auto text-xs text-slate-400">
            {viewMode === "masonry"
              ? `${flatImages.length} photo${flatImages.length !== 1 ? "s" : ""}`
              : `${eventGroups.length} event${eventGroups.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* ── Gallery body ───────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-6">

          {/* Empty state */}
          {(viewMode === "masonry" ? flatImages.length === 0 : eventGroups.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                <Images className="h-9 w-9 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-slate-500">No photos found</p>
                <p className="text-sm mt-1">
                  {hasActiveFilters ? "Try adjusting your filters" : "Add gallery photos to your events to see them here"}
                </p>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
          )}

          {/* ── Masonry grid ── */}
          {viewMode === "masonry" && flatImages.length > 0 && (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3 pb-8">
              {flatImages.map((item, idx) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  onClick={() => openLightbox(flatImages, idx)}
                  className="break-inside-avoid mb-3"
                />
              ))}
            </div>
          )}

          {/* ── By Event grid ── */}
          {viewMode === "events" && eventGroups.length > 0 && (
            <div className="space-y-4 pb-8">
              {eventGroups.map(({ event, items }) => (
                <EventGroupCard
                  key={event.id}
                  event={event}
                  items={items}
                  onImageClick={(_, groupItems, idx) => openLightbox(groupItems, idx)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Lightbox ── */}
      {lightboxItems && (
        <Lightbox
          items={lightboxItems}
          startIndex={lightboxStart}
          onClose={() => setLightboxItems(null)}
        />
      )}
    </div>
  )
}
