"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, Server, HardDrive, Activity, 
  RefreshCw, FolderOpen, Loader2, Database, AlertCircle 
} from "lucide-react"
import { 
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts"
import { collection, getDocs, query, where, getCountFromServer, doc, getDoc, collectionGroup } from "firebase/firestore"
import { ref, listAll, getMetadata } from "firebase/storage"
import { db, storage } from "@/lib/firebase"

// --- TYPES ---
interface StudioSummary {
  id: string
  name: string
  package: string
}

interface RoleData {
  name: string
  value: number
  color: string
}

// --- COLORS ---
const COLORS = ['#1C4D8D', '#4988C4', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

// --- HELPER: Recursive Storage Calculator ---
const calculateFolderSize = async (path: string): Promise<number> => {
    let totalBytes = 0
    const traverse = async (currentPath: string) => {
        const folderRef = ref(storage, currentPath)
        try {
            const res = await listAll(folderRef)
            // Sum files
            const metadataPromises = res.items.map(item => getMetadata(item))
            const metaSnapshots = await Promise.all(metadataPromises)
            metaSnapshots.forEach(meta => totalBytes += meta.size)
            
            // Recurse folders
            for (const folder of res.prefixes) {
                await traverse(folder.fullPath)
            }
        } catch (error) {
            console.warn(`Skipping folder ${currentPath}:`, error)
        }
    }
    await traverse(path)
    return totalBytes
}

// --- HELPER: Format Bytes ---
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("global")

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">Real-time system performance and studio insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
          <TabsTrigger value="global">Global Overview</TabsTrigger>
          <TabsTrigger value="studio">Studio Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <GlobalAnalytics />
        </TabsContent>

        <TabsContent value="studio">
          <StudioSpecificAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ------------------------------------------------------------------
// 1. GLOBAL ANALYTICS COMPONENT
// ------------------------------------------------------------------

function GlobalAnalytics() {
  const [counts, setCounts] = useState({ studios: 0, users: 0, events: 0 })
  const [roleDistribution, setRoleDistribution] = useState<RoleData[]>([])
  const [totalStorage, setTotalStorage] = useState<string>("Calculating...")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        // 1. Efficient Aggregation Counts
        const studiosColl = collection(db, "Studios")
        const usersColl = collection(db, "Users")
        const eventsGroup = query(collectionGroup(db, "Events")) 

        const [studioSnap, userSnap, eventSnap] = await Promise.all([
            getCountFromServer(studiosColl),
            getCountFromServer(usersColl),
            getCountFromServer(eventsGroup)
        ])
        
        setCounts({
          studios: studioSnap.data().count,
          users: userSnap.data().count,
          events: eventSnap.data().count
        })

        // 2. User Role Breakdown
        const usersSnapshot = await getDocs(usersColl)
        const roles: Record<string, number> = {}
        
        usersSnapshot.forEach(doc => {
          const role = doc.data().role || "Unknown"
          // [!code highlight] Fix: Explicitly type 'l' as string
          const cleanRole = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
          roles[cleanRole] = (roles[cleanRole] || 0) + 1
        })

        const chartData = Object.keys(roles).map((role, index) => ({
          name: role,
          value: roles[role],
          color: COLORS[index % COLORS.length]
        }))
        setRoleDistribution(chartData)

        // 3. Global Storage Calculation
        calculateFolderSize("Studios").then(bytes => {
            setTotalStorage(formatBytes(bytes))
        })

      } catch (e) {
        console.error("Global Data Error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchGlobalData()
  }, [])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-50 text-[#1C4D8D]"><Server className="h-6 w-6"/></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Studios</p>
              <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : counts.studios}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-50 text-green-600"><Users className="h-6 w-6"/></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : counts.users}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600"><Activity className="h-6 w-6"/></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : counts.events}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-50 text-orange-600"><HardDrive className="h-6 w-6"/></div>
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <h3 className="text-xl font-bold">{totalStorage}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User Distribution Chart */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Global User Distribution</CardTitle>
            <CardDescription>Breakdown of all registered users by role</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin"/></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Database Usage Overview */}
        <Card className="border-none shadow-md bg-slate-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-slate-600"/> Database Health
                </CardTitle>
                <CardDescription>Aggregate usage metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">Storage Used (Studios/)</span>
                        <span className="text-slate-500">{totalStorage}</span>
                    </div>
                    <Progress value={35} className="h-2" />
                    <p className="text-xs text-muted-foreground">Represents total size of user-uploaded content in the 'Studios' bucket.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded border">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Docs (Est.)</p>
                        <p className="text-2xl font-bold text-slate-700">
                            {(counts.studios + counts.users + counts.events + (counts.events * 2)).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">Includes Studios, Users, Events & sub-docs</p>
                    </div>
                    <div className="bg-white p-4 rounded border">
                        <p className="text-xs text-slate-500 uppercase font-bold">Active Roles</p>
                        <p className="text-2xl font-bold text-slate-700">{roleDistribution.length}</p>
                        <p className="text-xs text-slate-400">Distinct permission levels</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// 2. STUDIO SPECIFIC ANALYTICS COMPONENT
// ------------------------------------------------------------------

function StudioSpecificAnalytics() {
  const [studios, setStudios] = useState<StudioSummary[]>([])
  const [selectedStudioId, setSelectedStudioId] = useState<string>("")
  
  // Studio Specific Stats
  const [studioPackage, setStudioPackage] = useState<string>("Unknown")
  const [eventsCount, setEventsCount] = useState(0)
  const [storageUsed, setStorageUsed] = useState<string>("0 Bytes")
  const [userRoles, setUserRoles] = useState<RoleData[]>([])
  
  const [isCalculating, setIsCalculating] = useState(false)

  // 1. Fetch Studios List for Dropdown
  useEffect(() => {
    const fetchStudios = async () => {
      const snap = await getDocs(collection(db, "Studios"))
      const list = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || "Unknown",
        package: doc.data().package || "Basic"
      }))
      setStudios(list)
    }
    fetchStudios()
  }, [])

  // 2. Fetch Details when Studio Selected
  useEffect(() => {
    if (!selectedStudioId) return

    const fetchDetails = async () => {
      setIsCalculating(true)
      
      try {
        // A. Get Studio Doc (Package Info)
        const studioRef = doc(db, "Studios", selectedStudioId)
        const studioDoc = await getDoc(studioRef)
        if (studioDoc.exists()) {
            setStudioPackage(studioDoc.data().package || "Basic")
        }

        // B. Get Real Event Count (Subcollection)
        const eventsColl = collection(db, `Studios/${selectedStudioId}/Events`)
        const eventSnap = await getCountFromServer(eventsColl)
        setEventsCount(eventSnap.data().count)

        // C. Get Users Breakdown
        const usersQuery = query(collection(db, "Users"), where("studioID", "==", selectedStudioId))
        const usersSnap = await getDocs(usersQuery)
        const roles: Record<string, number> = {}
        usersSnap.forEach(doc => {
            const role = doc.data().role || "Crew"
            // [!code highlight] Fix: Explicitly type 'l' as string
            const cleanRole = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
            roles[cleanRole] = (roles[cleanRole] || 0) + 1
        })
        const chartData = Object.keys(roles).map((role, index) => ({
            name: role,
            value: roles[role],
            color: COLORS[index % COLORS.length]
        }))
        setUserRoles(chartData)

        // D. Get Real Storage Size
        const bytes = await calculateFolderSize(`Studios/${selectedStudioId}`)
        setStorageUsed(formatBytes(bytes))

      } catch (e) {
        console.error("Studio Analytics Error:", e)
      } finally {
        setIsCalculating(false)
      }
    }
    
    setStorageUsed("Calculating...")
    setEventsCount(0)
    fetchDetails()
  }, [selectedStudioId])

  // Helper: Get Package Limits
  const getPackageLimit = (pkgName: string) => {
      const lower = pkgName.toLowerCase()
      if (lower.includes('agency') || lower.includes('enterprise')) return 50000
      if (lower.includes('pro')) return 25000
      return 10000 
  }

  const eventLimit = getPackageLimit(studioPackage)
  const utilization = Math.min((eventsCount / eventLimit) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Studio Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <FolderOpen className="h-5 w-5 text-[#1C4D8D]" />
        <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Select Studio Context</label>
            <Select value={selectedStudioId} onValueChange={setSelectedStudioId}>
            <SelectTrigger className="w-full md:w-[350px]">
                <SelectValue placeholder="Choose a Studio..." />
            </SelectTrigger>
            <SelectContent>
                {studios.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
            </Select>
        </div>
      </div>

      {selectedStudioId ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Package Utilization */}
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Package Utilization</CardTitle>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{studioPackage}</span>
                            <Badge variant="outline">Active</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Events Created</span>
                                <span className="font-medium">{eventsCount} / {eventLimit.toLocaleString()}</span>
                            </div>
                            <Progress value={utilization} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right">{utilization.toFixed(1)}% Used</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Storage Calculator */}
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Firebase Storage Size</CardTitle>
                        <div className="flex items-center justify-between mt-1">
                            {isCalculating ? (
                                <span className="text-xl text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Scanning...</span>
                            ) : (
                                <span className="text-2xl font-bold">{storageUsed}</span>
                            )}
                            <div className="p-2 bg-slate-100 rounded-full"><HardDrive className="h-4 w-4 text-slate-600"/></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mt-4">
                            Total size of folder: <code className="bg-slate-100 px-1 py-0.5 rounded">Studios/{selectedStudioId}</code>
                        </p>
                        {storageUsed === "0 Bytes" && !isCalculating && (
                            <p className="text-xs text-orange-500 mt-1 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/> Folder empty or not found</p>
                        )}
                    </CardContent>
                </Card>

                {/* Team Size */}
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-2xl font-bold">{userRoles.reduce((a,b) => a + b.value, 0)} Users</span>
                            <div className="p-2 bg-slate-100 rounded-full"><Users className="h-4 w-4 text-slate-600"/></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mt-4 flex-wrap">
                            {userRoles.map((role, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                    {role.name}: {role.value}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md">
                    <CardHeader><CardTitle>Studio User Roles</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        {userRoles.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={userRoles} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" fill="#1C4D8D" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No users found for this studio</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-lg border border-dashed text-muted-foreground">
            <Users className="h-10 w-10 mb-2 opacity-20" />
            <p>Select a studio from the dropdown above to view specific analytics.</p>
        </div>
      )}
    </div>
  )
}