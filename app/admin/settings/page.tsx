"use client"

import { useState, useEffect, Fragment } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { MobileNavConfigPanel } from "@/components/admin/mobile-nav-config"
import Swal from "sweetalert2"
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { logAuditAction } from "@/lib/logger"

// --- ICONS ---
import { ICON_OPTIONS, getIcon } from "@/components/icons" // Ensure this path is correct

// UI Icons
import { 
  AlertCircle, Save, Shield, Loader2, Plus, Trash2, 
  List as ListIcon, Settings as SettingsIcon, Database, X, Pencil, 
  Type, Link as LinkIcon, Image as ImageIcon, Hash, ToggleLeft, Braces, 
  FolderPlus, Folder, ArrowUp, ArrowDown, Layout, FileQuestion, 
  ChevronsUpDown, Check // Added ChevronsUpDown & Check
} from "lucide-react"

// --- CONFIGURATION ---
const DEFAULT_ROLES = ["studio_manager", "studio_crew"]

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
type FeatureMap = Record<string, string[]>

interface NavItem {
    label: string
    path: string
    icon: string
    feature: string
}

interface NavGroup {
    id: string
    label: string
    items: NavItem[]
}

export default function SettingsPage() {
  const { currentUser, globalSettings } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // --- STATE: GLOBAL SETTINGS ---
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  // --- STATE: ROLES & PERMISSIONS ---
  const [systemRoles, setSystemRoles] = useState<string[]>([])
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [newRole, setNewRole] = useState("")

  // --- STATE: FEATURES (Map) ---
  const [systemFeatures, setSystemFeatures] = useState<FeatureMap>({})
  const [newCategory, setNewCategory] = useState("") 
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<string, string>>({}) 

  // --- STATE: NAVIGATION ---
  const [navigationData, setNavigationData] = useState<NavGroup[]>([])
  // Group Dialog
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null)
  const [groupLabelInput, setGroupLabelInput] = useState("")
  // Item Dialog
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [itemInput, setItemInput] = useState<NavItem>({ label: "", path: "", icon: "", feature: "" })
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState("") 
  
  const [iconSearch, setIconSearch] = useState("")
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false)

  // --- STATE: DEFAULTS ---
  const [defaultsData, setDefaultsData] = useState<Record<string, any>>({})
  const [isDefDialogOpen, setIsDefDialogOpen] = useState(false)
  const [isEditingDef, setIsEditingDef] = useState(false)
  const [defKey, setDefKey] = useState("")
  const [defType, setDefType] = useState<DataType>('text')
  const [defValue, setDefValue] = useState<any>("")
  const [tempList, setTempList] = useState<string[]>([]) 
  const [tempMap, setTempMap] = useState<Record<string, any>>({}) 
  const [mapInputKey, setMapInputKey] = useState("")
  const [mapInputValue, setMapInputValue] = useState("")
  const [uploadingImg, setUploadingImg] = useState(false)

  const [dataLoading, setDataLoading] = useState(true)

  // Filter Icons based on search
  const filteredIcons = ICON_OPTIONS.filter(icon => 
      icon.toLowerCase().includes(iconSearch.toLowerCase())
  )

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
        // A. Settings Doc
        const settingsRef = doc(db, "Platform", "settings")
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          const data = settingsSnap.data()
          
          setSystemRoles(Array.isArray(data.roles) ? data.roles : DEFAULT_ROLES)
          
          const fetchedFeatures = data.features || {}
          if (Array.isArray(fetchedFeatures)) {
             setSystemFeatures({ "General": fetchedFeatures })
          } else {
             setSystemFeatures(fetchedFeatures)
          }

          if (data.navigation && Array.isArray(data.navigation)) {
              setNavigationData(data.navigation)
          }

        } else {
          const initialFeatures = { "Dashboard": ["home", "analytics"] }
          await setDoc(settingsRef, { roles: DEFAULT_ROLES, features: initialFeatures }, { merge: true })
          setSystemRoles(DEFAULT_ROLES)
          setSystemFeatures(initialFeatures)
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

  // ========================== ACTIONS ==========================
  
  // General
  const handleMaintenanceToggle = async (checked: boolean) => {
    try {
        await setDoc(doc(db, "Platform", "settings"), { maintenanceMode: checked }, { merge: true })
        setMaintenanceMode(checked)
        Toast.fire({ icon: 'success', title: `System is now ${checked ? 'Offline' : 'Online'}` })
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Failed to update settings' })
    }
  }

  // Permissions
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

  // Roles
  const handleAddRole = async () => {
    if (!newRole.trim()) return
    const formatted = newRole.toLowerCase().trim().replace(/\s+/g, '_')
    if (systemRoles.includes(formatted)) return Toast.fire({ icon: 'warning', title: 'Role already exists' })

    try {
      await updateDoc(doc(db, "Platform", "settings"), { roles: arrayUnion(formatted) })
      await setDoc(doc(db, "Platform", "ROLE_PERMISSIONS"), { [formatted]: [] }, { merge: true })
      setPermissions(prev => ({ ...prev, [formatted]: [] }))
      setSystemRoles(prev => [...prev, formatted])
      setNewRole("")
      Toast.fire({ icon: 'success', title: 'Role added' })
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Failed to add role' })
    }
  }

  const handleDeleteRole = async (role: string) => {
    if (role === "super_admin") return
    try {
        await updateDoc(doc(db, "Platform", "settings"), { roles: arrayRemove(role) })
        setSystemRoles(prev => prev.filter(r => r !== role))
        Toast.fire({ icon: 'success', title: 'Role removed' })
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Failed to delete role' })
    }
  }

  // Features
  const handleAddCategory = async () => {
      if (!newCategory.trim()) return;
      const catName = newCategory.trim();
      if (systemFeatures[catName]) return Toast.fire({ icon: 'warning', title: 'Category exists' });
      try {
          await updateDoc(doc(db, "Platform", "settings"), { [`features.${catName}`]: [] });
          setSystemFeatures(prev => ({ ...prev, [catName]: [] }));
          setNewCategory("");
          Toast.fire({ icon: 'success', title: 'Category created' });
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Failed to create category' });
      }
  }

  const handleDeleteCategory = async (category: string) => {
      Swal.fire({
          title: `Delete ${category}?`,
          text: "This will remove the category and all its features.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Yes, delete'
      }).then(async (res) => {
          if (res.isConfirmed) {
              try {
                  await updateDoc(doc(db, "Platform", "settings"), { [`features.${category}`]: deleteField() });
                  const newFeatures = { ...systemFeatures };
                  delete newFeatures[category];
                  setSystemFeatures(newFeatures);
                  Toast.fire({ icon: 'success', title: 'Category deleted' });
              } catch (e) {
                  Toast.fire({ icon: 'error', title: 'Failed to delete' });
              }
          }
      });
  }

  const handleAddFeature = async (category: string) => {
      const val = newFeatureInputs[category];
      if (!val || !val.trim()) return;
      const featureKey = val.toLowerCase().trim().replace(/\s+/g, '_');
      const currentList = systemFeatures[category] || [];
      if (currentList.includes(featureKey)) return Toast.fire({ icon: 'warning', title: 'Feature exists' });
      try {
          await updateDoc(doc(db, "Platform", "settings"), { [`features.${category}`]: arrayUnion(featureKey) });
          setSystemFeatures(prev => ({ ...prev, [category]: [...(prev[category] || []), featureKey] }));
          setNewFeatureInputs(prev => ({ ...prev, [category]: "" }));
          Toast.fire({ icon: 'success', title: 'Feature added' });
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Failed to add feature' });
      }
  }

  const handleDeleteFeature = async (category: string, feature: string) => {
      try {
          await updateDoc(doc(db, "Platform", "settings"), { [`features.${category}`]: arrayRemove(feature) });
          setSystemFeatures(prev => ({ ...prev, [category]: prev[category].filter(f => f !== feature) }));
          Toast.fire({ icon: 'success', title: 'Feature removed' });
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Failed to remove feature' });
      }
  }

  // Navigation
  const saveNavigationToDB = async (newData: NavGroup[]) => {
      try {
          await updateDoc(doc(db, "Platform", "settings"), { navigation: newData });
          setNavigationData(newData);
          Toast.fire({ icon: 'success', title: 'Navigation saved' });
      } catch (e) {
          console.error(e);
          Toast.fire({ icon: 'error', title: 'Failed to save navigation' });
      }
  }

  const handleOpenGroupDialog = (index?: number) => {
      if (index !== undefined) {
          setEditingGroupIndex(index);
          setGroupLabelInput(navigationData[index].label);
      } else {
          setEditingGroupIndex(null);
          setGroupLabelInput("");
      }
      setIsGroupDialogOpen(true);
  }

  const handleSaveGroup = () => {
      if (!groupLabelInput.trim()) return;
      const newNav = [...navigationData];
      if (editingGroupIndex !== null) {
          newNav[editingGroupIndex].label = groupLabelInput;
      } else {
          newNav.push({
              id: `group_${Date.now()}`,
              label: groupLabelInput,
              items: []
          });
      }
      saveNavigationToDB(newNav);
      setIsGroupDialogOpen(false);
  }

  const handleDeleteGroup = (index: number) => {
      Swal.fire({
          title: "Delete Group?",
          text: "All items inside will be removed.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          confirmButtonText: "Delete"
      }).then((res) => {
          if (res.isConfirmed) {
              const newNav = navigationData.filter((_, i) => i !== index);
              saveNavigationToDB(newNav);
          }
      });
  }

  const handleMoveGroup = (index: number, direction: -1 | 1) => {
      const newNav = [...navigationData];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newNav.length) return;
      [newNav[index], newNav[targetIndex]] = [newNav[targetIndex], newNav[index]]; 
      saveNavigationToDB(newNav);
  }

  const handleOpenItemDialog = (groupIndex: number, itemIndex?: number) => {
      setActiveGroupIndex(groupIndex);
      // Reset Search
      setIconSearch("");
      if (itemIndex !== undefined) {
          setEditingItemIndex(itemIndex);
          const item = navigationData[groupIndex].items[itemIndex];
          setItemInput({ ...item });
          
          let categoryFound = "";
          for (const [cat, feats] of Object.entries(systemFeatures)) {
              if (feats.includes(item.feature)) {
                  categoryFound = cat;
                  break;
              }
          }
          setSelectedFeatureCategory(categoryFound || Object.keys(systemFeatures)[0] || "");
      } else {
          setEditingItemIndex(null);
          setItemInput({ label: "", path: "", icon: "", feature: "" });
          setSelectedFeatureCategory(Object.keys(systemFeatures)[0] || "");
      }
      setIsItemDialogOpen(true);
  }

  const handleSaveItem = () => {
      if (activeGroupIndex === null || !itemInput.label || !itemInput.path) return;
      const newNav = [...navigationData];
      const items = newNav[activeGroupIndex].items;

      if (editingItemIndex !== null) {
          items[editingItemIndex] = itemInput;
      } else {
          items.push(itemInput);
      }
      saveNavigationToDB(newNav);
      setIsItemDialogOpen(false);
  }

  const handleDeleteItem = (groupIndex: number, itemIndex: number) => {
      const newNav = [...navigationData];
      newNav[groupIndex].items = newNav[groupIndex].items.filter((_, i) => i !== itemIndex);
      saveNavigationToDB(newNav);
  }

  const handleMoveItem = (groupIndex: number, itemIndex: number, direction: -1 | 1) => {
      const newNav = [...navigationData];
      const items = newNav[groupIndex].items;
      const targetIndex = itemIndex + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]]; 
      saveNavigationToDB(newNav);
  }

  // Defaults
  const openAddDialog = () => {
    setDefKey(""); setDefValue(""); setDefType("text"); setTempList([]); setTempMap({}); setIsEditingDef(false); setIsDefDialogOpen(true);
  }
  const openEditDialog = (key: string, value: any) => {
    setDefKey(key); setIsEditingDef(true);
    if (Array.isArray(value)) { setDefType('list'); setTempList(value); setDefValue(""); }
    else if (typeof value === 'object' && value !== null) { setDefType('map'); setTempMap(value); setDefValue(""); }
    else if (typeof value === 'boolean') { setDefType('boolean'); setDefValue(value ? 'true' : 'false'); }
    else if (typeof value === 'number') { setDefType('number'); setDefValue(value); }
    else {
        const strVal = String(value);
        if (strVal.startsWith('http') && (strVal.includes('firebasestorage') || strVal.match(/\.(jpeg|jpg|gif|png)/))) { setDefType('image'); }
        else if (strVal.startsWith('http')) { setDefType('url'); }
        else { setDefType('text'); }
        setDefValue(strVal);
    }
    setIsDefDialogOpen(true);
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

  // Preview Icon for Navigation Dialog
  const PreviewIcon = itemInput.icon ? getIcon(itemInput.icon) : FileQuestion;

  return (
    <div className="flex-1 space-y-8 p-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Settings</h1>
        <p className="text-muted-foreground mt-1">Platform-wide configuration and access control</p>
      </div>

      <Tabs defaultValue="navigation" className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-[1050px] mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="mobilenav">Mobile Nav</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* --- TAB: MOBILE NAV --- */}
        <TabsContent value="mobilenav">
          <MobileNavConfigPanel />
        </TabsContent>

        {/* --- TAB 1: GENERAL --- */}
        <TabsContent value="general">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2"><Loader2 className="h-5 w-5 text-[#1C4D8D]" /> System Maintenance</CardTitle>
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

        {/* --- TAB 2: DEFAULTS --- */}
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
        </TabsContent>

        {/* --- TAB 3: NAVIGATION --- */}
        <TabsContent value="navigation">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Layout className="h-5 w-5 text-[#1C4D8D]"/> Navigation Menu</CardTitle>
                        <CardDescription>Customize the sidebar structure and ordering.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenGroupDialog()} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
                        <Plus className="h-4 w-4 mr-2"/> Add Group
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {navigationData.map((group, groupIdx) => (
                            <AccordionItem key={group.id} value={group.id} className="border rounded-lg bg-white overflow-hidden shadow-sm">
                                <div className="flex items-center bg-slate-50 px-4 py-2">
                                    <div className="flex gap-1 mr-2">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={groupIdx === 0} onClick={() => handleMoveGroup(groupIdx, -1)}><ArrowUp className="h-3 w-3"/></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={groupIdx === navigationData.length - 1} onClick={() => handleMoveGroup(groupIdx, 1)}><ArrowDown className="h-3 w-3"/></Button>
                                    </div>
                                    <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                                        <span className="font-bold text-sm uppercase tracking-wider text-slate-700">{group.label}</span>
                                        <Badge variant="secondary" className="ml-2">{group.items.length} items</Badge>
                                    </AccordionTrigger>
                                    <div className="flex gap-2 ml-4">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenGroupDialog(groupIdx)}><Pencil className="h-3 w-3"/></Button>
                                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteGroup(groupIdx)}><Trash2 className="h-3 w-3"/></Button>
                                    </div>
                                </div>
                                <AccordionContent className="p-0 border-t">
                                    <div className="divide-y">
                                        {group.items.length === 0 && (
                                            <div className="p-4 text-center text-sm text-slate-400">No items in this group.</div>
                                        )}
                                        {group.items.map((item, itemIdx) => {
                                            const ItemIcon = getIcon(item.icon);
                                            return (
                                                <div key={itemIdx} className="flex items-center justify-between p-3 pl-8 hover:bg-slate-50">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" disabled={itemIdx === 0} onClick={() => handleMoveItem(groupIdx, itemIdx, -1)}><ArrowUp className="h-2 w-2 text-slate-400"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" disabled={itemIdx === group.items.length - 1} onClick={() => handleMoveItem(groupIdx, itemIdx, 1)}><ArrowDown className="h-2 w-2 text-slate-400"/></Button>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-slate-100 rounded-md text-slate-600">
                                                                <ItemIcon className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-800">{item.label}</div>
                                                                <div className="text-xs text-slate-500 font-mono">{item.path}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="outline" className="text-xs">{item.feature}</Badge>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenItemDialog(groupIdx, itemIdx)}><Pencil className="h-3.5 w-3.5 text-blue-600"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(groupIdx, itemIdx)}><X className="h-3.5 w-3.5 text-red-500"/></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="p-2 bg-slate-50/50">
                                            <Button variant="ghost" size="sm" className="w-full text-slate-500 hover:text-[#1C4D8D]" onClick={() => handleOpenItemDialog(groupIdx)}>
                                                <Plus className="h-3 w-3 mr-2" /> Add Item to {group.label}
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            {/* GROUP DIALOG */}
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingGroupIndex !== null ? "Edit Group" : "New Group"}</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label>Group Label (Header)</Label>
                        <Input placeholder="e.g. OVERVIEW" value={groupLabelInput} onChange={e => setGroupLabelInput(e.target.value.toUpperCase())} className="mt-2" />
                    </div>
                    <DialogFooter><Button onClick={handleSaveGroup}>Save Group</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ITEM DIALOG */}
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{editingItemIndex !== null ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* 1. 2-Level Feature Selection */}
                        <div className="space-y-2">
                            <Label>Required Feature Permission</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {/* Feature Category Dropdown */}
                                <Select value={selectedFeatureCategory} onValueChange={(val) => { setSelectedFeatureCategory(val); setItemInput({...itemInput, feature: ""}) }}>
                                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(systemFeatures).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                
                                {/* Feature Dropdown (Filtered) */}
                                <Select value={itemInput.feature} onValueChange={(val) => setItemInput({...itemInput, feature: val})} disabled={!selectedFeatureCategory}>
                                    <SelectTrigger><SelectValue placeholder="Feature" /></SelectTrigger>
                                    <SelectContent>
                                        {(systemFeatures[selectedFeatureCategory] || []).map(f => (
                                            <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* [!code highlight] 2. Icon Picker (Popover) */}
                        <div className="space-y-2">
                            <Label>Icon</Label>
                            <Popover open={isIconPopoverOpen} onOpenChange={setIsIconPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isIconPopoverOpen}
                                        className="w-full justify-between h-11 px-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 bg-[#1C4D8D]/10 rounded flex items-center justify-center shrink-0">
                                                <PreviewIcon className="h-5 w-5 text-[#1C4D8D]" />
                                            </div>
                                            <span className="font-normal text-slate-700">
                                                {itemInput.icon || "Select an icon..."}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0" align="start">
                                    {/* Search Bar */}
                                    <div className="p-3 border-b bg-slate-50/50 sticky top-0 z-10">
                                        <Input 
                                            placeholder="Search icons (e.g. user, calendar)..." 
                                            value={iconSearch}
                                            onChange={(e) => setIconSearch(e.target.value)}
                                            className="h-9 bg-white"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    {/* Icon Grid */}
                                    <div className="grid grid-cols-6 gap-2 p-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                                        {filteredIcons.map((iconName) => {
                                            const IconComp = getIcon(iconName)
                                            const isSelected = itemInput.icon === iconName
                                            return (
                                                <div
                                                    key={iconName}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center aspect-square rounded-md cursor-pointer transition-all border",
                                                        isSelected 
                                                            ? "bg-[#1C4D8D]/10 border-[#1C4D8D] text-[#1C4D8D]" 
                                                            : "bg-white border-transparent hover:bg-slate-100 hover:border-slate-200 text-slate-600"
                                                    )}
                                                    onClick={() => {
                                                        setItemInput({ ...itemInput, icon: iconName })
                                                        setIsIconPopoverOpen(false)
                                                    }}
                                                    title={iconName}
                                                >
                                                    <IconComp className="h-6 w-6 mb-1" />
                                                </div>
                                            )
                                        })}
                                        {filteredIcons.length === 0 && (
                                            <div className="col-span-6 text-center py-8 text-sm text-muted-foreground">
                                                No icons found for "{iconSearch}"
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* 3. Label & Path */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input placeholder="e.g. Dashboard" value={itemInput.label} onChange={e => setItemInput({...itemInput, label: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Path</Label>
                                <Input placeholder="e.g. /dashboard" value={itemInput.path} onChange={e => setItemInput({...itemInput, path: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveItem}>Save Item</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>

        {/* --- TAB 4: PERMISSIONS --- */}
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
                                    <th className="px-6 py-4 border-r bg-slate-100 w-[250px]">Category / Feature</th>
                                    {systemRoles.map(role => (
                                        <th key={role} className="px-4 py-4 text-center min-w-[120px] capitalize">{role.replace(/_/g, " ")}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.entries(systemFeatures).map(([category, features]) => (
                                    <Fragment key={category}>
                                        <tr className="bg-slate-100/50">
                                            <td colSpan={systemRoles.length + 1} className="px-6 py-2 font-bold text-slate-800 text-xs uppercase tracking-wider border-y">
                                                <Folder className="inline-block w-3 h-3 mr-2 mb-0.5" />
                                                {category}
                                            </td>
                                        </tr>
                                        {features.map(feature => (
                                            <tr key={`${category}-${feature}`} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 font-medium capitalize border-r bg-slate-50/30 pl-10 text-slate-600">
                                                    {feature.replace(/_/g, " ")}
                                                </td>
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
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 5: ROLES --- */}
        <TabsContent value="roles">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50"><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-[#1C4D8D]"/> Manage Roles</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2"><Label>New Role Name</Label><Input placeholder="e.g. Studio Editor" value={newRole} onChange={e => setNewRole(e.target.value)} /></div>
                  <Button onClick={handleAddRole} className="bg-[#1C4D8D] text-white"><Plus className="h-4 w-4 mr-2" /> Add Role</Button>
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
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRole(role)}><Trash2 className="h-4 w-4" /></Button>
                              )}
                          </div>
                      ))}
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 6: FEATURES --- */}
        <TabsContent value="features">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="flex items-center gap-2"><ListIcon className="h-5 w-5 text-[#1C4D8D]"/> Feature Management</CardTitle>
                <CardDescription>Organize features into categories for easier permission management.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
               
               <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex-1 space-y-2">
                      <Label>New Category</Label>
                      <Input placeholder="e.g. Billing, Crew" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                  </div>
                  <Button onClick={handleAddCategory} className="bg-[#1C4D8D] text-white hover:bg-[#1C4D8D]/90">
                      <FolderPlus className="h-4 w-4 mr-2" /> Create Category
                  </Button>
               </div>

               <div className="space-y-6">
                  {Object.entries(systemFeatures).map(([category, features]) => (
                      <div key={category} className="border rounded-xl overflow-hidden shadow-sm bg-white">
                          <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b">
                              <div className="flex items-center gap-2">
                                  <Folder className="h-4 w-4 text-slate-500" />
                                  <h3 className="font-semibold text-slate-800">{category}</h3>
                                  <Badge variant="secondary" className="text-xs bg-white">{features.length} items</Badge>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category)} className="text-red-500 hover:bg-red-50 h-8">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>

                          <div className="p-4 bg-slate-50/50 border-b flex gap-2">
                              <Input 
                                  placeholder={`Add feature to ${category}...`} 
                                  className="h-9 bg-white"
                                  value={newFeatureInputs[category] || ""}
                                  onChange={e => setNewFeatureInputs(prev => ({ ...prev, [category]: e.target.value }))}
                                  onKeyDown={(e) => { if(e.key === 'Enter') handleAddFeature(category) }}
                              />
                              <Button size="sm" variant="secondary" onClick={() => handleAddFeature(category)} className="h-9">
                                  <Plus className="h-4 w-4" />
                              </Button>
                          </div>

                          <div className="divide-y divide-slate-100">
                              {features.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-slate-400 italic">No features in this category yet.</div>
                              ) : (
                                  features.map(feature => (
                                      <div key={feature} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 group transition-colors">
                                          <div className="flex items-center gap-2">
                                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                              <span className="text-sm font-medium text-slate-700 capitalize">{feature.replace(/_/g, " ")}</span>
                                              <span className="text-xs text-slate-400 font-mono">({feature})</span>
                                          </div>
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => handleDeleteFeature(category, feature)}
                                          >
                                              <X className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Defaults Dialog */}
      <Dialog open={isDefDialogOpen} onOpenChange={setIsDefDialogOpen}>
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
    </div>
  )
}