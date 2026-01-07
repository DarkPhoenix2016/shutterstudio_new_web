"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  AlertCircle, Save, Shield, Loader2, Check, Server, Plus, Trash2, 
  List as ListIcon, Settings as SettingsIcon, Database, Upload, X, Pencil, 
  Type, Link as LinkIcon, Calendar, Image as ImageIcon, Hash, ToggleLeft, Braces
} from "lucide-react"
import Swal from "sweetalert2"
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { logAuditAction } from "@/lib/logger"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog"

// --- CONFIGURATION ---
const DEFAULT_ROLES = ["studio_manager", "studio_crew"]
const DEFAULT_FEATURES = ["dashboard", "calendar", "settings"]

// --- TOAST CONFIGURATION ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})

// --- TYPES ---
type DataType = 'text' | 'number' | 'url' | 'date' | 'boolean' | 'image' | 'list' | 'map'

export default function SettingsPage() {
  const { currentUser, globalSettings } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Settings Data
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [systemRoles, setSystemRoles] = useState<string[]>([])
  const [systemFeatures, setSystemFeatures] = useState<string[]>([])
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  
  // Defaults Data
  const [defaultsData, setDefaultsData] = useState<Record<string, any>>({})
  
  // Creation States
  const [newFeature, setNewFeature] = useState("")
  const [newRole, setNewRole] = useState("")
  
  // Default Value Dialog State
  const [isDefDialogOpen, setIsDefDialogOpen] = useState(false)
  const [isEditingDef, setIsEditingDef] = useState(false)
  
  // Default Value Form State
  const [defKey, setDefKey] = useState("")
  const [defType, setDefType] = useState<DataType>('text')
  const [defValue, setDefValue] = useState<any>("")
  const [tempList, setTempList] = useState<string[]>([]) 
  const [tempMap, setTempMap] = useState<Record<string, any>>({}) 
  const [mapInputKey, setMapInputKey] = useState("")
  const [mapInputValue, setMapInputValue] = useState("")
  const [uploadingImg, setUploadingImg] = useState(false)

  const [dataLoading, setDataLoading] = useState(true)

  // 1. Initialize Maintenance Mode
  useEffect(() => {
    if (globalSettings) {
      setMaintenanceMode(globalSettings.maintenanceMode || false)
    }
  }, [globalSettings])

  // 2. Fetch All Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Settings & Lists
        const settingsRef = doc(db, "Platform", "settings")
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          const data = settingsSnap.data()
          setSystemRoles(data.roles || DEFAULT_ROLES)
          setSystemFeatures(data.features || DEFAULT_FEATURES)
        } else {
          await setDoc(settingsRef, { roles: DEFAULT_ROLES, features: DEFAULT_FEATURES }, { merge: true })
          setSystemRoles(DEFAULT_ROLES)
          setSystemFeatures(DEFAULT_FEATURES)
        }

        // B. Permissions
        const permRef = doc(db, "Platform", "ROLE_PERMISSIONS")
        const permSnap = await getDoc(permRef)
        if (permSnap.exists()) {
          setPermissions(permSnap.data() as Record<string, string[]>)
        }

        // C. Defaults
        const defaultsRef = doc(db, "Platform", "defaults")
        const defaultsSnap = await getDoc(defaultsRef)
        if (defaultsSnap.exists()) {
          setDefaultsData(defaultsSnap.data())
        }

      } catch (e) {
        console.error("Data fetch error:", e)
        Toast.fire({ icon: 'error', title: 'Failed to load settings data' })
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- ACTIONS: GENERAL ---
  const handleMaintenanceToggle = async (checked: boolean) => {
    Swal.fire({
      title: `${checked ? "Enable" : "Disable"} Maintenance?`,
      text: checked ? "Regular users will be blocked immediately." : "Users will regain access.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: checked ? '#d33' : '#10b981',
      confirmButtonText: 'Yes, update'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await setDoc(doc(db, "Platform", "settings"), { maintenanceMode: checked }, { merge: true })
          setMaintenanceMode(checked)
          if (currentUser) await logAuditAction("SYSTEM_SETTINGS", `Maintenance set to ${checked}`, currentUser, "Settings")
          Toast.fire({ icon: 'success', title: `System is now ${checked ? 'Offline' : 'Online'}` })
        } catch (e) {
          Toast.fire({ icon: 'error', title: 'Failed to update settings' })
        }
      }
    })
  }

  // --- ACTIONS: PERMISSIONS ---
  const togglePermission = (role: string, feature: string) => {
    if (role === 'super_admin') return;
    setPermissions(prev => {
      const currentFeatures = prev[role] || []
      const isEnabled = currentFeatures.includes(feature)
      const newFeatures = isEnabled ? currentFeatures.filter(f => f !== feature) : [...currentFeatures, feature]
      return { ...prev, [role]: newFeatures }
    })
  }

  const handleSavePermissions = async () => {
    setLoading(true)
    try {
      await updateDoc(doc(db, "Platform", "ROLE_PERMISSIONS"), permissions)
      if (currentUser) await logAuditAction("UPDATE_PERMISSIONS", "Updated role permission matrix", currentUser, "Settings")
      Toast.fire({ icon: 'success', title: 'Permissions saved' })
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Failed to save permissions' })
    } finally {
      setLoading(false)
    }
  }

  // --- ACTIONS: ROLES/FEATURES ---
  const handleAddItem = async (type: "roles" | "features", value: string, setValue: (s: string) => void, setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!value.trim()) return
    const formatted = value.toLowerCase().trim().replace(/\s+/g, '_')
    const currentList = type === "roles" ? systemRoles : systemFeatures
    if (currentList.includes(formatted)) return Toast.fire({ icon: 'warning', title: 'Item already exists' })

    try {
      await updateDoc(doc(db, "Platform", "settings"), { [type]: arrayUnion(formatted) })
      if (type === "roles") {
         await setDoc(doc(db, "Platform", "ROLE_PERMISSIONS"), { [formatted]: [] }, { merge: true })
         setPermissions(prev => ({ ...prev, [formatted]: [] }))
      }
      setList(prev => [...prev, formatted])
      setValue("")
      if (currentUser) await logAuditAction("SETTINGS_UPDATE", `Added ${type}: ${formatted}`, currentUser, "Settings")
      Toast.fire({ icon: 'success', title: 'Item added' })
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Failed to add item' })
    }
  }

  const handleDeleteItem = async (type: "roles" | "features", value: string, setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (value === "super_admin") return Toast.fire({ icon: 'error', title: 'Cannot delete Super Admin' })

    Swal.fire({
        title: `Delete ${value}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete'
    }).then(async (res) => {
        if (res.isConfirmed) {
            try {
                await updateDoc(doc(db, "Platform", "settings"), { [type]: arrayRemove(value) })
                setList(prev => prev.filter(item => item !== value))
                if (currentUser) await logAuditAction("SETTINGS_UPDATE", `Deleted ${type}: ${value}`, currentUser, "Settings")
                Toast.fire({ icon: 'success', title: 'Item removed' })
            } catch (e) {
                Toast.fire({ icon: 'error', title: 'Failed to delete' })
            }
        }
    })
  }

  // --- ACTIONS: DEFAULTS ---

  const openAddDialog = () => {
    setDefKey("")
    setDefValue("")
    setDefType("text")
    setTempList([])
    setTempMap({})
    setIsEditingDef(false)
    setIsDefDialogOpen(true)
  }

  const openEditDialog = (key: string, value: any) => {
    setDefKey(key)
    setIsEditingDef(true)
    
    // Auto-detect type
    if (Array.isArray(value)) {
        setDefType('list')
        setTempList(value)
        setDefValue("")
    } else if (typeof value === 'object' && value !== null) {
        setDefType('map')
        setTempMap(value)
        setDefValue("")
    } else if (typeof value === 'boolean') {
        setDefType('boolean')
        setDefValue(value ? 'true' : 'false')
    } else if (typeof value === 'number') {
        setDefType('number')
        setDefValue(value)
    } else {
        const strVal = String(value)
        if (strVal.startsWith('http') && (strVal.includes('firebasestorage') || strVal.match(/\.(jpeg|jpg|gif|png)/))) {
            setDefType('image')
        } else if (strVal.startsWith('http')) {
            setDefType('url')
        } else {
            setDefType('text')
        }
        setDefValue(strVal)
    }
    setIsDefDialogOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    try {
        const storageRef = ref(storage, `Defaults/${file.name}_${Date.now()}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        setDefValue(url)
        Toast.fire({ icon: 'success', title: 'Image uploaded' })
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Upload failed' })
    } finally {
        setUploadingImg(false)
    }
  }

  const handleSaveDefault = async () => {
    if (!defKey.trim()) return Toast.fire({ icon: 'warning', title: 'Key name is required' })
    
    let finalValue = defValue
    if (defType === 'list') finalValue = tempList
    if (defType === 'map') finalValue = tempMap
    if (defType === 'number') finalValue = Number(defValue)
    if (defType === 'boolean') finalValue = defValue === 'true'

    try {
        await setDoc(doc(db, "Platform", "defaults"), { [defKey]: finalValue }, { merge: true })
        setDefaultsData(prev => ({ ...prev, [defKey]: finalValue }))
        
        if (currentUser) await logAuditAction("UPDATE_DEFAULTS", `${isEditingDef ? "Edited" : "Added"} default: ${defKey}`, currentUser, "Settings")
        
        Toast.fire({ icon: 'success', title: 'Saved successfully' })
        setIsDefDialogOpen(false)
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Failed to save' })
    }
  }

  const handleDeleteDefault = async (key: string) => {
    Swal.fire({
        title: `Delete ${key}?`,
        text: "This field will be permanently removed.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then(async (res) => {
        if (res.isConfirmed) {
            try {
                await updateDoc(doc(db, "Platform", "defaults"), { [key]: deleteField() })
                const newDefaults = { ...defaultsData }
                delete newDefaults[key]
                setDefaultsData(newDefaults)
                Toast.fire({ icon: 'success', title: 'Field deleted' })
            } catch (e) {
                Toast.fire({ icon: 'error', title: 'Delete failed' })
            }
        }
    })
  }

  // --- RENDER HELPERS ---
  const getTypeIcon = (value: any) => {
    if (Array.isArray(value)) return <ListIcon className="h-4 w-4 text-blue-500"/>
    if (typeof value === 'boolean') return <ToggleLeft className="h-4 w-4 text-purple-500"/>
    if (typeof value === 'number') return <Hash className="h-4 w-4 text-orange-500"/>
    if (typeof value === 'object') return <Braces className="h-4 w-4 text-slate-500"/>
    const str = String(value)
    if (str.startsWith('http')) {
        if (str.match(/\.(jpeg|jpg|gif|png)/) || str.includes('firebasestorage')) return <ImageIcon className="h-4 w-4 text-green-500"/>
        return <LinkIcon className="h-4 w-4 text-blue-400"/>
    }
    return <Type className="h-4 w-4 text-slate-400"/>
  }

  return (
    <div className="flex-1 space-y-8 p-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Settings</h1>
        <p className="text-muted-foreground mt-1">Platform-wide configuration and access control</p>
      </div>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: GENERAL --- */}
        <TabsContent value="general">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-[#1C4D8D]" /> System Maintenance</CardTitle>
              <CardDescription>Control platform availability</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${maintenanceMode ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${maintenanceMode ? "bg-red-100 text-red-600" : "bg-white text-slate-400"}`}><AlertCircle className="h-5 w-5" /></div>
                  <div>
                    <Label className="font-bold text-foreground text-base">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">{maintenanceMode ? "Locked. Only Admins access." : "Live. Accessible to users."}</p>
                  </div>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={handleMaintenanceToggle} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: DEFAULTS MANAGER --- */}
        <TabsContent value="defaults">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#1C4D8D]"/> System Defaults</CardTitle>
                        <CardDescription>Manage default configuration values</CardDescription>
                    </div>
                    <Button onClick={openAddDialog} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
                        <Plus className="h-4 w-4 mr-2"/> Add Default
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[200px]">Key Name</TableHead>
                                <TableHead>Value Preview</TableHead>
                                <TableHead className="text-right w-[150px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(defaultsData).length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No defaults configured.</TableCell></TableRow>
                            )}
                            {Object.entries(defaultsData).map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell>{getTypeIcon(value)}</TableCell>
                                    <TableCell className="font-medium">{key}</TableCell>
                                    <TableCell className="max-w-[400px] truncate text-sm text-slate-600">
                                        {typeof value === 'string' && value.startsWith('http') && (value.includes('firebasestorage') || value.match(/\.(jpeg|jpg|gif|png)/)) ? (
                                            <div className="flex items-center gap-2"><img src={value} className="h-8 w-8 rounded object-cover border"/><span className="text-xs text-blue-600 underline truncate">{value}</span></div>
                                        ) : typeof value === 'object' ? (
                                            JSON.stringify(value)
                                        ) : (
                                            String(value)
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => openEditDialog(key, value)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteDefault(key)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* DEFAULT VALUE DIALOG */}
            <Dialog open={isDefDialogOpen} onOpenChange={setIsDefDialogOpen}>
                {/* Prevent background dismiss for data safety */}
                <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{isEditingDef ? "Edit Default" : "Add New Default"}</DialogTitle>
                        <DialogDescription>Configure key, type and value for this setting.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Key Name</Label>
                            <Input placeholder="e.g. user_avatar" value={defKey} onChange={e => setDefKey(e.target.value)} disabled={isEditingDef} />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Type</Label>
                            <Select value={defType} onValueChange={(v: DataType) => { setDefType(v); if(!isEditingDef) setDefValue(""); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text / String</SelectItem>
                                    <SelectItem value="url">URL Link</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="image">Image (Upload)</SelectItem>
                                    <SelectItem value="list">List (Array)</SelectItem>
                                    <SelectItem value="map">Map (Object)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dynamic Input Area */}
                        <div className="p-4 bg-slate-50 rounded-md border min-h-[100px] flex flex-col justify-center">
                            {defType === 'text' && <Input placeholder="Value..." value={defValue} onChange={e => setDefValue(e.target.value)} />}
                            {defType === 'url' && <Input placeholder="https://..." value={defValue} onChange={e => setDefValue(e.target.value)} />}
                            {defType === 'number' && <Input type="number" placeholder="0" value={defValue} onChange={e => setDefValue(e.target.value)} />}
                            {defType === 'boolean' && (
                                <Select value={defValue} onValueChange={setDefValue}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
                                </Select>
                            )}
                            {defType === 'image' && (
                                <div className="space-y-2">
                                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                                    {uploadingImg && <span className="text-xs text-blue-500 flex gap-1"><Loader2 className="animate-spin h-3 w-3"/> Uploading...</span>}
                                    {defValue && <div className="mt-2"><img src={defValue} alt="Preview" className="h-32 w-auto object-cover rounded border" /></div>}
                                </div>
                            )}
                            {defType === 'list' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input placeholder="Add item..." value={defValue} onChange={e => setDefValue(e.target.value)} />
                                        <Button size="sm" onClick={() => { if(defValue) { setTempList([...tempList, defValue]); setDefValue(""); } }}><Plus className="h-4 w-4"/></Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {tempList.map((item, i) => (
                                            <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setTempList(tempList.filter((_, idx) => idx !== i))}>{item} <X className="h-3 w-3 ml-1"/></Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {defType === 'map' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Key" value={mapInputKey} onChange={e => setMapInputKey(e.target.value)} />
                                        <Input placeholder="Value" value={mapInputValue} onChange={e => setMapInputValue(e.target.value)} />
                                    </div>
                                    <Button size="sm" className="w-full" onClick={() => { if(mapInputKey && mapInputValue) { setTempMap({...tempMap, [mapInputKey]: mapInputValue}); setMapInputKey(""); setMapInputValue(""); } }}>Add Pair</Button>
                                    <div className="text-xs space-y-1 max-h-[150px] overflow-y-auto">
                                        {Object.entries(tempMap).map(([k, v]) => (
                                            <div key={k} className="flex justify-between bg-white p-2 rounded border items-center">
                                                <span className="truncate max-w-[80%]"><b>{k}:</b> {String(v)}</span>
                                                <X className="h-3 w-3 cursor-pointer text-red-500" onClick={() => { const n = {...tempMap}; delete n[k]; setTempMap(n); }}/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDefDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-[#1C4D8D]" onClick={handleSaveDefault} disabled={uploadingImg}>
                            {uploadingImg ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>

        {/* --- TAB 3: PERMISSIONS --- */}
        <TabsContent value="permissions">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#1C4D8D]" /> Access Matrix</CardTitle>
                <CardDescription>Toggle features for each role</CardDescription>
              </div>
              <Button onClick={handleSavePermissions} disabled={loading} className="bg-[#1C4D8D] text-white hover:bg-[#1C4D8D]/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
              </Button>
            </CardHeader>
            <CardContent className="p-0">
                {dataLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-4 border-r bg-slate-100 w-[200px]">Feature \ Role</th>
                                    {systemRoles.map(role => (
                                        <th key={role} className="px-4 py-4 text-center min-w-[120px] capitalize">{role.replace(/_/g, " ")}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {systemFeatures.map(feature => (
                                    <tr key={feature} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 font-medium capitalize border-r bg-slate-50/30">{feature.replace(/_/g, " ")}</td>
                                        {systemRoles.map(role => {
                                            const isEnabled = (permissions[role] || []).includes(feature)
                                            const isSuper = role === 'super_admin'
                                            return (
                                                <td key={`${role}-${feature}`} className="px-4 py-3 text-center">
                                                    <div className="flex justify-center">
                                                        <input type="checkbox" disabled={isSuper} checked={isSuper ? true : isEnabled} onChange={() => togglePermission(role, feature)}
                                                            className={`w-5 h-5 rounded border-slate-300 text-[#1C4D8D] focus:ring-[#1C4D8D] ${isSuper ? "opacity-50 cursor-not-allowed bg-slate-200" : "cursor-pointer"}`}
                                                        />
                                                    </div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 4: ROLES --- */}
        <TabsContent value="roles">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50"><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-[#1C4D8D]"/> Manage Roles</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2"><Label>New Role Name</Label><Input placeholder="e.g. Studio Editor" value={newRole} onChange={e => setNewRole(e.target.value)} /></div>
                  <Button onClick={() => handleAddItem("roles", newRole, setNewRole, setSystemRoles)} className="bg-[#1C4D8D] text-white"><Plus className="h-4 w-4 mr-2" /> Add Role</Button>
               </div>
               <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 font-semibold border-b text-sm">Active Roles ({systemRoles.length})</div>
                  <div className="divide-y">
                      {systemRoles.map(role => (
                          <div key={role} className="flex items-center justify-between p-4 hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">{role.substring(0, 2).toUpperCase()}</div>
                                  <span className="font-medium capitalize">{role.replace(/_/g, " ")}</span>
                                  {role === "super_admin" && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                              </div>
                              {role !== "super_admin" && (
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteItem("roles", role, setSystemRoles)}><Trash2 className="h-4 w-4" /></Button>
                              )}
                          </div>
                      ))}
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 5: FEATURES --- */}
        <TabsContent value="features">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50"><CardTitle className="flex items-center gap-2"><ListIcon className="h-5 w-5 text-[#1C4D8D]"/> Manage Features</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2"><Label>New Feature Key</Label><Input placeholder="e.g. Analytics View" value={newFeature} onChange={e => setNewFeature(e.target.value)} /></div>
                  <Button onClick={() => handleAddItem("features", newFeature, setNewFeature, setSystemFeatures)} className="bg-[#1C4D8D] text-white"><Plus className="h-4 w-4 mr-2" /> Add Feature</Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemFeatures.map(feature => (
                      <div key={feature} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm group hover:border-[#1C4D8D]/50 transition-colors">
                          <span className="font-medium capitalize text-sm">{feature.replace(/_/g, " ")}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteItem("features", feature, setSystemFeatures)}>
                              <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}