"use client"

import { useState, useEffect, useMemo, ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { 
    fetchInventory, fetchItemHistory, fetchCategories, 
    InventoryItem, StockTransaction, InventoryCategory 
} from "@/services/inventory-service"
import { fetchEvents, EventData } from "@/services/event-service" // Import Event Service
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar" // Shadcn Calendar
import { 
    Loader2, Search, Box, AlertTriangle, Layers, History, 
    Camera, User, Calendar as CalendarIcon, ChevronDown, ChevronRight, Tags,
    CalendarDays, MapPin, UserCheck
} from "lucide-react"
import { format, isSameDay } from "date-fns"

const ITEMS_PER_PAGE = 10;

export default function InventoryOverviewPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  // Data
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [events, setEvents] = useState<EventData[]>([]) // Store Events
  
  // Stats
  const [stats, setStats] = useState({ totalItems: 0, categoryCount: 0, fullyUtilized: 0, rentedCount: 0 })
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [page, setPage] = useState(1)

  // View State
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  // Reset to page 1 whenever filters or category expand/collapse changes
  useEffect(() => { setPage(1) }, [searchQuery, filterType, expandedCategories])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null) // For Details Dialog
  const [history, setHistory] = useState<StockTransaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Schedule State
  const [scheduleItem, setScheduleItem] = useState<InventoryItem | null>(null) // For Calendar Dialog
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    if (userData?.studioID) {
      loadData()
    }
  }, [userData])

  const loadData = async () => {
    try {
      // Fetch Inventory, Categories, AND Events
      const [itemsData, catsData, eventsData] = await Promise.all([
        fetchInventory(userData!.studioID!),
        fetchCategories(userData!.studioID!),
        fetchEvents(userData!.studioID!)
      ])
      
      setItems(itemsData)
      setCategories(catsData)
      setEvents(eventsData)
      
      // Calculate Stats
      const fullyUtilized = itemsData.filter(i => i.quantityAvailable === 0).length
      const rentedCount = itemsData.filter(i => i.type === 'rented').length
      const uniqueCategories = new Set(itemsData.map(i => i.category)).size

      setStats({
          totalItems: itemsData.length,
          categoryCount: uniqueCategories,
          fullyUtilized,
          rentedCount
      })

      // Auto-expand all categories found in items
      setExpandedCategories(Array.from(new Set(itemsData.map(i => i.category))))

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- ACTIONS ---

  const handleViewDetails = async (item: InventoryItem) => {
    setSelectedItem(item)
    setLoadingHistory(true)
    try {
      const hist = await fetchItemHistory(userData!.studioID!, item.id!)
      setHistory(hist)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleViewSchedule = (item: InventoryItem) => {
      setScheduleItem(item)
      setDate(new Date()) // Reset to today
      setIsScheduleOpen(true)
  }

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories(prev => 
        prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    )
  }

  // --- CALENDAR LOGIC (Per Item) ---
  const itemEvents = useMemo(() => {
      if (!scheduleItem) return [];
      // Filter events where this item is assigned
      return events.filter(e => e.assignedEquipment?.includes(scheduleItem.id!));
  }, [events, scheduleItem]);

  const eventDates = useMemo(() => {
      return itemEvents.flatMap(evt => evt.days.map(d => new Date(d.date)));
  }, [itemEvents]);

  const selectedDateEvents = useMemo(() => {
      return itemEvents.filter(evt => evt.days.some(d => date && isSameDay(new Date(d.date), date)));
  }, [itemEvents, date]);


  // --- FILTERING & SORTING ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === "all" || item.type === filterType
      return matchesSearch && matchesType
    })
  }, [items, searchQuery, filterType])

  const sortedItems = useMemo(() => {
      return [...filteredItems].sort((a, b) => a.category.localeCompare(b.category))
  }, [filteredItems])

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE)
  const paginatedItems = sortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // --- RENDER ROWS ---
  const renderTableRows = () => {
      if (paginatedItems.length === 0) {
          return <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items found.</TableCell></TableRow>
      }

      let lastCategory = ""
      const rows: ReactNode[] = []

      paginatedItems.forEach((item) => {
          if (item.category !== lastCategory) {
              const catObj = categories.find(c => c.name === item.category)
              const isExpanded = expandedCategories.includes(item.category)
              const bgColor = catObj?.color ? `${catObj.color}20` : '#f1f5f9' 
              const textColor = catObj?.color || '#0F2854'

              rows.push(
                  <TableRow 
                      key={`header-${item.category}`} 
                      className="cursor-pointer hover:opacity-80 transition-colors border-t-2"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => toggleCategoryExpand(item.category)}
                  >
                      <TableCell colSpan={6} className="py-2.5">
                          <div className="flex items-center gap-2 font-bold" style={{ color: textColor }}>
                              {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                              {item.category}
                              <Badge variant="outline" className="ml-2 bg-white/60 border-0 text-inherit">
                                  {items.filter(i => i.category === item.category).length} items
                              </Badge>
                          </div>
                      </TableCell>
                  </TableRow>
              )
              lastCategory = item.category
          }

          if (expandedCategories.includes(item.category)) {
              rows.push(
                <TableRow key={item.id} className="hover:bg-slate-50/50 group">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-[#0F2854] text-sm">{item.name}</p>
                        {item.serialNumber && <p className="text-[10px] text-slate-400">SN: {item.serialNumber}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-slate-500 font-normal">{item.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className={item.type === 'owned' ? "bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100" : "bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-100"}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.quantityAvailable === 0 ? "bg-red-500" : item.quantityAvailable < item.quantityTotal ? "bg-amber-400" : "bg-green-500"}`} 
                          style={{ width: `${(item.quantityAvailable / item.quantityTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-12 text-right">{item.quantityAvailable} / {item.quantityTotal}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        {/* SCHEDULE BUTTON */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50" 
                            onClick={() => handleViewSchedule(item)}
                            title="View Schedule"
                        >
                            <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleViewDetails(item)}>Details</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
          }
      })

      return rows
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F2854]">Inventory Overview</h1>
          <p className="text-muted-foreground">Track gear utilization and availability.</p>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1C4D8D]/5 border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-[#1C4D8D]/10 rounded-full text-[#1C4D8D]"><Box className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
              <h3 className="text-2xl font-bold text-[#0F2854]">{stats.totalItems} Items</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Tags className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <h3 className="text-2xl font-bold text-purple-700">{stats.categoryCount} Types</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600"><AlertTriangle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fully Utilized</p>
              <h3 className="text-2xl font-bold text-orange-700">{stats.fullyUtilized} Items</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600"><Layers className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rented Gear</p>
              <h3 className="text-2xl font-bold text-green-700">{stats.rentedCount} Units</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search equipment by name or category..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="owned">Owned Gear</SelectItem>
            <SelectItem value="rented">Rented Gear</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ITEMS TABLE */}
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-8">Item Details</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableRows()}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-slate-500">Page {page} of {totalPages || 1}</span>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAILS DIALOG */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.name}
              <Badge variant="secondary">{selectedItem?.category}</Badge>
            </DialogTitle>
            <DialogDescription>Item usage history and current status.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <span className="text-xs text-slate-500 uppercase">Current Stock</span>
                    <div className="text-2xl font-bold text-[#1C4D8D] mt-1">{selectedItem?.quantityAvailable} <span className="text-sm text-slate-400 font-normal">/ {selectedItem?.quantityTotal} available</span></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <span className="text-xs text-slate-500 uppercase">Pricing Model</span>
                    <div className="mt-1">
                        {selectedItem?.type === 'owned' ? (
                            <span className="font-medium text-slate-700">${selectedItem.costPerEvent} / event</span>
                        ) : (
                            <span className="font-medium text-slate-700">${selectedItem?.rentalRates?.daily} / day</span>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4"/> Recent Activity</h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {loadingHistory ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-slate-400"/></div>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center">No history recorded.</p>
                    ) : (
                        history.map((log) => (
                            <div key={log.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${log.type.includes('remove') || log.type.includes('assign') ? 'bg-orange-400' : 'bg-green-400'}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="font-medium text-slate-800 capitalize">{log.type.replace(/_/g, " ")}</p>
                                        <span className="text-xs text-slate-400">{log.date ? format(log.date.toDate(), 'MMM dd, HH:mm') : '-'}</span>
                                    </div>
                                    <p className="text-slate-600 mt-0.5">
                                        <span className="font-mono bg-slate-100 px-1 rounded text-xs mr-2">{log.quantity > 0 ? '+' : ''}{log.quantity}</span>
                                        {log.comment}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                        <User className="h-3 w-3"/> {log.performedBy}
                                        {log.eventId && <><span className="mx-1">•</span> <CalendarIcon className="h-3 w-3"/> Event ID: {log.eventId.substring(0,6)}...</>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE DIALOG (New Feature) */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                        <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-lg">
                            {scheduleItem?.name} Schedule
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground font-normal">
                            Assigned events and utilization for this item
                        </p>
                    </div>
                </div>
            </DialogHeader>
            
            <div className="flex flex-col md:flex-row h-full min-h-0">
                {/* LEFT: CALENDAR */}
                <div className="p-6 border-r flex flex-col items-center bg-white md:w-[380px] overflow-y-auto">
                    <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border shadow-sm p-4"
                        modifiers={{ booked: eventDates }}
                        modifiersStyles={{ booked: { fontWeight: 'bold', color: '#1C4D8D' } }}
                    />
                    
                    <div className="mt-6 w-full space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legend</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#1C4D8D]"></span> 
                            <span>Booked / In Use</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: EVENT LIST */}
                <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
                    <div className="p-6 border-b bg-white flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            {date ? format(date, "EEEE, MMMM do") : "Select a date"}
                            <Badge variant="secondary" className="ml-2 font-normal">
                                {selectedDateEvents.length} Events
                            </Badge>
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {selectedDateEvents.length > 0 ? (
                            selectedDateEvents.map(evt => {
                                const dayLoc = evt.locations?.find(l => date && isSameDay(new Date(l.date), date)) || evt.locations?.[0];
                                return (
                                    <div 
                                        key={evt.id} 
                                        className="group relative flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => router.push(`/app/events/${evt.id}`)}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 group-hover:w-1.5 transition-all"></div>
                                        <div className="p-4 pl-5">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 text-[10px] uppercase">{evt.eventType}</Badge>
                                                        {evt.status === "Shooting" && <Badge className="bg-red-100 text-red-600 animate-pulse border-0 text-[10px]">Live</Badge>}
                                                    </div>
                                                    <h4 className="font-bold text-lg text-slate-800">{evt.eventName}</h4>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-50">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <UserCheck className="h-4 w-4 text-slate-400" />
                                                    <span className="font-medium">{evt.customerName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <MapPin className="h-4 w-4 text-slate-400" />
                                                    <span className="truncate">{dayLoc?.name || "Location TBD"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-10">
                                <div className="bg-slate-100 p-4 rounded-full mb-3">
                                    <Box className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-medium text-slate-600">Item is available</p>
                                <p className="text-sm">No events scheduled for this day.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}