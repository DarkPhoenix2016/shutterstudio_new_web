"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Phone, MessageCircle, Mail, Loader2, Users, UserCheck, UserX, Search } from "lucide-react"

interface Member {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  phoneNumber: string; 
  photoURL?: string;
  designation?: string;
  role?: string;
  disabled?: boolean;
}

export default function StudioOverviewPage() {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 })
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchData = async () => {
        if (!currentUser?.uid) return;

        try {
            const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
            const studioId = userDoc.data()?.studioID;

            if (!studioId) return;

            const memListRef = doc(db, "Studios", studioId, "Members", "MEM_LIST");
            const memListSnap = await getDoc(memListRef);

            if (memListSnap.exists()) {
                const idList = memListSnap.data().ID_LIST || [];
                
                const userPromises = idList.map((uid: string) => getDoc(doc(db, "Users", uid)));
                const userSnaps = await Promise.all(userPromises);

                const fetchedUsers = userSnaps
                    .map(snap => ({ id: snap.id, ...snap.data() } as Member))
                    .filter(u => u.id);

                setMembers(fetchedUsers);

                const activeCount = fetchedUsers.filter(u => !u.disabled).length;
                setStats({
                    total: fetchedUsers.length,
                    active: activeCount,
                    disabled: fetchedUsers.length - activeCount
                });
            }
        } catch (error) {
            console.error("Error fetching overview data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [currentUser]);

  const filteredMembers = members.filter(member => 
      member.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phoneNumber?.includes(searchQuery)
  );

  const formatRole = (role?: string) => role ? role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Staff";

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Overview</h1>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered studio members</p>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disabled Users</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.disabled}</div>
                <p className="text-xs text-muted-foreground">Access revoked</p>
            </CardContent>
        </Card>
      </div>

      {/* QUICK ACCESS TABLE */}
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Quick Access</CardTitle>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Find member..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {filteredMembers.slice(0, 8).map((member) => (
                <div key={member.id} className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 last:border-0 last:pb-0 gap-4">
                    
                    <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-8">
                            <div className="min-w-[150px]">
                                <p className="font-medium leading-none">{member.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {member.designation || formatRole(member.role)}
                                </p>
                            </div>

                            <div className="text-sm text-gray-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-gray-400"/> 
                                    <span>{member.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-gray-400"/> 
                                    <span>{member.phoneNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <Button variant="outline" size="icon" onClick={() => window.location.href = `mailto:${member.email}`}>
                            <Mail className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.open(`tel:${member.phoneNumber}`)}>
                            <Phone className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.open(`sms:${member.phoneNumber}`)}>
                            <MessageCircle className="h-4 w-4 text-blue-600" />
                        </Button>
                        {/* [!code highlight] WhatsApp Button */}
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => window.open(`https://wa.me/${member.phoneNumber?.replace('+', '')}`, '_blank')}
                            title="WhatsApp"
                        >
                            <span className="font-bold text-green-600 text-xs">WA</span> 
                        </Button>
                    </div>
                </div>
             ))}
             {filteredMembers.length === 0 && <p className="text-center text-muted-foreground py-8">No members found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}