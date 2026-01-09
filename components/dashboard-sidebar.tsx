"use client"

import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Import Icons
import {
  LayoutDashboard, CalendarDays, CheckSquare, MessageSquare, Grid, Banknote,
  Camera, Users, Settings, LogOut, ChevronRight, UserCog, PieChart, Layers, 
  User, FileText, ShoppingCart, CreditCard, Box, ChevronDown
} from "lucide-react"

// Icon Map
const ICON_MAP: Record<string, any> = {
  LayoutDashboard, CalendarDays, CheckSquare, MessageSquare, Grid, Banknote,
  Camera, Users, Settings, UserCog, PieChart, Layers, User, FileText, 
  ShoppingCart, CreditCard, Box,
}

export function DashboardSidebar() {
  const { currentUser, userData, studioData, logout, globalSettings, rolePermissions } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // State for the single currently open group
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/app/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  const formatRole = (role?: string) => {
    if (!role) return "Staff"
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "SS"
  }

  const navStructure = useMemo(() => {
    if (!userData || !rolePermissions || !globalSettings?.navigation) return []

    const userRole = userData.role
    const allowedFeatures = rolePermissions[userRole] || []
    const isSuperAdmin = userRole === "super_admin"

    return globalSettings.navigation.map(group => {
      const validItems = group.items.filter(item => {
        if (!item.feature) return true
        return isSuperAdmin || allowedFeatures.includes(item.feature)
      })
      return { ...group, items: validItems }
    }).filter(group => group.items.length > 0) 

  }, [userData, rolePermissions, globalSettings])

  // --- HELPER: Determine if an item is active ---
  const isItemActive = (itemPath: string, currentPath: string) => {
     // 1. Exact match always wins
     if (currentPath === itemPath) return true;
     
     // 2. Sub-path match (e.g. /events/new matches /events), 
     // BUT ignore root paths like "/app" or "/" to prevent them from matching everything.
     if (itemPath !== '/app' && itemPath !== '/' && currentPath.startsWith(`${itemPath}/`)) {
        return true;
     }
     return false;
  }

  // Logic: Only expand the group containing the current path
  useEffect(() => {
    if (navStructure.length > 0) {
      const activeGroup = navStructure.find(group => 
        group.items.some(item => isItemActive(item.path, pathname))
      )
      
      if (activeGroup) {
        setOpenGroupLabel(activeGroup.label)
      }
    }
  }, [pathname, navStructure])

  // Display Variables
  const studioName = studioData?.name || "ShutterStudio"
  const studioLogo = studioData?.logo_url
  const userName = userData?.displayName || userData?.name || currentUser?.email?.split("@")[0] || "User"
  const userRole = userData?.role || "crew"
  const userPhoto = userData?.photoURL || userData?.profileImage || userData?.photoURL

  return (
    <Sidebar className="border-r-0 bg-[#0F2854] text-white">
      {/* --- HEADER --- */}
      <SidebarHeader className="p-4 pb-2"> 
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
               {studioLogo ? (
                  <img src={studioLogo} alt="Studio Logo" className="h-full w-full object-cover" />
               ) : (
                  <Camera className="h-5 w-5 text-[#BDE8F5]" />
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold truncate leading-none text-sm text-white mb-0.5">
                 {studioName}
              </span>
              <span className="text-[9px] text-[#4988C4] font-bold uppercase tracking-widest leading-none">
                 PRO LICENSE
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-[#BDE8F5]/10 text-[#BDE8F5] border-[#BDE8F5]/20 text-[9px] h-5 px-1"
          >
            v2.0
          </Badge>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      {/* Increased top padding (pt-6) to separate header from first category */}
      <SidebarContent className="px-2 pt-6 scrollbar-thin scrollbar-thumb-white/10 gap-0">
        {navStructure.map((group) => (
            <Collapsible 
              key={group.id || group.label} 
              open={openGroupLabel === group.label} 
              onOpenChange={(isOpen) => {
                setOpenGroupLabel(isOpen ? group.label : null)
              }}
              className="group/collapsible"
            >
              <SidebarGroup className="py-0">
                <SidebarGroupLabel asChild className="group/label text-[#4988C4] hover:text-white hover:bg-white/5 cursor-pointer text-[10px] font-bold tracking-widest px-2 h-8 mb-0.5 uppercase flex items-center">
                  <CollapsibleTrigger>
                    {group.label}
                    <ChevronDown className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                
                <CollapsibleContent className="pb-1">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {group.items.map((item) => {
                        // [!code highlight] Use the stricter helper function
                        const isActive = isItemActive(item.path, pathname);
                        const IconComponent = ICON_MAP[item.icon] || Camera 

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={cn(
                                "h-8 px-2.5 transition-all duration-200 group relative",
                                isActive
                                  ? "bg-[#1C4D8D] text-white font-medium shadow-sm"
                                  : "text-white/70 hover:text-white hover:bg-[#1e3a6e]",
                              )}
                            >
                              <button onClick={() => router.push(item.path)} className="w-full flex items-center gap-2.5">
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#BDE8F5]" />}
                                <IconComponent
                                  className={cn("h-4 w-4 shrink-0", isActive ? "text-[#BDE8F5]" : "text-white/40")}
                                />
                                <span className="truncate text-xs">{item.label}</span>
                                {isActive && <ChevronRight className="ml-auto h-3 w-3 text-[#BDE8F5]/50" />}
                              </button>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
        ))}
      </SidebarContent>

      {/* --- FOOTER: User Profile --- */}
      <SidebarFooter className="p-3 mt-auto">
        <SidebarSeparator className="bg-white/10 mb-2" />
        
        <div 
          onClick={() => router.push('/app/profile/user')} 
          className="flex items-center gap-2.5 px-2 mb-1 group/profile cursor-pointer hover:bg-white/5 p-1.5 rounded-md transition-colors"
        >
          <Avatar className="h-8 w-8 border border-white/10">
            <AvatarImage src={userPhoto || undefined} alt={userName} />
            <AvatarFallback className="bg-[#1C4D8D] text-white text-[10px]">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium truncate text-white">
              {userName}
            </span>
            <span className="text-[9px] text-[#4988C4] font-bold uppercase tracking-wider truncate">
              {formatRole(userRole)}
            </span>
          </div>
          <UserCog className="w-3.5 h-3.5 text-white/20 group-hover/profile:text-white/80 transition-colors" />
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-white/50 hover:text-white hover:bg-red-500/10 rounded transition-colors group"
        >
          <LogOut className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span>Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}