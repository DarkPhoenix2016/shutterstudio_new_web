"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, Plus, MoreHorizontal, Pencil, Ban, Check, Loader2, 
  Mail, Building2, ChevronLeft, ChevronRight 
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import Swal from "sweetalert2"
import { db } from "@/lib/firebase"
import { 
  collection, doc, getDocs, getDoc, updateDoc, 
  query, orderBy, limit, startAfter, endBefore, limitToLast, 
  DocumentSnapshot 
} from "firebase/firestore"
import { logAuditAction } from "@/lib/logger"

// --- API ENDPOINTS ---
const REGISTER_USER_API = "https://registeruser-g33n26zifq-uc.a.run.app"
const REGISTER_ADMIN_API = "https://registeradmin-g33n26zifq-uc.a.run.app"
const ENABLE_USER_API = "https://enableuser-g33n26zifq-uc.a.run.app"
const DISABLE_USER_API = "https://disableuser-g33n26zifq-uc.a.run.app"

// --- [!code highlight] TOAST CONFIGURATION ---
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
interface UserData {
  id: string
  email: string
  role: string
  displayName: string
  phoneNumber?: string
  photoURL?: string
  studioID?: string
  status: "Active" | "Disabled"
  accountDisabled?: boolean
}

interface StudioSimple {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 20

const ROLES = [
  { value: "super_admin", label: "Super Admin", type: "platform" },
  { value: "admin", label: "Platform Admin", type: "platform" },
  { value: "studio_manager", label: "Studio Manager", type: "studio" },
  { value: "studio_accountant", label: "Studio Accountant", type: "studio" },
  { value: "studio_crew", label: "Studio Crew", type: "studio" },
]

export default function DirectoryPage() {
  const { currentUser } = useAuth()
  
  // Data State
  const [users, setUsers] = useState<UserData[]>([])
  const [studios, setStudios] = useState<StudioSimple[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dynamic Defaults State
  const [defaultAssets, setDefaultAssets] = useState({ avatar: "", cover: "" })

  // Pagination State
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null)
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Dialog & Form State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState({
    email: "", password: "", displayName: "", phoneNumber: "", role: "", studioID: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Initial Load
  useEffect(() => {
    fetchDefaults()
    fetchStudios()
    fetchUsers("initial")
  }, [])

  // Fetch Default Assets from Firestore
  const fetchDefaults = async () => {
    try {
      const docRef = doc(db, "Platform", "defaults")
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const data = snap.data()
        setDefaultAssets({
          avatar: data.user_avatar || "",
          cover: data.user_cover || ""
        })
      }
    } catch (e) {
      console.error("Failed to load platform defaults", e)
    }
  }

  // 2. Fetch Studios for Dropdown
  const fetchStudios = async () => {
    try {
      const snap = await getDocs(collection(db, "Studios"))
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }))
      setStudios(list)
    } catch (e) {
      console.error("Failed to load studios", e)
    }
  }

  // 3. Fetch Users (Paginated)
  const fetchUsers = async (direction: "initial" | "next" | "prev") => {
    setLoading(true)
    try {
      let q = query(collection(db, "Users"), orderBy("email"), limit(ITEMS_PER_PAGE))

      if (direction === "next" && lastVisible) {
        q = query(collection(db, "Users"), orderBy("email"), startAfter(lastVisible), limit(ITEMS_PER_PAGE))
      } else if (direction === "prev" && firstVisible) {
        q = query(collection(db, "Users"), orderBy("email"), endBefore(firstVisible), limitToLast(ITEMS_PER_PAGE))
      }

      const snap = await getDocs(q)
      
      const newUsers: UserData[] = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          email: d.email || "",
          role: d.role || "unknown",
          displayName: d.displayName || d.name || "Unnamed",
          phoneNumber: d.phoneNumber || "",
          photoURL: d.photoURL || defaultAssets.avatar, 
          studioID: d.studioID,
          status: d.accountDisabled ? "Disabled" : "Active",
          accountDisabled: d.accountDisabled || false
        }
      })

      if (!snap.empty) {
        setFirstVisible(snap.docs[0])
        setLastVisible(snap.docs[snap.docs.length - 1])
        setUsers(newUsers)
        
        if (direction === "next") setPage(p => p + 1)
        if (direction === "prev") setPage(p => p - 1)
        
        setHasMore(snap.docs.length === ITEMS_PER_PAGE)
      } else {
         if (direction === "next") setHasMore(false)
      }

    } catch (e) {
      console.error("Fetch users error:", e)
    } finally {
      setLoading(false)
    }
  }

  // --- ACTIONS: CREATE USER ---
  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.displayName || !formData.role) {
      return Toast.fire({ icon: 'warning', title: 'Please fill in all required fields.' })
    }

    const selectedRole = ROLES.find(r => r.value === formData.role)
    if (selectedRole?.type === "studio" && !formData.studioID) {
      return Toast.fire({ icon: 'warning', title: 'Studio ID is required for this role.' })
    }

    setIsSubmitting(true)
    try {
      const apiEndpoint = selectedRole?.type === "platform" ? REGISTER_ADMIN_API : REGISTER_USER_API
      
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            email: formData.email,
            password: formData.password,
            displayName: formData.displayName,
            phoneNumber: formData.phoneNumber,
            role: formData.role,
            studioID: formData.studioID,
            photoURL: defaultAssets.avatar,
            coverURL: defaultAssets.cover 
          }
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || "Registration failed")
      }

      if (currentUser) {
        await logAuditAction("CREATE_USER", `Created user ${formData.email}`, currentUser, "UserDirectory")
      }

      Toast.fire({ icon: 'success', title: 'User account created successfully.' })
      
      setIsAddOpen(false)
      setFormData({ email: "", password: "", displayName: "", phoneNumber: "", role: "", studioID: "" })
      fetchUsers("initial") 

    } catch (error: any) {
      Toast.fire({ icon: 'error', title: error.message || 'Registration failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- ACTIONS: UPDATE USER ---
  const handleUpdateUser = async () => {
    if (!editingUser) return
    setIsSubmitting(true)
    try {
      await updateDoc(doc(db, "Users", editingUser.id), {
        displayName: editingUser.displayName,
        phoneNumber: editingUser.phoneNumber,
        role: editingUser.role,
        studioID: editingUser.studioID
      })

      if (currentUser) {
        await logAuditAction("UPDATE_USER", `Updated profile for ${editingUser.email}`, currentUser, "UserDirectory")
      }

      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u))
      setIsEditOpen(false)
      
      Toast.fire({ icon: 'success', title: 'User details updated.' })

    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Failed to update user.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- ACTIONS: STATUS TOGGLE ---
  const handleToggleStatus = async (user: UserData) => {
    const isDisabled = user.status === "Disabled"
    const action = isDisabled ? "Enable" : "Disable"
    const apiEndpoint = isDisabled ? ENABLE_USER_API : DISABLE_USER_API

    // Keep Modal for Confirmation (This is important for UX safety)
    Swal.fire({
      title: `${action} User?`,
      text: isDisabled ? "Access will be restored." : "User will be logged out and blocked.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isDisabled ? '#10b981' : '#d33',
      confirmButtonText: `Yes, ${action}`,
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const res = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { uid: user.id } })
          })
          if (!res.ok) throw new Error("API request failed")
          
          if (currentUser) {
            await logAuditAction("USER_STATUS", `${action}d user ${user.email}`, currentUser, "UserDirectory")
          }
          return true
        } catch (e: any) {
          Swal.showValidationMessage(e.message)
        }
      }
    }).then((res) => {
      if (res.isConfirmed) {
        const newStatus = isDisabled ? "Active" : "Disabled"
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus, accountDisabled: !isDisabled } : u))
        
        Toast.fire({ icon: 'success', title: `User has been ${action}d.` })
      }
    })
  }

  // Search Filter
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-6 p-6 mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground mt-1">Manage system access and user roles.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90"><Plus className="h-4 w-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          {/* Prevent Background Click Dismissal */}
          <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Onboard New User</DialogTitle>
              <DialogDescription>Create an account for platform admin or studio staff.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><Label>Full Name</Label><Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="John Doe"/></div>
                 <div className="space-y-2"><Label>Role</Label>
                   <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                     <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="platform_group" disabled className="font-semibold bg-slate-100">Platform Roles</SelectItem>
                       {ROLES.filter(r => r.type === "platform").map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                       <SelectItem value="studio_group" disabled className="font-semibold bg-slate-100">Studio Roles</SelectItem>
                       {ROLES.filter(r => r.type === "studio").map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
              </div>
              
              {ROLES.find(r => r.value === formData.role)?.type === "studio" && (
                 <div className="space-y-2">
                    <Label>Assign to Studio <span className="text-red-500">*</span></Label>
                    <Select value={formData.studioID} onValueChange={v => setFormData({...formData, studioID: v})}>
                       <SelectTrigger><SelectValue placeholder="Select Studio" /></SelectTrigger>
                       <SelectContent>
                          {studios.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
              )}

              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><Label>Password</Label><Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                 <div className="space-y-2"><Label>Phone</Label><Input value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} /></div>
              </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
               <Button className="bg-[#1C4D8D]" onClick={handleCreateUser} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : "Create Account"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* SEARCH */}
      <Card className="border-none shadow-md mb-6">
        <CardContent className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search loaded users by Name or Email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
        </CardContent>
      </Card>

      {/* USERS TABLE */}
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
           {loading && users.length === 0 ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>
           ) : (
             <>
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50 hover:bg-slate-50">
                   <TableHead>User Profile</TableHead>
                   <TableHead>Role & Access</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Studio Context</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredUsers.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="text-center py-8">No users found.</TableCell></TableRow>
                 ) : (
                    filteredUsers.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.photoURL || defaultAssets.avatar} />
                                <AvatarFallback className="bg-[#1C4D8D]/10 text-[#1C4D8D]">{user.displayName ? user.displayName.substring(0, 2).toUpperCase() : "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-sm text-foreground">{user.displayName}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {user.email}</div>
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="capitalize bg-slate-50">{user.role.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge className={user.status === "Active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>
                            {user.studioID ? (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Building2 className="h-3 w-3" />
                                <span>{studios.find(s => s.id === user.studioID)?.name || user.studioID}</span>
                            </div>
                            ) : <span className="text-xs text-slate-400 italic">Global Access</span>}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setEditingUser(user); setIsEditOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} className={user.status === "Active" ? "text-red-600" : "text-green-600"}>
                                    {user.status === "Active" ? <><Ban className="mr-2 h-4 w-4" /> Disable Account</> : <><Check className="mr-2 h-4 w-4" /> Enable Account</>}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                 )}
               </TableBody>
             </Table>

             {/* PAGINATION */}
             <div className="border-t p-4 flex items-center justify-between bg-slate-50/30">
                 <p className="text-xs text-muted-foreground">Showing page {page}</p>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1 || loading} onClick={() => fetchUsers("prev")}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasMore || loading} onClick={() => fetchUsers("next")}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                 </div>
             </div>
             </>
           )}
        </CardContent>
      </Card>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
         {/* Prevent Background Click Dismissal */}
         <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
               <DialogTitle>Edit User Profile</DialogTitle>
               <DialogDescription>Modify details for {editingUser?.email}</DialogDescription>
            </DialogHeader>
            {editingUser && (
               <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={editingUser.role} onValueChange={v => setEditingUser({...editingUser, role: v})}>
                           <SelectTrigger><SelectValue /></SelectTrigger>
                           <SelectContent>
                              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label>Studio Context</Label>
                        <Select value={editingUser.studioID || "none"} onValueChange={v => setEditingUser({...editingUser, studioID: v === "none" ? undefined : v})}>
                           <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="none">None (Platform Level)</SelectItem>
                              {studios.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
               </div>
            )}
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
               <Button className="bg-[#1C4D8D]" onClick={handleUpdateUser} disabled={isSubmitting}>Save Changes</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}