"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, Mail, Building2, User as UserIcon } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Define the shape of a User document from Firestore
interface UserData {
  id: string
  email: string
  role: string
  name?: string
  studioId?: string
}

export default function DirectoryPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // 1. Fetch Users from Firestore on Mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // NOTE: This assumes you have a 'Users' collection where user profiles are saved.
        // If you only have 'Platform' settings, you might need to fetch from there instead.
        const querySnapshot = await getDocs(collection(db, "Users"))
        
        const fetchedUsers: UserData[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          fetchedUsers.push({
            id: doc.id,
            email: data.email || "No Email",
            role: data.role || "Unknown",
            name: data.name || "Unnamed User",
            studioId: data.studioId
          })
        })
        setUsers(fetchedUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // 2. Filter logic for the search bar
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F2854]">User Directory</h1>
          <p className="text-muted-foreground">Manage and view all registered system users.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border">
        <Search className="w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 focus-visible:ring-0"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading directory...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No users found.
        </div>
      )}

      {/* User Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-sm font-medium leading-none">
                  {user.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{user.role}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm mt-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.studioId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{user.studioId}</span>
                  </div>
                )}
                {!user.studioId && (
                   <div className="flex items-center gap-2 text-muted-foreground">
                   <UserIcon className="h-4 w-4" />
                   <span>System Admin</span>
                 </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                 <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                    {user.role}
                 </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}