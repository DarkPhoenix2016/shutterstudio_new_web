"use client"

import { useAuth } from "@/context/AuthContext"
import { fetchEvents, EventData } from "@/services/event-service"
import { fetchStudioContacts, StudioContact } from "@/services/customer-service"
import { ContactFormDialog } from "@/components/phonebook/ContactFormDialog"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, Suspense } from "react"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Icons
import { 
    AlertCircle, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Search, 
    Phone, 
    MessageCircle, // Used for WhatsApp
    Mail,
    Plus,
    User
} from "lucide-react"

const ITEMS_PER_PAGE = 20

export default function CustomersPhonebookPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>}>
            <CustomersPhonebookPage />
        </Suspense>
    )
}

function CustomersPhonebookPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<EventData[]>([])
    const [nativeContacts, setNativeContacts] = useState<StudioContact[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<StudioContact | null>(null)

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setTimeout(() => setIsFormOpen(true), 300)
            router.replace('/app/phonebook/customers', { scroll: false })
        }
    }, [searchParams, router])

    useEffect(() => {
        if (userData?.studioID) {
            loadData()
        }
    }, [userData])

    const loadData = async () => {
        setError(null)
        try {
            if (userData?.studioID) {
                const [fetchedEvents, fetchedContacts] = await Promise.all([
                    fetchEvents(userData.studioID),
                    fetchStudioContacts(userData.studioID)
                ])
                setEvents(fetchedEvents)
                setNativeContacts(fetchedContacts)
            }
        } catch (e) {
            console.error(e)
            setError("Failed to load customer list. Please refresh the page.")
        } finally {
            setLoading(false)
        }
    }

    const customersList = useMemo(() => {
        const map = new Map<string, {
            name: string;
            phone: string;
            email: string;
            events: { id: string; name: string; displayId?: string }[];
            customId?: string;
        }>()

        events.forEach(e => {
            const name = e.customerName?.trim()
            if (!name) return
            const phone = e.customerMobile?.trim() || ""
            const email = e.customerEmail?.trim() || ""
            
            // Normalize key
            const cleanPhone = phone ? phone.replace(/\D/g, "") : ""
            const key = cleanPhone || email.toLowerCase() || name.toLowerCase()

            if (key) {
                const existing = map.get(key)
                const eventInfo = {
                    id: e.id || "",
                    name: e.eventName || "Unnamed Event",
                    displayId: e.displayId || ""
                }
                
                if (existing) {
                    if (!existing.events.some(evt => evt.id === eventInfo.id)) {
                        existing.events.push(eventInfo)
                    }
                    if (!existing.phone && phone) existing.phone = phone
                    if (!existing.email && email) existing.email = email
                } else {
                    map.set(key, {
                        name,
                        phone,
                        email,
                        events: [eventInfo]
                    })
                }
            }
        })
        // Also incorporate native contacts
        nativeContacts.forEach(nc => {
            const phone = nc.mobile?.trim() || ""
            const cleanPhone = phone ? phone.replace(/\D/g, "") : ""
            const email = nc.email?.trim() || ""
            const key = cleanPhone || email.toLowerCase() || nc.name.toLowerCase()

            if (key) {
                const existing = map.get(key)
                if (existing) {
                    // Update potentially missing fields from the manual contact
                    if (!existing.phone && phone) existing.phone = phone
                    if (!existing.email && email) existing.email = email
                    if (!existing.customId) existing.customId = nc.id
                } else {
                    map.set(key, {
                        customId: nc.id,
                        name: nc.name,
                        phone,
                        email,
                        events: []
                    })
                }
            }
        })

        return Array.from(map.values())
    }, [events, nativeContacts])

    // Filter Logic
    const filteredCustomers = useMemo(() => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return customersList
        return customersList.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        )
    }, [customersList, searchTerm])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))
    const pagedCustomers = useMemo(() => {
        return filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    }, [filteredCustomers, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const getWhatsAppLink = (phone: string) => {
        const digits = phone.replace(/\D/g, "")
        if (digits.startsWith("0")) {
            return `https://wa.me/94${digits.slice(1)}`
        }
        return `https://wa.me/${digits || phone}`
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col h-96 items-center justify-center gap-3 text-slate-500">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="font-medium text-slate-700">{error}</p>
                <Button variant="outline" onClick={loadData}>Try Again</Button>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Phonebook - Customers</h1>
                    <p className="text-xs text-slate-500 mt-1">Directory of customers aggregated from your event registers.</p>
                </div>
            </div>

            {/* Filters / Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-full">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, phone or email..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button 
                    className="bg-[#1C4D8D] shrink-0" 
                    onClick={() => { setEditingContact(null); setIsFormOpen(true); }}
                >
                    <Plus className="h-4 w-4 mr-2" /> New Contact
                </Button>
            </div>

            {/* Customer Table */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold select-none">
                                <th className="p-4">Customer Name</th>
                                <th className="p-4">Phone Number</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Linked Events</th>
                                <th className="p-4 text-right">Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {pagedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        No customer contacts found.
                                    </td>
                                </tr>
                            ) : (
                                pagedCustomers.map((c, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <span>{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-xs">{c.phone || "—"}</td>
                                        <td className="p-4 text-slate-600 text-xs">{c.email || "—"}</td>
                                        <td className="p-4 max-w-xs">
                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                {c.events.slice(0, 3).map((e) => (
                                                    <Badge 
                                                        key={e.id} 
                                                        variant="secondary" 
                                                        className="px-2 py-0.5 text-[10px] font-normal bg-slate-100 text-slate-700 border border-slate-250 cursor-pointer hover:bg-slate-200/80 transition-all"
                                                        onClick={() => router.push(`/app/events/${e.id}`)}
                                                    >
                                                        {e.displayId || e.name}
                                                    </Badge>
                                                ))}
                                                {c.events.length > 3 && (
                                                    <span className="text-[10px] text-slate-400 font-medium ml-0.5">
                                                        +{c.events.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {c.phone && (
                                                    <>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="w-8 h-8 rounded-full text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
                                                            title="Call Customer"
                                                            asChild
                                                        >
                                                            <a href={`tel:${c.phone}`}>
                                                                <Phone className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="w-8 h-8 rounded-full text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all"
                                                            title="WhatsApp Customer"
                                                            asChild
                                                        >
                                                            <a href={getWhatsAppLink(c.phone)} target="_blank" rel="noopener noreferrer">
                                                                <MessageCircle className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    </>
                                                )}
                                                {c.email && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="w-8 h-8 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all"
                                                        title="Email Customer"
                                                        asChild
                                                    >
                                                        <a href={`mailto:${c.email}`}>
                                                            <Mail className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/30">
                        <span className="text-xs text-slate-500">
                            Showing page {currentPage} of {totalPages} ({filteredCustomers.length} total customers)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 pl-2.5 bg-white"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 pr-2.5 bg-white"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <ContactFormDialog 
                open={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                initialData={editingContact} 
                studioId={userData?.studioID || ""} 
                onSuccess={loadData} 
            />
        </div>
    )
}
