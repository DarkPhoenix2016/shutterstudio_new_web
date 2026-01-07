"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Loader2, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LogEntry {
  id: string
  action: string
  details: string
  executor: string
  executorId: string
  timestamp: string
  module: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moduleFilter, setModuleFilter] = useState("ALL")

  useEffect(() => {
    const fetchLogs = async () => {
        try {
            const logsRef = collection(db, "AuditLogs")
            const q = query(logsRef, orderBy("timestamp", "desc"), limit(200)) // Fetch last 200 logs
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.executor.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModule = moduleFilter === "ALL" || log.module === moduleFilter

    return matchesSearch && matchesModule
  })

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN")) return "bg-green-100 text-green-700 border-green-200"
    if (action.includes("LOGOUT")) return "bg-slate-100 text-slate-700 border-slate-200"
    if (action.includes("DISABLE")) return "bg-red-100 text-red-700 border-red-200"
    if (action.includes("CREATE")) return "bg-blue-100 text-blue-700 border-blue-200"
    return "bg-slate-50 text-slate-600 border-slate-200"
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
  }

  return (
    <div className="flex-1 p-8 mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ScrollText className="h-8 w-8 text-[#1C4D8D]" />
                Audit Trail
            </h1>
            <p className="text-muted-foreground mt-1">Immutable record of all administrative actions (Last 200).</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Modules</SelectItem>
                    <SelectItem value="Auth">Authentication</SelectItem>
                    <SelectItem value="AdminManagement">Admin Mgmt</SelectItem>
                    <SelectItem value="AdminProfile">Profile</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Executor</th>
                            <th className="px-6 py-4">Details</th>
                            <th className="px-6 py-4">Module</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLogs.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No logs found matching your criteria.</td></tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                    <td className="px-6 py-4"><Badge variant="outline" className={getActionColor(log.action)}>{log.action}</Badge></td>
                                    <td className="px-6 py-4 font-medium">{log.executor}</td>
                                    <td className="px-6 py-4 text-slate-600 max-w-md truncate" title={log.details}>{log.details}</td>
                                    <td className="px-6 py-4 text-slate-500">{log.module}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}