"use client"

// [!code highlight] Added ReactNode to imports
import { useState, useEffect, useMemo, ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustStock, 
  fetchCategories, addCategory, updateCategory, deleteCategory,
  InventoryItem, InventoryCategory 
} from "@/lib/inventory-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
    Loader2, Plus, Settings2, RefreshCcw, Tags, Trash2, 
    Search, ChevronDown, ChevronRight, Pencil, Filter 
} from "lucide-react"
import Swal from "sweetalert2"

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
  didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer) }
})

const ITEMS_PER_PAGE = 10;

export default function InventorySettingsPage() {
  const { userData } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("")
  const [itemPage, setItemPage] = useState(1)
  const [catPage, setCatPage] = useState(1)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]) 

  // Dialog States
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<InventoryCategory | null>(null)

  const [isStockOpen, setIsStockOpen] = useState(false)
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null)

  // Forms
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({ 
      type: 'owned', quantityTotal: 1, quantityAvailable: 1, status: 'active', color: '#cccccc' 
  })
  const [catForm, setCatForm] = useState<Partial<InventoryCategory>>({ name: "", color: "#3b82f6" })
  const [stockAction, setStockAction] = useState({ type: 'add', qty: 1, comment: '' })

  useEffect(() => {
    if (userData?.studioID) loadData()
  }, [userData])

  const loadData = async () => {
    try {
      const [itemsData, catsData] = await Promise.all([
        fetchInventory(userData!.studioID!),
        fetchCategories(userData!.studioID!)
      ])
      setItems(itemsData)
      setCategories(catsData)
      // Auto expand all categories initially
      setExpandedCategories(catsData.map(c => c.name))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- FILTERING & PAGINATION LOGIC ---
  const filteredItems = useMemo(() => {
      return items.filter(i => 
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [items, searchQuery])

  const sortedItems = [...filteredItems].sort((a, b) => a.category.localeCompare(b.category));
  const totalItemPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedItems.slice((itemPage - 1) * ITEMS_PER_PAGE, itemPage * ITEMS_PER_PAGE);

  // --- ITEM ACTIONS ---
  const openItemDialog = (item?: InventoryItem) => {
      if (item) {
          setEditingItem(item)
          setItemForm({ ...item })
      } else {
          setEditingItem(null)
          setItemForm({ type: 'owned', quantityTotal: 1, quantityAvailable: 1, status: 'active', color: '#cccccc' })
      }
      setIsItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
      if (!itemForm.name || !itemForm.category) return Toast.fire({ icon: 'warning', title: 'Missing Name or Category' })
      
      try {
          if (editingItem && editingItem.id) {
              await updateInventoryItem(userData!.studioID!, editingItem.id, itemForm)
              Toast.fire({ icon: 'success', title: 'Item updated' })
          } else {
              await addInventoryItem(userData!.studioID!, itemForm as InventoryItem)
              Toast.fire({ icon: 'success', title: 'Item created' })
          }
          setIsItemDialogOpen(false)
          loadData()
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Action failed' })
      }
  }

  const handleDeleteItem = async (item: InventoryItem) => {
      if (item.quantityAvailable !== item.quantityTotal) {
          return Swal.fire({ 
              icon: 'error', 
              title: 'Cannot Delete', 
              text: `This item has ${item.quantityTotal - item.quantityAvailable} unit(s) currently assigned/rented out. Return them before deleting.` 
          })
      }

      Swal.fire({
          title: "Delete Item?",
          text: "This action cannot be undone.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          confirmButtonText: "Delete"
      }).then(async (res) => {
          if (res.isConfirmed) {
              try {
                  await deleteInventoryItem(userData!.studioID!, item.id!)
                  Toast.fire({ icon: 'success', title: 'Item deleted' })
                  loadData()
              } catch (e) {
                  Toast.fire({ icon: 'error', title: 'Delete failed' })
              }
          }
      })
  }

  const handleStockAdjust = async () => {
      if (!selectedStockItem || !stockAction.comment) return Toast.fire({ icon: 'warning', title: 'Comment required' })
      
      try {
          await adjustStock(
              userData!.studioID!, 
              selectedStockItem.id!, 
              Number(stockAction.qty), 
              stockAction.type as any, 
              stockAction.comment,
              { uid: userData!.uid, name: userData!.displayName || 'Admin' }
          )
          Toast.fire({ icon: 'success', title: 'Stock updated' })
          setIsStockOpen(false)
          loadData()
      } catch (e: any) {
          Toast.fire({ icon: 'error', title: typeof e === 'string' ? e : 'Transaction failed' })
      }
  }

  // --- CATEGORY ACTIONS ---
  const openCatDialog = (cat?: InventoryCategory) => {
      if (cat) {
          setEditingCat(cat)
          setCatForm({ ...cat })
      } else {
          setEditingCat(null)
          setCatForm({ name: "", color: "#3b82f6" })
      }
      setIsCatDialogOpen(true)
  }

  const handleSaveCategory = async () => {
      if (!catForm.name?.trim()) return
      try {
          if (editingCat && editingCat.id) {
              await updateCategory(userData!.studioID!, editingCat.id, catForm)
              Toast.fire({ icon: 'success', title: 'Category updated' })
          } else {
              await addCategory(userData!.studioID!, catForm as InventoryCategory)
              Toast.fire({ icon: 'success', title: 'Category created' })
          }
          setIsCatDialogOpen(false)
          loadData()
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Action failed' })
      }
  }

  const handleDeleteCategory = async (cat: InventoryCategory) => {
      const hasItems = items.some(i => i.category === cat.name)
      if (hasItems) {
          return Swal.fire({ 
              icon: 'error', 
              title: 'Cannot Delete', 
              text: 'This category contains items. Please reassign or delete them first.' 
          })
      }

      try {
          await deleteCategory(userData!.studioID!, cat.id!)
          Toast.fire({ icon: 'success', title: 'Category deleted' })
          loadData()
      } catch (e) {
          Toast.fire({ icon: 'error', title: 'Delete failed' })
      }
  }

  const toggleCategoryExpand = (catName: string) => {
      setExpandedCategories(prev => 
          prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
      )
  }

  // Render Helper: Inject Category Header
  const renderItemRows = () => {
      let lastCategory = ""
      // [!code highlight] FIXED TYPE ERROR: using ReactNode[] instead of JSX.Element[]
      const rows: ReactNode[] = []

      paginatedItems.forEach(item => {
          if (item.category !== lastCategory) {
              const catObj = categories.find(c => c.name === item.category)
              const isExpanded = expandedCategories.includes(item.category)
              const bgColor = catObj?.color ? `${catObj.color}20` : '#f1f5f9' 
              const textColor = catObj?.color || '#000'

              rows.push(
                  <TableRow 
                      key={`cat-${item.category}`} 
                      className="cursor-pointer hover:opacity-80 transition-colors border-t-2"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => toggleCategoryExpand(item.category)}
                  >
                      <TableCell colSpan={5} className="font-bold py-3">
                          <div className="flex items-center gap-2" style={{ color: textColor }}>
                              {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                              {item.category}
                              <Badge variant="outline" className="ml-2 bg-white/50 border-0 text-inherit">{items.filter(i => i.category === item.category).length} items</Badge>
                          </div>
                      </TableCell>
                  </TableRow>
              )
              lastCategory = item.category
          }

          if (expandedCategories.includes(item.category)) {
              rows.push(
                  <TableRow key={item.id} className="group">
                      <TableCell className="font-medium pl-8">
                          <div className="flex flex-col">
                              <span>{item.name}</span>
                              {item.serialNumber && <span className="text-[10px] text-slate-400">SN: {item.serialNumber}</span>}
                          </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{item.type}</Badge></TableCell>
                      <TableCell>
                          <div className="flex items-center gap-2">
                              <span className={item.quantityAvailable === 0 ? "text-red-600 font-bold" : ""}>
                                  {item.quantityAvailable}
                              </span>
                              <span className="text-slate-400">/ {item.quantityTotal}</span>
                          </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedStockItem(item); setIsStockOpen(true); }} className="h-8 w-8 p-0" title="Adjust Stock">
                              <RefreshCcw className="h-4 w-4 text-orange-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openItemDialog(item)} className="h-8 w-8 p-0" title="Edit Details">
                              <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item)} className="h-8 w-8 p-0" title="Delete">
                              <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                      </TableCell>
                  </TableRow>
              )
          }
      })
      
      if (rows.length === 0) {
          return <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items found.</TableCell></TableRow>
      }
      return rows
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-[#0F2854]">Inventory Settings</h1>
            <p className="text-muted-foreground">Manage your equipment, categories, and stock.</p>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
            <TabsTrigger value="items" className="px-6">Item List</TabsTrigger>
            <TabsTrigger value="categories" className="px-6">Categories</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: ITEMS --- */}
        <TabsContent value="items">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#1C4D8D]"/> Item Database</CardTitle>
                        <CardDescription>View, edit, and adjust stock levels.</CardDescription>
                    </div>
                    <Button className="bg-[#1C4D8D]" onClick={() => openItemDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Add New Item
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="flex items-center gap-2 max-w-md bg-slate-50 p-2 rounded-md border">
                        <Search className="h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search items by name, category, serial..." 
                            className="border-none bg-transparent h-8 focus-visible:ring-0" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Stock (Avail/Total)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderItemRows()}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-slate-500">Page {itemPage} of {totalItemPages || 1}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage === 1}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.min(totalItemPages, p + 1))} disabled={itemPage >= totalItemPages}>Next</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- TAB 2: CATEGORIES --- */}
        <TabsContent value="categories">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-[#1C4D8D]"/> Category Config</CardTitle>
                        <CardDescription>Organize items into colored groups.</CardDescription>
                    </div>
                    <Button onClick={() => openCatDialog()} className="bg-[#1C4D8D]">
                        <Plus className="mr-2 h-4 w-4" /> Add Category
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Category Name</TableHead>
                                    <TableHead>Item Count</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories
                                    .slice((catPage - 1) * ITEMS_PER_PAGE, catPage * ITEMS_PER_PAGE)
                                    .map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell>
                                            <div className="w-6 h-6 rounded border shadow-sm" style={{ backgroundColor: cat.color }} />
                                        </TableCell>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell>{items.filter(i => i.category === cat.name).length}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => openCatDialog(cat)}>
                                                <Pencil className="h-4 w-4 text-blue-600"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat)}>
                                                <Trash2 className="h-4 w-4 text-red-600"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8">No categories found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-slate-500">Page {catPage} of {Math.ceil(categories.length / ITEMS_PER_PAGE) || 1}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCatPage(p => Math.max(1, p - 1))} disabled={catPage === 1}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setCatPage(p => Math.min(Math.ceil(categories.length / ITEMS_PER_PAGE), p + 1))} disabled={catPage * ITEMS_PER_PAGE >= categories.length}>Next</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* --- DIALOGS --- */}

      {/* ITEM DIALOG (CREATE/EDIT) */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Item Name</Label><Input value={itemForm.name || ""} onChange={e => setItemForm({...itemForm, name: e.target.value})} /></div>
                    
                    {/* Category Select */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={itemForm.category} onValueChange={(val) => {
                            const cat = categories.find(c => c.name === val)
                            setItemForm({
                                ...itemForm, 
                                category: val, 
                                categoryId: cat?.id,
                                color: cat?.color || itemForm.color // Auto-inherit color
                            })
                        }}>
                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Type</Label>
                        <Select value={itemForm.type} onValueChange={(v: any) => setItemForm({...itemForm, type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="owned">Owned</SelectItem><SelectItem value="rented">Rented</SelectItem></SelectContent>
                        </Select>
                    </div>
                    {/* Disable Qty Editing if Updating (Use Adjust Stock instead to keep history consistent) */}
                    <div className="space-y-2">
                        <Label>Total Quantity</Label>
                        <Input type="number" disabled={!!editingItem} value={itemForm.quantityTotal} onChange={e => setItemForm({...itemForm, quantityTotal: Number(e.target.value), quantityAvailable: Number(e.target.value)})} />
                        {editingItem && <span className="text-[10px] text-slate-400">Use 'Adjust' to change stock</span>}
                    </div>
                    {/* Read-Only Color Display */}
                    <div className="space-y-2">
                        <Label>Color (Inherited)</Label>
                        <div className="flex gap-2 items-center h-10 border rounded-md px-3 bg-slate-50 cursor-not-allowed">
                            <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: itemForm.color || '#ccc' }} />
                            <span className="text-xs text-slate-500 font-mono">{itemForm.color || "None"}</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2"><Label>Serial Number (Opt)</Label><Input value={itemForm.serialNumber || ""} onChange={e => setItemForm({...itemForm, serialNumber: e.target.value})} /></div>
                
                {/* Pricing */}
                {itemForm.type === 'owned' ? (
                    <div className="space-y-2"><Label>Usage Cost (Per Event)</Label><Input type="number" value={itemForm.costPerEvent || 0} onChange={e => setItemForm({...itemForm, costPerEvent: Number(e.target.value)})} /></div>
                ) : (
                    <div className="space-y-2 border p-3 rounded-md bg-slate-50">
                        <Label className="mb-2 block font-semibold">Rental Rates</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1"><Label className="text-xs">Hourly</Label><Input type="number" value={itemForm.rentalRates?.hourly || 0} onChange={e => setItemForm({...itemForm, rentalRates: {...itemForm.rentalRates, hourly: Number(e.target.value)}})} /></div>
                            <div className="space-y-1"><Label className="text-xs">Daily</Label><Input type="number" value={itemForm.rentalRates?.daily || 0} onChange={e => setItemForm({...itemForm, rentalRates: {...itemForm.rentalRates, daily: Number(e.target.value)}})} /></div>
                            <div className="space-y-1"><Label className="text-xs">Weekly</Label><Input type="number" value={itemForm.rentalRates?.weekly || 0} onChange={e => setItemForm({...itemForm, rentalRates: {...itemForm.rentalRates, weekly: Number(e.target.value)}})} /></div>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter><Button onClick={handleSaveItem}>Save Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CATEGORY DIALOG (CREATE/EDIT) */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} /></div>
                <div className="space-y-2">
                    <Label>Color Code</Label>
                    <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} />
                        <Input className="font-mono uppercase" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} />
                    </div>
                </div>
            </div>
            <DialogFooter><Button onClick={handleSaveCategory}>Save Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STOCK ADJUST DIALOG */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock: {selectedStockItem?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Tabs defaultValue="add" onValueChange={(v) => setStockAction({...stockAction, type: v})}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="add">Add Stock</TabsTrigger>
                        <TabsTrigger value="remove">Remove</TabsTrigger>
                        <TabsTrigger value="maintenance_in">Maintenance</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={stockAction.qty} onChange={e => setStockAction({...stockAction, qty: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <Label>Reason / Comment</Label>
                    <Textarea placeholder="e.g. New purchase, Broken, Sent for repair..." value={stockAction.comment} onChange={e => setStockAction({...stockAction, comment: e.target.value})} />
                </div>
            </div>
            <DialogFooter><Button onClick={handleStockAdjust}>Confirm Transaction</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}