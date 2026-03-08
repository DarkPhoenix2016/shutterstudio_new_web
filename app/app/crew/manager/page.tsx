"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  fetchCrewMembers, fetchRoles, fetchDesignations, fetchSubscriptionLimits, 
  createCrewMember, updateCrewMember, toggleCrewMemberStatus,
  Member, PackageLimits 
} from "@/services/crew-service"
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Loader2, Search, Mail, Phone, Ban, CheckCircle, UserPlus, AlertTriangle, Pencil, MessageCircle 
} from "lucide-react"
import Swal from "sweetalert2"

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

export default function StudioManagersPage() {
  const { currentUser, userData } = useAuth()
  
  // Data State
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [availableDesignations, setAvailableDesignations] = useState<string[]>([])
  
  // Limits
  const [limits, setLimits] = useState<PackageLimits>({ maxUsers: 0, packageName: "Loading..." })
  const [activeUsage, setActiveUsage] = useState(0)

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: keyof Member; direction: 'asc' | 'desc' }>({ key: 'displayName', direction: 'asc' })

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Member | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newUser, setNewUser] = useState({
      displayName: "", email: "", phone: "", password: "", role: "", designation: ""
  })

  // 1. DATA FETCHING
  useEffect(() => {
    const initData = async () => {
        if (!userData?.studioID) return;
        setLoading(true);

        try {
            const [fetchedRoles, fetchedDesignations, fetchedLimits, fetchedMembers] = await Promise.all([
                fetchRoles(),
                fetchDesignations(userData.studioID),
                fetchSubscriptionLimits(userData.studioID),
                fetchCrewMembers(userData.studioID)
            ]);

            setRoles(fetchedRoles);
            setAvailableDesignations(fetchedDesignations);
            setLimits(fetchedLimits);
            setMembers(fetchedMembers);
            setFilteredMembers(fetchedMembers);

            const activeCount = fetchedMembers.filter(u => !(u.disabled || u.accountDisabled || u.status === "Disabled")).length;
            setActiveUsage(activeCount);

        } catch (err) {
            Toast.fire({ icon: 'error', title: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    initData();
  }, [userData]);

  // 2. SEARCH & SORT FILTER
  useEffect(() => {
    let result = [...members];
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(m => 
            m.displayName?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q)
        );
    }

    if (sortConfig.key) {
        result.sort((a, b) => {
            const valA = a[sortConfig.key] || "";
            const valB = b[sortConfig.key] || "";
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    setFilteredMembers(result);
  }, [members, searchQuery, sortConfig]);

  const handleSort = (key: keyof Member) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // 3. ACTIONS
  const handleCreateUser = async () => {
      if (!userData?.studioID) {
          Toast.fire({ icon: 'error', title: 'Studio ID is missing.' });
          return;
      }

      if(!newUser.email || !newUser.password || !newUser.displayName || !newUser.role) {
          Toast.fire({ icon: 'warning', title: 'Please fill all mandatory fields' });
          return;
      }

      setIsSubmitting(true);

      try {
          await createCrewMember({
              ...newUser,
              studioID: userData.studioID
          });

          Toast.fire({ icon: 'success', title: 'User created successfully' });
          setIsAddOpen(false);
          setNewUser({ displayName: "", email: "", phone: "", password: "", role: "", designation: "" });
          
          window.location.reload(); 

      } catch (error: any) {
          Toast.fire({ icon: 'error', title: error.message || 'Registration failed' });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleEditUser = (member: Member) => {
      setEditingUser({ ...member });
      setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
      if (!editingUser) return;
      setIsSubmitting(true);

      try {
          const updateData = {
              displayName: editingUser.displayName,
              phoneNumber: editingUser.phoneNumber,
              role: editingUser.role,
              designation: editingUser.designation
          };

          await updateCrewMember(editingUser.id, updateData);

          setMembers(prev => prev.map(m => m.id === editingUser.id ? { ...m, ...updateData } : m));
          
          Toast.fire({ icon: 'success', title: 'User details updated' });
          setIsEditOpen(false);
      } catch (error: any) {
          Toast.fire({ icon: 'error', title: 'Failed to update user' });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleToggleStatus = async (member: Member) => {
      const isDisabled = member.disabled || member.accountDisabled || member.status === "Disabled";
      const action = isDisabled ? "Enable" : "Disable";

      if (isDisabled && activeUsage >= limits.maxUsers) {
          Toast.fire({ icon: 'error', title: 'Active user limit reached' });
          return;
      }

      Swal.fire({
          title: `${action} User?`,
          text: `Are you sure you want to ${action.toLowerCase()} ${member.displayName}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: `Yes, ${action}`,
          confirmButtonColor: isDisabled ? '#10b981' : '#ef4444'
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  await toggleCrewMemberStatus(member.id, !isDisabled);

                  setMembers(prev => prev.map(m => m.id === member.id ? { 
                      ...m, 
                      disabled: !isDisabled, 
                      accountDisabled: !isDisabled,
                      status: isDisabled ? "Active" : "Disabled" 
                  } : m));

                  setActiveUsage(prev => isDisabled ? prev + 1 : prev - 1);
                  Toast.fire({ icon: 'success', title: `User ${action}d successfully` });
              } catch (error) {
                  Toast.fire({ icon: 'error', title: 'Failed to update status' });
              }
          }
      });
  };

  const isLimitReached = activeUsage >= limits.maxUsers;

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-muted-foreground border-blue-200 bg-blue-50">
                    Plan: {limits.packageName}
                </Badge>
                <Badge variant={isLimitReached ? "destructive" : "secondary"}>
                    Active Seats: {activeUsage} / {limits.maxUsers}
                </Badge>
            </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search name or email..." 
                    className="pl-8 bg-white" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-black text-white hover:bg-gray-800" disabled={isLimitReached}>
                        {isLimitReached ? <AlertTriangle className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4" />}
                        {isLimitReached ? "Limit Reached" : "Add Member"}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Team Member</DialogTitle>
                        <DialogDescription>Create a new account. Active users count towards your plan limit.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Name *</Label><Input className="col-span-3" value={newUser.displayName} onChange={e => setNewUser({...newUser, displayName: e.target.value})}/></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Email *</Label><Input type="email" className="col-span-3" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Phone *</Label><Input className="col-span-3" placeholder="+1 555 0199" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Password *</Label><Input type="password" className="col-span-3" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/></div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Role *</Label>
                            <Select onValueChange={(val) => setNewUser({...newUser, role: val})}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Access Level" /></SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role} value={role}>{role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Designation</Label>
                            <Select onValueChange={(val) => setNewUser({...newUser, designation: val})}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                                <SelectContent>
                                    {availableDesignations.map(des => <SelectItem key={des} value={des}>{des}</SelectItem>)}
                                    {availableDesignations.length === 0 && <SelectItem value="none" disabled>No designations created in Settings</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateUser} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create Account"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
              {editingUser && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Name</Label><Input className="col-span-3" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})}/></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Phone</Label><Input className="col-span-3" value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})}/></div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Role</Label>
                          <Select value={editingUser.role} onValueChange={(val) => setEditingUser({...editingUser, role: val})}>
                              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                              <SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Designation</Label>
                          <Select value={editingUser.designation || ""} onValueChange={(val) => setEditingUser({...editingUser, designation: val})}>
                              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  {availableDesignations.map(des => <SelectItem key={des} value={des}>{des}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateUser} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save Changes"}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-gray-50">
                <TableRow>
                    <TableHead className="w-[250px] cursor-pointer" onClick={() => handleSort('displayName')}>User Details</TableHead>
                    <TableHead className="text-left cursor-pointer" onClick={() => handleSort('email')}>Contact Info</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredMembers.map((member) => {
                    const isDisabled = member.disabled || member.accountDisabled || member.status === "Disabled";
                    const isCurrentUser = member.id === currentUser?.uid;

                    return (
                        <TableRow key={member.id} className={isDisabled ? "bg-red-50/40 opacity-75" : ""}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar><AvatarImage src={member.photoURL} /><AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                    <div className="flex flex-col"><span className="font-medium">{member.displayName}</span>{member.designation && <span className="text-xs text-muted-foreground">{member.designation}</span>}{isCurrentUser && <Badge variant="secondary" className="w-fit text-[10px] mt-1">YOU</Badge>}</div>
                                </div>
                            </TableCell>
                            <TableCell className="text-left">
                                <div className="flex flex-col text-sm gap-1">
                                    <div className="flex items-center gap-2 text-gray-600"><Mail className="h-3 w-3" /> {member.email}</div>
                                    <div className="flex items-center gap-2 text-gray-500"><Phone className="h-3 w-3" /> {member.phoneNumber}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{member.role ? member.role.replace(/_/g, ' ') : "No Role"}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                {isDisabled ? <Badge variant="destructive" className="text-xs">Disabled</Badge> : <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs shadow-none">Active</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => handleEditUser(member)} disabled={isCurrentUser}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>
                                    <Button variant={isDisabled ? "outline" : "destructive"} size="sm" className={`h-8 ${isDisabled ? "text-green-600 border-green-200 hover:bg-green-50" : ""}`} disabled={isCurrentUser} onClick={() => handleToggleStatus(member)}>
                                        {isDisabled ? <><CheckCircle className="mr-2 h-3.5 w-3.5" /> Enable</> : <><Ban className="mr-2 h-3.5 w-3.5" /> Disable</>}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                })}
                {filteredMembers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No members found.</TableCell></TableRow>}
            </TableBody>
        </Table>
      </div>
    </div>
  )
}