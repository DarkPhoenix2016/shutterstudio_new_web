"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Edit, Plus, Trash2, CheckCircle2, Loader2, Star, RotateCcw, Eye, EyeOff
} from "lucide-react"
import Swal from "sweetalert2"
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logAuditAction } from "@/lib/logger"
import { Discount } from "@/services/platform"

// --- TYPES ---
interface PackageConfig {
  id: string
  name: string
  price: number
  events_limit: number
  users_limit: number
  photos_per_event: number
  featured: boolean
  features: string[]
  include_price_table: boolean
}

// --- DEFAULT PACKAGES ---
const DEFAULT_PACKAGES: PackageConfig[] = [
  {
    id: "basic_pkg",
    name: "Starter",
    price: 2000,
    events_limit: 10000,
    users_limit: 3,
    photos_per_event: 2,
    featured: false,
    include_price_table: true,
    features: ["Customer Confirmation Link", "Payment Tracking", "Inventory Management", "Task Manager", "Event Manager"]
  },
  {
    id: "pro_pkg",
    name: "Professional",
    price: 3500,
    events_limit: 25000,
    users_limit: 10,
    photos_per_event: 5,
    featured: true,
    include_price_table: true,
    features: ["All Starter Features", "Advanced Analytics", "Priority Support", "Custom Branding"]
  },
  {
    id: "agency_pkg",
    name: "Agency",
    price: 5000,
    events_limit: 50000,
    users_limit: 20,
    photos_per_event: 10,
    featured: false,
    include_price_table: true,
    features: ["All Pro Features", "Unlimited Storage", "Dedicated Account Manager", "API Access"]
  }
]

// --- TOAST CONFIG ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
})

export default function SubscriptionsPage() {
  const { currentUser } = useAuth()
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [loading, setLoading] = useState(true)
  
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [discountsLoading, setDiscountsLoading] = useState(true)
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPkg, setEditingPkg] = useState<PackageConfig | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<PackageConfig>({
    id: "", name: "", price: 0, events_limit: 0, users_limit: 0, photos_per_event: 0, 
    featured: false, include_price_table: true, features: []
  })
  const [featureInput, setFeatureInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- DISCOUNT STATE ---
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [discountFormData, setDiscountFormData] = useState<Omit<Discount, "id">>({
    name: "",
    packageId: "all",
    billingCycle: "all",
    type: "percentage",
    value: 0,
    active: true,
    isSeasonal: false
  })
  const [isDiscountSubmitting, setIsDiscountSubmitting] = useState(false)

  // 1. Initial Load (Packages & Discounts)
  useEffect(() => {
    const initData = async () => {
      try {
        const docRef = doc(db, "Platform", "packages")
        const snap = await getDoc(docRef)
        const loadedPackages: PackageConfig[] = []
        const loadedDiscounts: Discount[] = []

        if (snap.exists()) {
          const data = snap.data()
          
          // Load packages
          const pkgList: string[] = data.packages_list || []
          pkgList.forEach(pkgId => {
            if (data[pkgId]) {
              loadedPackages.push({ id: pkgId, ...data[pkgId] })
            }
          })
          setPackages(loadedPackages.sort((a, b) => a.price - b.price))

          // Load discounts
          const discList: string[] = data.discounts_list || []
          discList.forEach(discId => {
            if (data[discId]) {
              loadedDiscounts.push({ id: discId, ...data[discId] })
            }
          })
          setDiscounts(loadedDiscounts)
        }
      } catch (e) {
        console.error("Failed to load platform data", e)
        Toast.fire({ icon: 'error', title: 'Failed to load packages or discounts' })
      } finally {
        setLoading(false)
        setDiscountsLoading(false)
      }
    }
    initData()
  }, [])

  // --- ACTIONS ---

  const handleRestoreDefaults = async () => {
    Swal.fire({
      title: 'Restore Default Packages?',
      text: "This will recreate the standard Starter, Pro, and Agency plans.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1C4D8D',
      confirmButtonText: 'Yes, Restore'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true)
        try {
          const docRef = doc(db, "Platform", "packages")
          const updatePayload: any = { packages_list: arrayUnion(...DEFAULT_PACKAGES.map(p => p.id)) }
          
          DEFAULT_PACKAGES.forEach(pkg => {
            updatePayload[pkg.id] = { ...pkg }
            delete updatePayload[pkg.id].id
          })
          
          await setDoc(docRef, updatePayload, { merge: true })
          
          setPackages(prev => {
             const newMap = new Map(prev.map(p => [p.id, p]))
             DEFAULT_PACKAGES.forEach(p => newMap.set(p.id, p))
             return Array.from(newMap.values()).sort((a, b) => a.price - b.price)
          })

          if (currentUser) await logAuditAction("RESTORE_DEFAULTS", "Restored default subscription packages", currentUser, "Subscriptions")

          Toast.fire({ icon: 'success', title: 'Restored successfully' })
        } catch (e) {
          Toast.fire({ icon: 'error', title: 'Restore failed' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const openAddDialog = () => {
    setEditingPkg(null)
    setFormData({
        id: "", name: "", price: 0, 
        events_limit: 1000, users_limit: 1, photos_per_event: 1, 
        featured: false, include_price_table: true, features: []
    })
    setFeatureInput("")
    setIsDialogOpen(true)
  }

  const openEditDialog = (pkg: PackageConfig) => {
    setEditingPkg(pkg)
    setFormData({ ...pkg })
    setFeatureInput("")
    setIsDialogOpen(true)
  }

  const handleSavePackage = async () => {
    if (!formData.name || formData.price < 0) return Toast.fire({ icon: 'warning', title: 'Invalid details' })

    setIsSubmitting(true)
    const pkgId = editingPkg ? editingPkg.id : `pkg_${Date.now()}`.toLowerCase()

    try {
        const pkgData = {
            name: formData.name,
            price: Number(formData.price),
            events_limit: Number(formData.events_limit),
            users_limit: Number(formData.users_limit),
            photos_per_event: Number(formData.photos_per_event),
            featured: formData.featured,
            include_price_table: formData.include_price_table,
            features: formData.features
        }

        const updatePayload: any = { [pkgId]: pkgData }
        if (!editingPkg) updatePayload.packages_list = arrayUnion(pkgId)

        await updateDoc(doc(db, "Platform", "packages"), updatePayload)

        setPackages(prev => {
            const newList = editingPkg 
                ? prev.map(p => p.id === pkgId ? { ...pkgData, id: pkgId } : p)
                : [...prev, { ...pkgData, id: pkgId }]
            return newList.sort((a, b) => a.price - b.price)
        })

        if (currentUser) {
            await logAuditAction(
                editingPkg ? "UPDATE_PACKAGE" : "CREATE_PACKAGE", 
                `${editingPkg ? "Updated" : "Created"} package: ${formData.name}`, 
                currentUser, "Subscriptions"
            )
        }

        Toast.fire({ icon: 'success', title: 'Package saved' })
        setIsDialogOpen(false)
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Save failed' })
    } finally {
        setIsSubmitting(false)
    }
  }

  const handleDeletePackage = async (pkgId: string) => {
    Swal.fire({
        title: 'Delete Package?',
        text: "This will remove the plan from new subscriptions.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await updateDoc(doc(db, "Platform", "packages"), {
                    packages_list: arrayRemove(pkgId),
                    [pkgId]: deleteField()
                })
                setPackages(prev => prev.filter(p => p.id !== pkgId))
                if (currentUser) await logAuditAction("DELETE_PACKAGE", `Deleted package ID: ${pkgId}`, currentUser, "Subscriptions")
                Toast.fire({ icon: 'success', title: 'Deleted' })
            } catch (e) {
                Toast.fire({ icon: 'error', title: 'Delete failed' })
            }
        }
    })
  }

  const addFeature = () => {
    if (featureInput.trim()) {
        setFormData(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }))
        setFeatureInput("")
    }
  }
  
  const removeFeature = (index: number) => {
    setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }))
  }

  // --- DISCOUNT ACTIONS ---
  const openAddDiscountDialog = () => {
    setEditingDiscount(null)
    setDiscountFormData({
      name: "",
      packageId: "all",
      billingCycle: "all",
      type: "percentage",
      value: 0,
      active: true,
      isSeasonal: false
    })
    setIsDiscountDialogOpen(true)
  }

  const openEditDiscountDialog = (discount: Discount) => {
    setEditingDiscount(discount)
    setDiscountFormData({
      name: discount.name,
      packageId: discount.packageId || "all",
      billingCycle: discount.billingCycle || "all",
      type: discount.type || "percentage",
      value: discount.value || 0,
      active: discount.active !== false,
      isSeasonal: discount.isSeasonal === true
    })
    setIsDiscountDialogOpen(true)
  }

  const handleSaveDiscount = async () => {
    if (!discountFormData.name || discountFormData.value <= 0) {
      return Toast.fire({ icon: 'warning', title: 'Invalid discount details' })
    }

    setIsDiscountSubmitting(true)
    const discountId = editingDiscount ? editingDiscount.id : `disc_${Date.now()}`.toLowerCase()

    try {
      const discountData = {
        name: discountFormData.name,
        packageId: discountFormData.packageId,
        billingCycle: discountFormData.billingCycle,
        type: discountFormData.type,
        value: Number(discountFormData.value),
        active: discountFormData.active,
        isSeasonal: discountFormData.isSeasonal
      }

      const updatePayload: any = { [discountId]: discountData }
      if (!editingDiscount) updatePayload.discounts_list = arrayUnion(discountId)

      await updateDoc(doc(db, "Platform", "packages"), updatePayload)

      setDiscounts(prev => {
        const newList = editingDiscount
          ? prev.map(d => d.id === discountId ? { ...discountData, id: discountId } : d)
          : [...prev, { ...discountData, id: discountId }]
        return newList
      })

      if (currentUser) {
        await logAuditAction(
          editingDiscount ? "UPDATE_DISCOUNT" : "CREATE_DISCOUNT",
          `${editingDiscount ? "Updated" : "Created"} discount: ${discountFormData.name}`,
          currentUser, "Subscriptions"
        )
      }

      Toast.fire({ icon: 'success', title: 'Discount saved successfully' })
      setIsDiscountDialogOpen(false)
    } catch (e) {
      console.error("Save discount failed", e)
      Toast.fire({ icon: 'error', title: 'Save discount failed' })
    } finally {
      setIsDiscountSubmitting(false)
    }
  }

  const handleDeleteDiscount = async (discountId: string) => {
    Swal.fire({
      title: 'Delete Discount?',
      text: "This will remove this discount from all active calculations.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await updateDoc(doc(db, "Platform", "packages"), {
            discounts_list: arrayRemove(discountId),
            [discountId]: deleteField()
          })
          setDiscounts(prev => prev.filter(d => d.id !== discountId))
          if (currentUser) await logAuditAction("DELETE_DISCOUNT", `Deleted discount ID: ${discountId}`, currentUser, "Subscriptions")
          Toast.fire({ icon: 'success', title: 'Deleted' })
        } catch (e) {
          console.error("Delete discount failed", e)
          Toast.fire({ icon: 'error', title: 'Delete failed' })
        }
      }
    })
  }

  const handleToggleDiscountActive = async (discount: Discount, active: boolean) => {
    try {
      const discountId = discount.id
      const updatedData = { ...discount, active }
      delete (updatedData as any).id

      await updateDoc(doc(db, "Platform", "packages"), {
        [discountId]: updatedData
      })

      setDiscounts(prev => prev.map(d => d.id === discountId ? { ...d, active } : d))
      
      if (currentUser) {
        await logAuditAction(
          "TOGGLE_DISCOUNT",
          `${active ? "Activated" : "Deactivated"} discount: ${discount.name}`,
          currentUser,
          "Subscriptions"
        )
      }
      Toast.fire({ icon: 'success', title: `Discount ${active ? "activated" : "deactivated"}` })
    } catch (e) {
      console.error("Toggle discount active state failed", e)
      Toast.fire({ icon: 'error', title: 'Update failed' })
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscriptions & Plans</h1>
          <p className="text-muted-foreground mt-1">Manage pricing tiers and billing configuration</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleRestoreDefaults} className="text-slate-600 border-slate-300 hover:bg-slate-100">
                <RotateCcw className="h-4 w-4 mr-2" /> Restore Defaults
            </Button>
            <Button onClick={openAddDialog} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
                <Plus className="h-4 w-4 mr-2" /> Add Plan
            </Button>
        </div>
      </div>

      {/* Plan Manager */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>Active Packages</CardTitle>
          <CardDescription>Pricing tiers available for studios</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
          ) : (
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                   <TableHead className="font-bold">Plan Name</TableHead>
                   <TableHead className="font-bold">Price (LKR)</TableHead>
                   <TableHead className="font-bold">Limits (Events/Users)</TableHead>
                   <TableHead className="font-bold">Visibility</TableHead>
                   <TableHead className="font-bold">Status</TableHead>
                   <TableHead className="text-right font-bold">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {packages.map((plan) => (
                   <TableRow key={plan.id} className="hover:bg-slate-50/50">
                     <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                            {plan.name}
                            {plan.featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        </div>
                     </TableCell>
                     <TableCell className="text-foreground font-semibold">{plan.price.toLocaleString()}/mo</TableCell>
                     <TableCell className="text-muted-foreground">{plan.events_limit.toLocaleString()} events / {plan.users_limit} users</TableCell>
                     <TableCell>
                       {plan.include_price_table ? 
                         <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200"><Eye className="h-3 w-3 mr-1"/> Public</Badge> : 
                         <Badge variant="outline" className="text-slate-500 bg-slate-100"><EyeOff className="h-3 w-3 mr-1"/> Hidden</Badge>
                       }
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                     </TableCell>
                     <TableCell className="text-right space-x-2">
                       <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)} className="text-blue-600 hover:bg-blue-50">
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeletePackage(plan.id)} className="text-red-500 hover:bg-red-50">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          )}
        </CardContent>
      </Card>

      {/* Discount Manager */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Package Discounts</CardTitle>
            <CardDescription>Configure seasonal, percentage, or flat discounts for billing cycles</CardDescription>
          </div>
          <Button onClick={openAddDiscountDialog} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 h-9">
            <Plus className="h-4 w-4 mr-2" /> Add Discount
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {discountsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
          ) : discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <p className="text-sm">No discounts configured yet.</p>
              <Button variant="link" onClick={openAddDiscountDialog} className="text-[#1C4D8D] mt-2">Create your first discount</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-bold">Discount Name</TableHead>
                  <TableHead className="font-bold">Target Package</TableHead>
                  <TableHead className="font-bold">Billing Cycle</TableHead>
                  <TableHead className="font-bold">Discount Type & Value</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => {
                  const targetPkg = discount.packageId === "all" ? "All Packages" : (packages.find(p => p.id === discount.packageId)?.name || discount.packageId)
                  return (
                    <TableRow key={discount.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-foreground">
                        {discount.name}
                      </TableCell>
                      <TableCell className="text-foreground">{targetPkg}</TableCell>
                      <TableCell className="text-muted-foreground capitalize text-sm">
                        {discount.billingCycle === "all" ? "All Cycles" : discount.billingCycle === "6months" ? "6 Months" : discount.billingCycle}
                      </TableCell>
                      <TableCell className="text-foreground font-semibold">
                        {discount.type === "percentage" ? `${discount.value}%` : `LKR ${discount.value.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        {discount.isSeasonal ? (
                          <Badge variant="outline" className="text-purple-600 bg-purple-50 border-purple-200">Seasonal</Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={discount.active}
                            onCheckedChange={(checked) => handleToggleDiscountActive(discount, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {discount.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDiscountDialog(discount)} className="text-blue-600 hover:bg-blue-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDiscount(discount.id)} className="text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* EDIT/ADD DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>{editingPkg ? "Edit Package" : "Create New Package"}</DialogTitle>
                <DialogDescription>Configure subscription limits and pricing.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Package Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Enterprise" /></div>
                    <div className="space-y-2"><Label>Monthly Price (LKR)</Label><Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Max Events</Label><Input type="number" value={formData.events_limit} onChange={e => setFormData({...formData, events_limit: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>Max Users</Label><Input type="number" value={formData.users_limit} onChange={e => setFormData({...formData, users_limit: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>Photos/Event</Label><Input type="number" value={formData.photos_per_event} onChange={e => setFormData({...formData, photos_per_event: Number(e.target.value)})} /></div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50 flex-1">
                        <Switch checked={formData.featured} onCheckedChange={(c) => setFormData({...formData, featured: c})} id="featured-mode" />
                        <Label htmlFor="featured-mode" className="cursor-pointer text-sm">Featured Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50 flex-1">
                        <Switch checked={formData.include_price_table} onCheckedChange={(c) => setFormData({...formData, include_price_table: c})} id="public-mode" />
                        <Label htmlFor="public-mode" className="cursor-pointer text-sm">Show in Pricing Table</Label>
                    </div>
                </div>
                <div className="space-y-3">
                    <Label>Included Features</Label>
                    <div className="flex gap-2">
                        <Input placeholder="Add feature" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} />
                        <Button type="button" onClick={addFeature} variant="outline"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {formData.features.map((feat, idx) => (
                            <Badge key={idx} variant="secondary" className="pr-1">{feat} <button onClick={() => removeFeature(idx)} className="ml-2 hover:text-red-500"><Trash2 className="h-3 w-3"/></button></Badge>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#1C4D8D]" onClick={handleSavePackage} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} Save Package
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT/ADD DISCOUNT DIALOG */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>{editingDiscount ? "Edit Discount" : "Create New Discount"}</DialogTitle>
                <DialogDescription>Configure discount settings for platform packages.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>Discount Name</Label>
                    <Input 
                      value={discountFormData.name} 
                      onChange={e => setDiscountFormData({...discountFormData, name: e.target.value})} 
                      placeholder="e.g. Summer Promo, Special 6-Month Deal" 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Applies to Package</Label>
                        <select
                          value={discountFormData.packageId}
                          onChange={e => setDiscountFormData({...discountFormData, packageId: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        >
                            <option value="all">All Packages</option>
                            {packages.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Billing Cycle</Label>
                        <select
                          value={discountFormData.billingCycle}
                          onChange={e => setDiscountFormData({...discountFormData, billingCycle: e.target.value as any})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        >
                            <option value="all">All Cycles</option>
                            <option value="monthly">Monthly</option>
                            <option value="6months">6 Months</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Discount Type</Label>
                        <select
                          value={discountFormData.type}
                          onChange={e => setDiscountFormData({...discountFormData, type: e.target.value as any})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="flat">Flat Amount (LKR)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>{discountFormData.type === "percentage" ? "Percentage Value (%)" : "Flat Value (LKR)"}</Label>
                        <Input 
                          type="number" 
                          value={discountFormData.value} 
                          onChange={e => setDiscountFormData({...discountFormData, value: Number(e.target.value)})} 
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50 flex-1">
                        <Switch 
                          checked={discountFormData.active} 
                          onCheckedChange={(c) => setDiscountFormData({...discountFormData, active: c})} 
                          id="discount-active" 
                        />
                        <Label htmlFor="discount-active" className="cursor-pointer text-sm">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50 flex-1">
                        <Switch 
                          checked={discountFormData.isSeasonal} 
                          onCheckedChange={(c) => setDiscountFormData({...discountFormData, isSeasonal: c})} 
                          id="discount-seasonal" 
                        />
                        <Label htmlFor="discount-seasonal" className="cursor-pointer text-sm">Seasonal Discount</Label>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#1C4D8D]" onClick={handleSaveDiscount} disabled={isDiscountSubmitting}>
                    {isDiscountSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} Save Discount
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}