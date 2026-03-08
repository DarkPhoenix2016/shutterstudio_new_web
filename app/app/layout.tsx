"use client"

import { useEffect, useState, Suspense } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { Bell, Search, User, Loader2, AlertTriangle, ShieldAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// --- TYPES ---
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, userData, globalSettings, rolePermissions, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Define routes that live inside this layout but should NOT have the sidebar/checks
  const isAuthPage = pathname.startsWith("/app/login") || pathname.startsWith("/app/register");

  const [isAccessChecked, setIsAccessChecked] = useState(false)

  useEffect(() => {
    if (isAuthPage) {
        setIsAccessChecked(true);
        return;
    }

    const validateAccess = async () => {
      if (loading) return

      // Basic Auth Check
      if (!currentUser) {
        if (!pathname.startsWith("/app/login")) {
            router.push("/app/login")
        }
        return
      }

      // Maintenance Mode Check
      const isSuperAdmin = userData?.role === "super_admin"
      if (globalSettings?.maintenanceMode && !isSuperAdmin) {
         router.push("/maintenance")
         return
      }

      // Super Admin Redirect (Optional)
      if (isSuperAdmin && pathname === "/app") {
        router.push("/admin")
        return
      }

      // Bypass Check for Unrestricted Pages
      if (pathname === "/app/unauthorized" || pathname === "/app") {
          setIsAccessChecked(true)
          return
      }

      // Dynamic Route Permission Check — uses data already in AuthContext (no extra Firestore reads)
      try {
        const navigationData: NavGroup[] = globalSettings?.navigation || []
        const allNavItems = navigationData.flatMap(g => g.items || [])

        const currentItem = allNavItems
            .sort((a, b) => b.path.length - a.path.length)
            .find(item => pathname === item.path || pathname.startsWith(`${item.path}/`))

        if (!currentItem || !currentItem.feature) {
            setIsAccessChecked(true)
            return
        }

        const allowedFeatures: string[] = rolePermissions?.[userData?.role || ""] || []

        if (!allowedFeatures.includes(currentItem.feature)) {
            if (isSuperAdmin) {
                setIsAccessChecked(true)
                return
            }

            console.warn(`[Access Denied] User '${userData?.displayName}' tried to access '${pathname}'`)
            router.replace("/app/unauthorized")
            return
        }
      } catch (e) {
        console.error("Permission Check Failed", e)
      }

      setIsAccessChecked(true)
    }

    validateAccess()
  }, [currentUser, userData, globalSettings, loading, pathname, router, isAuthPage]) // Added isAuthPage dependency

  if (isAuthPage) {
    return <main className="h-screen w-full bg-slate-50">{children}</main>;
  }

  // Loading State (Only for actual dashboard pages)
  if (loading || !isAccessChecked) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" />
                <span className="text-sm text-slate-500 font-medium">Verifying access...</span>
            </div>
        </div>
    )
  }

  // Main Dashboard Layout
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50/50">
        
        <DashboardSidebar />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
           
           {globalSettings?.maintenanceMode && (
             <div className="bg-yellow-500 text-white text-xs font-bold text-center py-1 px-4 flex items-center justify-center gap-2 z-50">
               <AlertTriangle className="h-3 w-3" />
               MAINTENANCE MODE ACTIVE (System is locked for standard users)
             </div>
           )}

           <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
              <div className="flex items-center gap-4">
                  <SidebarTrigger className="-ml-2" />
                  
                  <div className="relative hidden md:block w-96">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Search jobs, clients, or tasks..." 
                        className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#1C4D8D]" 
                      />
                  </div>
              </div>

              <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-[#1C4D8D]">
                      <Bell className="h-5 w-5" />
                      <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8 border border-slate-200">
                                <AvatarImage src={userData?.photoURL || ""} alt={userData?.displayName || ""} />
                                <AvatarFallback className="bg-[#1C4D8D] text-white">
                                    {(userData?.displayName || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userData?.displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/app/profile/user')}>
                            <User className="mr-2 h-4 w-4" /> Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/app/profile/settings')}>
                            <ShieldAlert className="mr-2 h-4 w-4" /> Profile Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={logout}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
           </header>

           <div className="flex-1 overflow-y-auto scroll-smooth p-8">
             <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300"/></div>}>
                {children}
             </Suspense>
           </div>

        </main>
      </div>
    </SidebarProvider>
  )
}