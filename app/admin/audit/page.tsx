"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, Calendar as CalendarIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LogEntry {
  id: string
  action: string
  details: string
  executor: string
  executorId: string
  timestamp: string
  module: string
}

const ITEMS_PER_PAGE = 50

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [globalSearch, setGlobalSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [filters, setFilters] = useState({
      action: "ALL",
      executor: "",
      module: "ALL"
  })
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: keyof LogEntry; direction: 'asc' | 'desc' }>({ 
    key: 'timestamp', 
    direction: 'desc' 
  })

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // 1. Initial Fetch
  useEffect(() => {
    const fetchLogs = async () => {
        try {
            const logsRef = collection(db, "AuditLogs")
            const q = query(logsRef, orderBy("timestamp", "desc"), limit(1000)) 
            const querySnapshot = await getDocs(q)
            const fetchedLogs: LogEntry[] = []
            querySnapshot.forEach((doc) => {
                fetchedLogs.push({ id: doc.id, ...doc.data() } as LogEntry)
            })
            setLogs(fetchedLogs)
        } catch (error) {
            console.error("Error fetching logs:", error)
        } finally {
            setLoading(false)
        }
    }
    fetchLogs()
  }, [])

  // 2. Filter & Sort Logic
  const processedLogs = useMemo(() => {
    let data = [...logs]

    // A. Date Range Filter (Using Shadcn Calendar)
    if (dateRange?.from) {
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        data = data.filter(log => new Date(log.timestamp) >= fromDate)
    }
    if (dateRange?.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        data = data.filter(log => new Date(log.timestamp) <= toDate)
    }

    // B. Global Search
    if (globalSearch) {
        const lowerTerm = globalSearch.toLowerCase()
        data = data.filter(log => 
            log.details.toLowerCase().includes(lowerTerm) ||
            log.id.toLowerCase().includes(lowerTerm)
        )
    }

    // C. Column Filters
    if (filters.action !== "ALL") {
        data = data.filter(log => log.action.includes(filters.action))
    }
    if (filters.module !== "ALL") {
        data = data.filter(log => log.module === filters.module)
    }
    if (filters.executor) {
        data = data.filter(log => log.executor.toLowerCase().includes(filters.executor.toLowerCase()))
    }

    // D. Sort
    data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    return data
  }, [logs, globalSearch, filters, sortConfig, dateRange])

  // 3. Pagination Logic
  const totalPages = Math.ceil(processedLogs.length / ITEMS_PER_PAGE)
  const currentLogs = processedLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => { setCurrentPage(1) }, [globalSearch, filters, dateRange])

  // Handlers
  const handleSort = (key: keyof LogEntry) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const formatDate = (isoString: string) => {
    try {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
    } catch (e) { return isoString }
  }

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN")) return "bg-green-50 text-green-700 border-green-200"
    if (action.includes("LOGOUT")) return "bg-slate-50 text-slate-600 border-slate-200"
    if (action.includes("DISABLE") || action.includes("DELETE")) return "bg-red-50 text-red-700 border-red-200"
    if (action.includes("CREATE") || action.includes("UPDATE") || action.includes("GENERATE")) return "bg-blue-50 text-blue-700 border-blue-200"
    return "bg-slate-50 text-slate-600 border-slate-200"
  }

  const uniqueActions = Array.from(new Set(logs.map(l => l.action.split('_')[0]))).sort()
  const uniqueModules = Array.from(new Set(logs.map(l => l.module))).sort()

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  return (
    <div className="flex-1 p-6 mx-auto space-y-4">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-[#1C4D8D]" /> Audit Trail
        </h1>
        <p className="text-xs text-muted-foreground">System-wide immutable event record.</p>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        {/* Card Header: Global Search on Top */}
        <CardHeader className="bg-slate-50/50 border-b py-3 px-4">
            <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-slate-700 hidden md:block">Log Explorer</CardTitle>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Search logs by ID or Details..." 
                        className="pl-8 h-8 text-xs bg-white border-slate-200" 
                        value={globalSearch} 
                        onChange={(e) => setGlobalSearch(e.target.value)} 
                    />
                </div>
            </div>
        </CardHeader>

        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        {/* 1. Sort Headers */}
                        <tr>
                            <th className="px-3 py-2 w-[220px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timestamp')}>
                                <div className="flex items-center gap-1">Time <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                            </th>
                            <th className="px-3 py-2 w-[140px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('action')}>
                                <div className="flex items-center gap-1">Action <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                            </th>
                            <th className="px-3 py-2 w-[150px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('executor')}>
                                <div className="flex items-center gap-1">Executor <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                            </th>
                            <th className="px-3 py-2">Details</th>
                            <th className="px-3 py-2 w-[130px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('module')}>
                                <div className="flex items-center gap-1">Module <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                            </th>
                        </tr>
                        
                        {/* 2. Filter Row */}
                        <tr className="bg-slate-50 border-b">
                            {/* Date Filter */}
                            <th className="px-3 py-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-7 text-xs justify-start text-left font-normal bg-white border-slate-200 px-2",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Filter Date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </th>

                            {/* Action Filter */}
                            <th className="px-3 py-1">
                                <Select value={filters.action} onValueChange={(v) => setFilters(prev => ({...prev, action: v}))}>
                                    <SelectTrigger className="h-7 text-xs bg-white border-slate-200"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Actions</SelectItem>
                                        {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </th>

                            {/* Executor Filter */}
                            <th className="px-3 py-1">
                                <Input 
                                    placeholder="Filter user..." 
                                    className="h-7 text-xs bg-white border-slate-200"
                                    value={filters.executor}
                                    onChange={(e) => setFilters(prev => ({...prev, executor: e.target.value}))}
                                />
                            </th>

                            {/* Details (Empty Filter) */}
                            <th className="px-3 py-1"></th>

                            {/* Module Filter */}
                            <th className="px-3 py-1">
                                <Select value={filters.module} onValueChange={(v) => setFilters(prev => ({...prev, module: v}))}>
                                    <SelectTrigger className="h-7 text-xs bg-white border-slate-200"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Modules</SelectItem>
                                        {uniqueModules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentLogs.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No logs found matching your criteria.</td></tr>
                        ) : (
                            currentLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                    <td className="px-3 py-2">
                                        <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-normal ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-700">{log.executor}</td>
                                    <td className="px-3 py-2 text-slate-600 max-w-md truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500">{log.module}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Compact Pagination */}
            {totalPages > 1 && (
                <div className="border-t p-2 flex items-center justify-between bg-slate-50/30 text-xs">
                    <span className="text-muted-foreground ml-2">
                        {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, processedLogs.length)} of {processedLogs.length}
                    </span>
                    <div className="flex items-center gap-1 mr-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="h-3 w-3"/>
                        </Button>
                        <span className="font-medium px-1">Page {currentPage}/{totalPages}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="h-3 w-3"/>
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}