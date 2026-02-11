"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { CatalogueService, type PackageData, type ParameterDef } from "@/services/catalogue-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Save, Trash2, Settings2, Package, Pencil, Ban, CheckCircle, DollarSign } from "lucide-react"
import Swal from "sweetalert2"

export default function CatalogueSettingsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data State
  const [currency, setCurrency] = useState("$")
  const [parameters, setParameters] = useState<ParameterDef[]>([])
  const [packages, setPackages] = useState<PackageData[]>([])
  
  // Param Input State
  const [newParamName, setNewParamName] = useState("")
  const [newParamType, setNewParamType] = useState<'text'|'number'|'boolean'>("number")
  const [newParamUnit, setNewParamUnit] = useState("")

  // Package Dialog State
  const [isPkgDialogOpen, setIsPkgDialogOpen] = useState(false)
  const [editingPkg, setEditingPkg] = useState<PackageData | null>(null)
  const [pkgFormData, setPkgFormData] = useState<Partial<PackageData>>({})

  // 1. Fetch All Data via Service
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.studioID) return
      
      try {
        const studioID = userData.studioID
        
        // Parallel fetch for efficiency
        const [fetchedCurrency, fetchedParams, fetchedPkgs] = await Promise.all([
           CatalogueService.getStudioCurrency(studioID),
           CatalogueService.getParameters(studioID),
           CatalogueService.getPackages(studioID)
        ])

        setCurrency(fetchedCurrency)
        setParameters(fetchedParams)
        setPackages(fetchedPkgs)

      } catch (e) {
        console.error("Fetch error", e)
        Swal.fire({ icon: 'error', title: 'Failed to load catalogue data' })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) fetchData()
  }, [userData, authLoading])

  // --- PARAMETER ACTIONS ---
  const handleAddParam = () => {
    if (!newParamName.trim()) return
    if (parameters.some(p => p.name.toLowerCase() === newParamName.trim().toLowerCase())) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Parameter exists', timer: 3000, showConfirmButton: false })
        return
    }
    setParameters([...parameters, { name: newParamName.trim(), type: newParamType, unit: newParamUnit.trim() }])
    setNewParamName("")
    setNewParamUnit("")
    setNewParamType("number")
  }

  const handleDeleteParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  const handleSaveParams = async () => {
    if (!userData?.studioID) return
    setSaving(true)
    try {
      await CatalogueService.saveParameters(userData.studioID, parameters)
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Parameters saved', timer: 3000, showConfirmButton: false })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Failed to save parameters' })
    } finally {
      setSaving(false)
    }
  }

  // --- PACKAGE ACTIONS ---
  const openPkgDialog = (pkg?: PackageData) => {
      if (pkg) {
          setEditingPkg(pkg)
          setPkgFormData({ ...pkg })
      } else {
          setEditingPkg(null)
          // Default state for new package
          setPkgFormData({
            name: "",
            price: 0,
            disabled: false,
            discounted: false,
            discountType: 'fixed',
            discountValue: 0,
            parameters: {}
          })
      }
      setIsPkgDialogOpen(true)
  }

  const handlePkgParamChange = (paramName: string, value: any) => {
    setPkgFormData(prev => ({
        ...prev,
        parameters: { ...prev.parameters, [paramName]: value }
    }))
  }

  const handleSavePackage = async () => {
      if (!pkgFormData.name || !userData?.studioID) return
      setSaving(true)

      try {
          const savedPkg = await CatalogueService.savePackage(userData.studioID, pkgFormData)

          // Update local state
          setPackages(prev => {
             const exists = prev.find(p => p.id === savedPkg.id)
             if (exists) return prev.map(p => p.id === savedPkg.id ? savedPkg : p)
             return [...prev, savedPkg]
          })

          setIsPkgDialogOpen(false)
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Package saved', timer: 3000, showConfirmButton: false })

      } catch (e) {
          console.error(e)
          Swal.fire({ icon: 'error', title: 'Failed to save package' })
      } finally {
          setSaving(false)
      }
  }

  const handleTogglePackageStatus = async (pkg: PackageData) => {
      if (!userData?.studioID) return
      
      // Optimistic update (optional, but here we wait for result)
      try {
          const newStatus = await CatalogueService.togglePackageStatus(userData.studioID, pkg.id, pkg.disabled)
          
          setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, disabled: newStatus } : p))
          
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: newStatus ? 'Package Disabled' : 'Package Enabled', timer: 2000, showConfirmButton: false })
      } catch (e) {
          Swal.fire({ icon: 'error', title: 'Action failed' })
      }
  }

  if (authLoading || loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Catalogue Management</h1>
        <p className="text-slate-500">Configure parameters and manage your service packages.</p>
      </div>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="packages" className="px-6">Package Manager</TabsTrigger>
            <TabsTrigger value="parameters" className="px-6">Parameters Config</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: PACKAGES --- */}
        <TabsContent value="packages" className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-[#1C4D8D]"/> Service Packages</CardTitle>
                        <CardDescription>Create and manage the packages visible to your clients.</CardDescription>
                    </div>
                    <Button onClick={() => openPkgDialog()} className="bg-[#1C4D8D]">
                        <Plus className="mr-2 h-4 w-4"/> Create Package
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Package Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Contents</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packages.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No packages created yet.</TableCell></TableRow>}
                            {packages.map((pkg) => (
                                <TableRow key={pkg.id} className={pkg.disabled ? "opacity-60 bg-slate-50" : ""}>
                                    <TableCell>
                                        <Badge variant={pkg.disabled ? "destructive" : "default"} className={!pkg.disabled ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : ""}>
                                            {pkg.disabled ? "Disabled" : "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {pkg.name}
                                        {pkg.discounted && <Badge variant="outline" className="ml-2 text-[10px] text-orange-600 border-orange-200 bg-orange-50">Discounted</Badge>}
                                    </TableCell>
                                    <TableCell>{currency} {pkg.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                                        {Object.entries(pkg.parameters).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openPkgDialog(pkg)}>
                                            <Pencil className="h-4 w-4 text-blue-600"/>
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleTogglePackageStatus(pkg)}>
                                            {pkg.disabled ? <CheckCircle className="h-4 w-4 text-green-600"/> : <Ban className="h-4 w-4 text-red-500"/>}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- TAB 2: PARAMETERS --- */}
        <TabsContent value="parameters" className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleSaveParams} disabled={saving} variant="outline" className="border-[#1C4D8D] text-[#1C4D8D] hover:bg-[#1C4D8D]/10">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Save Changes
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#1C4D8D]"/> Parameter Definitions</CardTitle>
                    <CardDescription>Define the metrics used in your packages (e.g. Photo Count, Video Length).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                        <div className="flex-1 space-y-2 w-full">
                            <Label>Parameter Name</Label>
                            <Input placeholder="e.g. Edited Photos" value={newParamName} onChange={e => setNewParamName(e.target.value)} />
                        </div>
                        <div className="w-full md:w-40 space-y-2">
                            <Label>Data Type</Label>
                            <Select value={newParamType} onValueChange={(v: any) => setNewParamType(v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="boolean">Yes/No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-32 space-y-2">
                            <Label>Unit (Opt)</Label>
                            <Input placeholder="e.g. pcs" value={newParamUnit} onChange={e => setNewParamUnit(e.target.value)} disabled={newParamType === 'boolean'} />
                        </div>
                        <Button onClick={handleAddParam} variant="secondary" className="w-full md:w-auto"><Plus className="h-4 w-4 mr-2"/> Add</Button>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Parameter Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parameters.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">No parameters defined.</TableCell></TableRow>}
                                {parameters.map((param, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{param.name}</TableCell>
                                        <TableCell className="capitalize">{param.type}</TableCell>
                                        <TableCell className="text-slate-500">{param.unit || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteParam(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* --- CREATE/EDIT PACKAGE DIALOG --- */}
      <Dialog open={isPkgDialogOpen} onOpenChange={setIsPkgDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingPkg ? "Edit Package" : "Create New Package"}</DialogTitle>
                <DialogDescription>Configure the package details and deliverables.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <Label>Package Name</Label>
                        <Input placeholder="e.g. Wedding Gold" value={pkgFormData.name} onChange={e => setPkgFormData({...pkgFormData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Base Price</Label>
                        <div className="relative">
                            <div className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 font-bold text-xs flex items-center">{currency}</div>
                            <Input type="number" className="pl-9" value={pkgFormData.price} onChange={e => setPkgFormData({...pkgFormData, price: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="space-y-2 flex items-end pb-2">
                        <div className="flex items-center space-x-2">
                            <Switch id="disabled-switch" checked={pkgFormData.disabled} onCheckedChange={c => setPkgFormData({...pkgFormData, disabled: c})} />
                            <Label htmlFor="disabled-switch">Disable Package?</Label>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border">
                    <div className="flex items-center justify-between">
                        <Label className="cursor-pointer" htmlFor="discount-switch">Apply Discount?</Label>
                        <Switch id="discount-switch" checked={pkgFormData.discounted} onCheckedChange={c => setPkgFormData({...pkgFormData, discounted: c})} />
                    </div>
                    {pkgFormData.discounted && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={pkgFormData.discountType} onValueChange={(v: any) => setPkgFormData({...pkgFormData, discountType: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Fixed Amount ({currency})</SelectItem>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input type="number" value={pkgFormData.discountValue} onChange={e => setPkgFormData({...pkgFormData, discountValue: Number(e.target.value)})} />
                            </div>
                        </div>
                    )}
                </div>

                {parameters.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Package Contents</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {parameters.map((param, idx) => (
                                <div key={idx} className="space-y-2">
                                    <Label className="text-xs text-slate-500 uppercase">{param.name} {param.unit ? `(${param.unit})` : ''}</Label>
                                    {param.type === 'boolean' ? (
                                        <Select value={pkgFormData.parameters?.[param.name] ? 'yes' : 'no'} onValueChange={(v) => handlePkgParamChange(param.name, v === 'yes')}>
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input 
                                            type={param.type === 'number' ? 'number' : 'text'} 
                                            placeholder={param.type === 'number' ? '0' : 'Value'}
                                            value={pkgFormData.parameters?.[param.name] || ""}
                                            onChange={(e) => handlePkgParamChange(param.name, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPkgDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#1C4D8D]" onClick={handleSavePackage} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Save Package"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}