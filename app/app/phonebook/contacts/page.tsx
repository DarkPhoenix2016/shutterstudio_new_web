"use client"

import { useAuth } from "@/context/AuthContext"
import { fetchEvents, EventData } from "@/services/event-service"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

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
    MessageCircle, // WhatsApp
    Mail,
    User,
    Filter
} from "lucide-react"

const ITEMS_PER_PAGE = 20

export default function EventContactsPhonebookPage() {
    const { userData } = useAuth()
    const router = useRouter()
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<EventData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        if (userData?.studioID) {
            loadData()
        }
    }, [userData])

    const loadData = async () => {
        setError(null)
        try {
            if (userData?.studioID) {
                const fetched = await fetchEvents(userData.studioID)
                setEvents(fetched)
            }
        } catch (e) {
            console.error(e)
            setError("Failed to load contacts list. Please refresh the page.")
        } finally {
            setLoading(false)
        }
    }

    const contactsList = useMemo(() => {
        const map = new Map<string, {
            name: string;
            role: string;
            phone: string;
            email: string;
            events: { id: string; name: string; displayId?: string }[];
        }>()

        events.forEach(e => {
            if (!Array.isArray(e.contacts)) return
            e.contacts.forEach(c => {
                const name = c.name?.trim()
                if (!name) return
                const role = c.role?.trim() || "Event Contact"
                const phone = c.phone?.trim() || ""
                const email = c.email?.trim() || ""

                // Key combines phone, email, name, role to group correctly
                // But specifically unique event contact identity can be unique by name & phone or email
                const cleanPhone = phone ? phone.replace(/\D/g, "") : ""
                const key = `${name.toLowerCase()}_${role.toLowerCase()}`
                
                const eventInfo = {
                    id: e.id || "",
                    name: e.eventName || "Unnamed Event",
                    displayId: e.displayId || ""
                }

                const existing = map.get(key)
                if (existing) {
                    if (!existing.events.some(evt => evt.id === eventInfo.id)) {
                        existing.events.push(eventInfo)
                    }
                    if (!existing.phone && phone) existing.phone = phone
                    if (!existing.email && email) existing.email = email
                } else {
                    map.set(key, {
                        name,
                        role,
                        phone,
                        email,
                        events: [eventInfo]
                    })
                }
            })
        })
        return Array.from(map.values())
    }, [events])

    // List of unique roles for filtering
    const uniqueRoles = useMemo(() => {
        const rolesSet = new Set<string>()
        contactsList.forEach(c => {
            if (c.role) rolesSet.add(c.role.trim())
        })
        return Array.from(rolesSet).sort()
    }, [contactsList])

    // Filter logic
    const filteredContacts = useMemo(() => {
        let list = contactsList

        // Role filter
        if (selectedRole) {
            list = list.filter(c => c.role.toLowerCase() === selectedRole.toLowerCase())
        }

        // Search filter
        const query = searchTerm.toLowerCase().trim()
        if (query) {
            list = list.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.role.toLowerCase().includes(query) ||
                c.phone.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            )
        }

        return list
    }, [contactsList, selectedRole, searchTerm])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredContacts.length / ITEMS_PER_PAGE))
    const pagedContacts = useMemo(() => {
        return filteredContacts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    }, [filteredContacts, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedRole])

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
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Phonebook - Event Contacts</h1>
                <p className="text-xs text-slate-500 mt-1">Directory of vendors, team members, and event contacts aggregated from your events.</p>
            </div>

            {/* Filter controls */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, role, phone..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Unique Roles filters */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <span>Filter by Role:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-md bg-slate-50/50">
                        <Badge
                            variant={selectedRole === null ? "default" : "outline"}
                            className="cursor-pointer px-2.5 py-1 text-xs transition-all"
                            onClick={() => setSelectedRole(null)}
                        >
                            All Roles
                        </Badge>
                        {uniqueRoles.map((role) => (
                            <Badge
                                key={role}
                                variant={selectedRole === role ? "default" : "outline"}
                                className="cursor-pointer px-2.5 py-1 text-xs bg-white text-slate-700 hover:bg-slate-50 transition-all border-slate-200"
                                onClick={() => setSelectedRole(role)}
                            >
                                {role}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contacts Table */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold select-none">
                                <th className="p-4">Contact</th>
                                <th className="p-4">Assigned Role</th>
                                <th className="p-4">Phone Number</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Linked Events</th>
                                <th className="p-4 text-right">Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {pagedContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        No event contacts found with matches.
                                    </td>
                                </tr>
                            ) : (
                                pagedContacts.map((c, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <span>{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline" className="bg-slate-55/40 text-slate-700 border-slate-200">
                                                {c.role}
                                            </Badge>
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
                                                            title="Call Contact"
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
                                                            title="WhatsApp Contact"
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
                                                        title="Email Contact"
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
                            Showing page {currentPage} of {totalPages} ({filteredContacts.length} total contacts)
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
        </div>
    )
}
