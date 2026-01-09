"use client"

import { useState, useEffect, useMemo, ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"
import { fetchInventory, fetchItemHistory, fetchCategories, InventoryItem, StockTransaction, InventoryCategory } from "@/lib/inventory-service"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Loader2, Search, Box, AlertTriangle, Layers, History, 
    Camera, User, Calendar, ChevronDown, ChevronRight, Tags 
} from "lucide-react"
import { format } from "date-fns"

const ITEMS_PER_PAGE = 10;

export default function InventoryOverviewPage() {
  const { userData } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Data
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  
  // Stats
  const [stats, setStats] = useState({ totalItems: 0, categoryCount: 0, fullyUtilized: 0, rentedCount: 0 })
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [page, setPage] = useState(1)

  // View State
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [history, setHistory] = useState<StockTransaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (userData?.studioID) {
      loadData()
    }
  }, [userData])

  const loadData = async () => {
    try {
      const [itemsData, catsData] = await Promise.all([
        fetchInventory(userData!.studioID!),
        fetchCategories(userData!.studioID!)
      ])
      
      setItems(itemsData)
      setCategories(catsData)
      
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

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories(prev => 
        prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    )
  }

  // --- FILTERING & SORTING ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === "all" || item.type === filterType
      return matchesSearch && matchesType
    })
  }, [items, searchQuery, filterType])

  // Sort by Category for grouping
  const sortedItems = useMemo(() => {
      return [...filteredItems].sort((a, b) => a.category.localeCompare(b.category))
  }, [filteredItems])

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE)
  const paginatedItems = sortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // --- RENDER ROWS (Grouped) ---
  const renderTableRows = () => {
      if (paginatedItems.length === 0) {
          return <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items found.</TableCell></TableRow>
      }

      let lastCategory = ""
      const rows: ReactNode[] = []

      paginatedItems.forEach((item) => {
          // 1. Insert Category Header if changed
          if (item.category !== lastCategory) {
              const catObj = categories.find(c => c.name === item.category)
              const isExpanded = expandedCategories.includes(item.category)
              // Use category color or default gray
              const bgColor = catObj?.color ? `${catObj.color}20` : '#f1f5f9' 
              const textColor = catObj?.color || '#0F2854'

              rows.push(
                  <TableRow 
                      key={`header-${item.category}`} 
                      className="cursor-pointer hover:opacity-80 transition-colors border-t-2"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => toggleCategoryExpand(item.category)}
                  >
                      <TableCell colSpan={5} className="py-2.5">
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

          // 2. Insert Item Row (if category expanded)
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
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleViewDetails(item)}>Details</Button>
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
        
        {/* [!code highlight] Changed: Shows Category Count */}
        <Card className="bg-purple-50 border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Tags className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <h3 className="text-2xl font-bold text-purple-700">{stats.categoryCount} Types</h3>
            </div>
          </CardContent>
        </Card>

        {/* [!code highlight] Changed: Shows Fully Utilized Count */}
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

      {/* ITEMS TABLE (Category Wise) */}
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
          
          {/* Pagination */}
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
            {/* Status Cards */}
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

            {/* History Feed */}
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
                                        {log.eventId && <><span className="mx-1">•</span> <Calendar className="h-3 w-3"/> Event ID: {log.eventId.substring(0,6)}...</>}
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
    </div>
  )
}