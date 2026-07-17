"use client"

import { EventFormDialog } from "@/components/events/EventFormDialog"
import { useAuth } from "@/context/AuthContext"
import { getStatusColor } from "@/lib/event-utils"
import { deleteEvent, EventData, fetchEvents } from "@/services/event-service"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

// UI Components
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Icons
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { safeDate } from "@/lib/date-utils"
import { AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, Loader2, Plus, Search, Trash, User } from "lucide-react"
import Swal from "sweetalert2"

const EVENTS_PER_PAGE = 20

export default function EventsPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<EventData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [eventsPage, setEventsPage] = useState(1)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<EventData | null>(null)

    useEffect(() => {
        if (userData?.studioID) loadData()
    }, [userData])

    const loadData = async () => {
        setError(null)
        try {
            if (userData?.studioID) {
                setEvents(await fetchEvents(userData.studioID))
            }
        } catch (e) {
            console.error(e)
            setError("Failed to load events. Please refresh the page.")
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = useMemo(() => events.filter(e =>
        e.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.displayId?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [events, searchTerm])

    const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE))
    const pagedEvents = useMemo(
        () => filteredEvents.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE),
        [filteredEvents, eventsPage]
    )

    useEffect(() => { setEventsPage(1) }, [searchTerm])

    const openNew = () => { setEditingEvent(null); setIsFormOpen(true) }
    const openEdit = (e: React.MouseEvent, event: EventData) => { e.stopPropagation(); setEditingEvent(event); setIsFormOpen(true) }

    const handleDelete = async (e: React.MouseEvent, event: EventData) => {
        e.stopPropagation()
        if (!userData?.studioID || !event.id) return
        const result = await Swal.fire({
            title: "Delete Event?",
            text: `Are you sure you want to delete "${event.displayId || event.eventName}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!",
        })
        if (result.isConfirmed) {
            try {
                await deleteEvent(userData.studioID, event.id)
                Swal.fire("Deleted!", "Event has been removed.", "success")
                loadData()
            } catch {
                Swal.fire("Error", "Failed to delete event.", "error")
            }
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    if (error) return (
        <div className="flex flex-col h-96 items-center justify-center gap-3 text-slate-500">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="font-medium text-slate-700">{error}</p>
            <Button variant="outline" onClick={loadData}>Try Again</Button>
        </div>
    )

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0F2854]">Events</h1>
                    <p className="text-muted-foreground">Manage inquiries, bookings, and schedules.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search events..."
                            className="pl-9 w-[200px] md:w-[300px]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button className="bg-[#1C4D8D]" onClick={openNew}>
                        <Plus className="mr-2 h-4 w-4" /> Add Event
                    </Button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                    <CalendarIcon className="h-14 w-14 opacity-30" />
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-lg">No events yet</p>
                        <p className="text-sm mt-1">Create your first event to get started.</p>
                    </div>
                    <Button className="bg-[#1C4D8D] mt-2" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
                </div>
            )}

            {/* EVENTS GRID */}
            {events.length > 0 && filteredEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                    <Search className="h-10 w-10 opacity-30" />
                    <p className="font-medium text-slate-600">No events match your search</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {pagedEvents.map(event => {
                    const isIncomplete = (!event.assignedCrew?.length || !event.assignedEquipment?.length) && event.status !== "Inquiry"
                    return (
                        <Card
                            key={event.id}
                            className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group overflow-hidden flex flex-col h-full p-0"
                            onClick={() => router.push(`/app/events/${event.id}`)}
                        >
                            <div className="h-40 bg-slate-100 relative border-b">
                                {event.couplePhotoUrl ? (
                                    <img
                                        src={event.couplePhotoUrl}
                                        alt={event.eventName}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <CalendarIcon className="h-10 w-10" />
                                    </div>
                                )}
                                <Badge className={cn("absolute top-2 right-2 shadow-sm", getStatusColor(event.status))}>
                                    {event.status}
                                </Badge>
                            </div>

                            <CardContent className="p-4 flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <div className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        {event.displayId || event.id?.substring(0, 8).toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <CalendarIcon className="h-3 w-3" />
                                        {event.days?.[0]?.date
                                            ? format(safeDate(event.days[0].date), "MMM dd")
                                            : "TBD"}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-[#0F2854] text-lg leading-tight mb-1 group-hover:text-[#1C4D8D] transition-colors line-clamp-1">
                                        {event.eventName}
                                    </h3>
                                    <div className="flex flex-col gap-1 mt-2">
                                        {event.customerName && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="truncate">{event.customerName}</span>
                                            </div>
                                        )}
                                        {event.eventType && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 border-slate-200 text-slate-600">
                                                    {event.eventType}
                                                </Badge>
                                                {event.dayCount > 1 && (
                                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                                        +{event.dayCount - 1} days
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isIncomplete && (
                                    <div className="mt-auto pt-2">
                                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                            <AlertCircle className="h-3 w-3" /> Setup Incomplete
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <div className="p-3 border-t bg-slate-50/50 grid grid-cols-2 gap-3 mt-auto">
                                <Button
                                    variant="outline" size="sm"
                                    className="h-8 text-xs font-medium text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"
                                    onClick={e => openEdit(e, event)}
                                >
                                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    className="h-8 text-xs font-medium text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                                    onClick={e => handleDelete(e, event)}
                                >
                                    <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* PAGINATION */}
            {totalEventPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-slate-500">
                        Showing {(eventsPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(eventsPage * EVENTS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEventsPage(p => Math.max(1, p - 1))} disabled={eventsPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 min-w-[80px] text-center">Page {eventsPage} / {totalEventPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setEventsPage(p => Math.min(totalEventPages, p + 1))} disabled={eventsPage === totalEventPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* EVENT FORM DIALOG */}
            <EventFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                initialData={editingEvent}
                onSuccess={loadData}
            />
        </div>
    )
}
