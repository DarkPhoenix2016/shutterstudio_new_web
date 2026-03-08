"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, DollarSign, Calendar, Users, Camera, Clock, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { fetchInventory } from "@/services/inventory-service"
import { getStatusColor } from "@/lib/event-utils"
import { EventFormDialog } from "@/components/events/EventFormDialog"

// Types
interface DashboardEvent {
  id: string
  title: string
  type: string
  startDate: any
  status: string
  clientName?: string
}

export default function DashboardPage() {
  const { userData, studioData, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isNewEventOpen, setIsNewEventOpen] = useState(false)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [stats, setStats] = useState({
    crewCount: 0,
    activeShoots: 0,
    totalInvoices: 0,
    inventoryCount: 0,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.studioID) return

      try {
        const studioID = userData.studioID

        // 1. Fetch Crew Count (Members/MEM_LIST)
        let crewCount = 0
        try {
            const memRef = doc(db, "Studios", studioID, "Members", "MEM_LIST")
            const memSnap = await getDoc(memRef)
            if (memSnap.exists()) {
                crewCount = (memSnap.data().ID_LIST || []).length
            }
        } catch (e) {
            console.warn("Could not fetch crew count", e)
        }

        // 2. Fetch Upcoming Events (Next 7 days or next 5 items)
        const eventsList: DashboardEvent[] = []
        try {
            const eventsRef = collection(db, "Studios", studioID, "Events")
            // Simple query: Get recent/upcoming. 
            // Note: Complex date filtering usually requires a Firestore Index. 
            // We'll fetch a batch and filter client-side for simplicity/robustness here.
            const q = query(eventsRef, orderBy("startDate", "desc"), limit(10)) 
            
            const querySnapshot = await getDocs(q)
            const now = new Date()
            
            querySnapshot.forEach((doc) => {
                const data = doc.data()
                // Convert Timestamp to Date
                const eventDate = data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate)
                
                // Only show future events or very recent ones
                if (eventDate >= new Date(now.setDate(now.getDate() - 1))) { 
                    eventsList.push({
                        id: doc.id,
                        title: data.title || "Untitled Event",
                        type: data.type || "General",
                        startDate: eventDate,
                        status: data.status || "Scheduled",
                        clientName: data.clientName
                    })
                }
            })
        } catch (e) {
            console.warn("Could not fetch events", e)
        }

        // 3. Fetch Inventory Count
        let inventoryCount = 0
        try {
            const inventoryItems = await fetchInventory(studioID)
            inventoryCount = inventoryItems.length
        } catch (e) {
            console.warn("Could not fetch inventory count", e)
        }

        // 4. Set State
        setEvents(eventsList.slice(0, 5)) // Top 5
        setStats({
            crewCount,
            activeShoots: eventsList.length,
            totalInvoices: Number(studioData?.invoice_current || 0),
            inventoryCount,
        })

      } catch (error) {
        console.error("Dashboard Load Error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
        fetchDashboardData()
    }
  }, [userData, studioData, authLoading])

  // --- Helpers ---
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
  }

  const getEventTypeColor = (type: string) => {
      const t = type.toLowerCase()
      if (t.includes('wedding')) return "#1C4D8D" // Dark Blue
      if (t.includes('corporate') || t.includes('event')) return "#4988C4" // Medium Blue
      if (t.includes('studio') || t.includes('portrait')) return "#0F2854" // Navy
      return "#64748b" // Slate
  }

  if (authLoading || loading) {
      return (
        <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" />
        </div>
      )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {userData?.displayName || userData?.email.split("@")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening at <span className="font-semibold text-[#1C4D8D]">{studioData?.name}</span> today.
          </p>
        </div>
        <Button className="bg-[#1C4D8D] text-white hover:bg-[#0F2854] shadow-lg" onClick={() => setIsNewEventOpen(true)}>
          <Calendar className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Invoices */}
        <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-[#1C4D8D]/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#1C4D8D]/10">
                  <DollarSign className="h-5 w-5 text-[#1C4D8D]" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-foreground">
                  LIFETIME
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Invoices Generated</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalInvoices}</h3>
            </CardContent>
        </Card>

        {/* Stat 2: Active Shoots */}
        <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-[#4988C4]/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#4988C4]/10">
                  <Camera className="h-5 w-5 text-[#4988C4]" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-foreground">
                  UPCOMING
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled Events</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.activeShoots}</h3>
            </CardContent>
        </Card>

        {/* Stat 3: Crew */}
        <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-[#0F2854]/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#0F2854]/10">
                  <Users className="h-5 w-5 text-[#0F2854]" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-foreground">
                  TEAM
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Crew</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.crewCount}</h3>
            </CardContent>
        </Card>

        {/* Stat 4: Inventory Items */}
        <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-[#BDE8F5]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#BDE8F5]/50">
                  <Clock className="h-5 w-5 text-[#1C4D8D]" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-foreground">
                  GEAR
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Inventory Items</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.inventoryCount}</h3>
            </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* UPCOMING EVENTS LIST */}
        <Card className="lg:col-span-2 border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
            <div>
              <CardTitle className="text-foreground">Upcoming Shoots</CardTitle>
              <CardDescription>Your upcoming schedule</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-muted" onClick={() => router.push('/app/events/event')}>
              View All <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>

          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                      <Calendar className="h-10 w-10 mb-2 opacity-20" />
                      <p>No upcoming events scheduled.</p>
                      <Button variant="link" onClick={() => setIsNewEventOpen(true)}>Create one now</Button>
                  </div>
              ) : (
                  events.map((item) => {
                    const color = getEventTypeColor(item.type)
                    return (
                        <div
                        key={item.id}
                        className="flex items-center justify-between group cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-slate-100"
                        onClick={() => router.push(`/app/events/${item.id}`)}
                        >
                        <div className="flex items-center gap-4">
                            <div
                            className="h-10 w-10 rounded-full flex items-center justify-center font-bold border shrink-0"
                            style={{ backgroundColor: `${color}10`, color: color, borderColor: `${color}20` }}
                            >
                            {item.type.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{item.title}</p>
                                <p className="text-xs text-slate-500">{formatDate(item.startDate)} • {item.clientName || "Internal"}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className={cn("ml-2", getStatusColor(item.status))}>
                            {item.status}
                        </Badge>
                        </div>
                    )
                  })
              )}
            </div>
          </CardContent>
        </Card>

        {/* QUICK LINKS CARD */}
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-primary">Quick Actions</CardTitle>
            <CardDescription>Jump to key studio areas</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[
                { label: "Manage Crew", path: "/app/crew/overview" },
                { label: "Inventory", path: "/app/inventory/overview" },
                { label: "Tasks", path: "/app/tasks" },
                { label: "Catalogue", path: "/app/catalogue/overview" },
                { label: "Studio Settings", path: "/app/studio/settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#1C4D8D]/5 hover:text-[#1C4D8D] transition-colors border border-transparent hover:border-[#1C4D8D]/10"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <EventFormDialog
        open={isNewEventOpen}
        onOpenChange={setIsNewEventOpen}
        initialData={null}
      />
    </div>
  )
}