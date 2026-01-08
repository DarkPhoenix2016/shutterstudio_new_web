"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, setDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Package, DollarSign, Tag, Check, X } from "lucide-react"
import Swal from "sweetalert2"

// --- Types ---
interface ParameterDef {
  name: string
  type: 'text' | 'number' | 'boolean'
  unit?: string
}

interface PackageData {
  id: string
  name: string
  price: number
  discounted: boolean
  discountType: 'percentage' | 'fixed'
  discountValue: number
  parameters: Record<string, any> // Stores values for the dynamic parameters
}

export default function CatalogueOverviewPage() {
  const { userData, loading: authLoading } = useAuth()
  
  // Data State
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PackageData[]>([])
  const [parameterDefs, setParameterDefs] = useState<ParameterDef[]>([])
  
  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState<Partial<PackageData>>({
    name: "",
    price: 0,
    discounted: false,
    discountType: 'fixed',
    discountValue: 0,
    parameters: {}
  })

  // 1. Fetch Data
  useEffect(() => {
    const initData = async () => {
      if (!userData?.studioID) return
      
      try {
        const studioID = userData.studioID
        
        // A. Fetch Parameter Definitions (from Settings)
        const configRef = doc(db, "Studios", studioID, "Packages", "CONFIG")
        const configSnap = await getDoc(configRef)
        if (configSnap.exists()) {
            setParameterDefs(configSnap.data().parameters || [])
        }

        // B. Fetch Package List & Details
        const listRef = doc(db, "Studios", studioID, "Packages", "package_list")
        const listSnap = await getDoc(listRef)
        
        if (listSnap.exists()) {
            const idList: string[] = listSnap.data().LIST || []
            
            if (idList.length > 0) {
                const fetchedPackages = await Promise.all(
                    idList.map(async (pkgId) => {
                        const pkgSnap = await getDoc(doc(db, "Studios", studioID, "Packages", pkgId))
                        return pkgSnap.exists() ? { id: pkgSnap.id, ...pkgSnap.data() } as PackageData : null
                    })
                )
                setPackages(fetchedPackages.filter(p => p !== null) as PackageData[])
            }
        }
      } catch (e) {
        console.error("Error fetching catalogue", e)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) initData()
  }, [userData, authLoading])

  // Helper: Handle Parameter Input Change
  const handleParamChange = (paramName: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        parameters: { ...prev.parameters, [paramName]: value }
    }))
  }

  // Action: Create Package
  const handleCreatePackage = async () => {
    if (!formData.name || !userData?.studioID) return
    setIsSubmitting(true)

    try {
        const studioID = userData.studioID
        const newPkgRef = doc(collection(db, "Studios", studioID, "Packages"))
        const newPkgId = newPkgRef.id

        const newPackage: PackageData = {
            id: newPkgId,
            name: formData.name!,
            price: Number(formData.price || 0),
            discounted: formData.discounted || false,
            discountType: formData.discountType || 'fixed',
            discountValue: Number(formData.discountValue || 0),
            parameters: formData.parameters || {}
        }

        // 1. Create Document
        await setDoc(newPkgRef, newPackage)

        // 2. Update List Index
        const listRef = doc(db, "Studios", studioID, "Packages", "package_list")
        // Use setDoc with merge in case package_list doc doesn't exist yet
        await setDoc(listRef, { 
            LIST: arrayUnion(newPkgId) 
        }, { merge: true })

        // 3. UI Update
        setPackages(prev => [...prev, newPackage])
        setIsDialogOpen(false)
        resetForm()
        
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Package created', timer: 3000, showConfirmButton: false })

    } catch (e) {
        console.error(e)
        Swal.fire({ icon: 'error', title: 'Failed to create package' })
    } finally {
        setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
        name: "",
        price: 0,
        discounted: false,
        discountType: 'fixed',
        discountValue: 0,
        parameters: {}
    })
  }

  // Calculate Final Price for Display
  const getFinalPrice = (pkg: PackageData) => {
    if (!pkg.discounted) return pkg.price
    if (pkg.discountType === 'fixed') return pkg.price - pkg.discountValue
    return pkg.price - (pkg.price * (pkg.discountValue / 100))
  }

  if (authLoading || loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Package Catalogue</h1>
            <p className="text-slate-500">Manage your studio's service offerings and pricing.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-[#1C4D8D]"><Plus className="mr-2 h-4 w-4" /> Create Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Package</DialogTitle>
                    <DialogDescription>Fill in the details. Parameters are defined in Settings.</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Package Name</Label>
                            <Input placeholder="e.g. Wedding Gold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Base Price</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input type="number" className="pl-9" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    {/* Discount Logic */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-4 border">
                        <div className="flex items-center justify-between">
                            <Label className="cursor-pointer" htmlFor="discount-switch">Apply Discount?</Label>
                            <Switch id="discount-switch" checked={formData.discounted} onCheckedChange={c => setFormData({...formData, discounted: c})} />
                        </div>
                        
                        {formData.discounted && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={formData.discountType} onValueChange={(v: any) => setFormData({...formData, discountType: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Value</Label>
                                    <Input type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Parameters */}
                    {parameterDefs.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Package Contents</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {parameterDefs.map((param, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <Label className="text-xs text-slate-500 uppercase">{param.name} {param.unit ? `(${param.unit})` : ''}</Label>
                                        {param.type === 'boolean' ? (
                                            <Select onValueChange={(v) => handleParamChange(param.name, v === 'yes')}>
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
                                                onChange={(e) => handleParamChange(param.name, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-[#1C4D8D]" onClick={handleCreatePackage} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                        Create Package
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {/* PACKAGES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {packages.map((pkg) => {
            const finalPrice = getFinalPrice(pkg)
            return (
                <Card key={pkg.id} className="hover:shadow-lg transition-all border-slate-200 flex flex-col">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg text-[#0F2854]">{pkg.name}</CardTitle>
                                <CardDescription className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-[#1C4D8D]">${finalPrice.toLocaleString()}</span>
                                    {pkg.discounted && (
                                        <span className="text-sm text-slate-400 line-through">${pkg.price}</span>
                                    )}
                                </CardDescription>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-full text-[#1C4D8D]">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                        {pkg.discounted && (
                            <Badge className="w-fit mt-2 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                <Tag className="w-3 h-3 mr-1" />
                                {pkg.discountType === 'percentage' ? `${pkg.discountValue}% OFF` : `$${pkg.discountValue} OFF`}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1">
                        <div className="bg-slate-50 p-3 rounded-lg space-y-2 border">
                            {Object.entries(pkg.parameters).map(([key, value]) => {
                                // Find def for unit
                                const def = parameterDefs.find(p => p.name === key)
                                return (
                                    <div key={key} className="flex justify-between text-sm">
                                        <span className="text-slate-500">{key}</span>
                                        <span className="font-medium text-slate-900">
                                            {typeof value === 'boolean' ? (
                                                value ? <Check className="h-4 w-4 text-green-600"/> : <X className="h-4 w-4 text-slate-300"/>
                                            ) : (
                                                <>{value} <span className="text-xs text-slate-400 font-normal">{def?.unit}</span></>
                                            )}
                                        </span>
                                    </div>
                                )
                            })}
                            {Object.keys(pkg.parameters).length === 0 && <p className="text-xs text-slate-400 italic text-center">No specific parameters.</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" className="w-full">View Details</Button>
                    </CardFooter>
                </Card>
            )
        })}
        {packages.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Packages Found</h3>
                <p className="text-slate-500">Create your first package to get started.</p>
            </div>
        )}
      </div>
    </div>
  )
}