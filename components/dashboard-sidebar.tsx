"use client"

import { useMemo } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// [!code highlight] Import Icons for Mapping
import {
  LayoutDashboard, CalendarDays, CheckSquare, MessageSquare, Grid, Banknote,
  Camera, Users, Settings, LogOut, ChevronRight, UserCog, PieChart, Layers, 
  User, FileText, ShoppingCart, CreditCard, Box
} from "lucide-react"

// [!code highlight] Icon Map: String -> Component
const ICON_MAP: Record<string, any> = {
  LayoutDashboard, CalendarDays, CheckSquare, MessageSquare, Grid, Banknote,
  Camera, Users, Settings, UserCog, PieChart, Layers, User, FileText, 
  ShoppingCart, CreditCard, Box,
  // Add fallbacks or extra icons here as needed
}

export function DashboardSidebar() {
  // Access Settings & Permissions from Context
  const { currentUser, userData, studioData, logout, globalSettings, rolePermissions } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/app/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  // Helper to format role
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

  // Filtering Logic
  const navStructure = useMemo(() => {
    if (!userData || !rolePermissions || !globalSettings?.navigation) return []

    const userRole = userData.role
    const allowedFeatures = rolePermissions[userRole] || []

    // If Super Admin, show everything, otherwise check permissions
    const isSuperAdmin = userRole === "super_admin"

    return globalSettings.navigation.map(group => {
      // Filter items inside the group
      const validItems = group.items.filter(item => {
        // If no feature is defined on the item, assume public/allowed
        if (!item.feature) return true
        
        // Check if user has the specific feature permission
        return isSuperAdmin || allowedFeatures.includes(item.feature)
      })

      return { ...group, items: validItems }
    }).filter(group => group.items.length > 0) // Remove empty groups

  }, [userData, rolePermissions, globalSettings])

  // Display Variables
  const studioName = studioData?.name || "ShutterStudio"
  const studioLogo = studioData?.logo_url
  const userName = userData?.displayName || userData?.name || currentUser?.email?.split("@")[0] || "User"
  const userRole = userData?.role || "crew"
  const userPhoto = userData?.photoURL || userData?.profileImage || userData?.photoURL

  return (
    <Sidebar className="border-r-0 bg-[#0F2854] text-white">
      {/* --- HEADER: Studio Details --- */}
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
               {studioLogo ? (
                  <img src={studioLogo} alt="Studio Logo" className="h-full w-full object-cover" />
               ) : (
                  <Camera className="h-5 w-5 text-[#BDE8F5]" />
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold truncate leading-tight text-white">
                 {studioName}
              </span>
              <span className="text-[10px] text-[#4988C4] font-bold uppercase tracking-widest">
                 PRO LICENSE
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-[#BDE8F5]/10 text-[#BDE8F5] border-[#BDE8F5]/20 text-[10px] py-0 px-1.5"
          >
            v2.0
          </Badge>
        </div>
      </SidebarHeader>

      {/* --- CONTENT: Dynamic Navigation --- */}
      <SidebarContent className="px-3">
        {navStructure.map((group, groupIdx) => (
            <SidebarGroup key={group.id || group.label} className={cn(groupIdx !== 0 && "mt-4")}>
              <SidebarGroupLabel className="text-[#4988C4] text-[10px] font-bold tracking-widest px-3 mb-2 uppercase">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`)
                    // Resolve Icon Component
                    const IconComponent = ICON_MAP[item.icon] || Camera 

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={cn(
                            "h-10 px-3 transition-all duration-200 group relative",
                            isActive
                              ? "bg-[#1C4D8D] text-white font-medium"
                              : "text-white/70 hover:text-white hover:bg-[#1e3a6e]",
                          )}
                        >
                          <button onClick={() => router.push(item.path)} className="w-full flex items-center gap-3">
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#BDE8F5]" />}
                            <IconComponent
                              className={cn("h-4 w-4 shrink-0", isActive ? "text-[#BDE8F5]" : "text-white/40")}
                            />
                            <span className="truncate">{item.label}</span>
                            {isActive && <ChevronRight className="ml-auto h-3 w-3 text-[#BDE8F5]/50" />}
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
        ))}
      </SidebarContent>

      {/* --- FOOTER: User Profile --- */}
      <SidebarFooter className="p-4 mt-auto">
        <SidebarSeparator className="bg-white/10 mb-4" />
        
        <div 
          onClick={() => router.push('/app/profile/user')} 
          className="flex items-center gap-3 px-2 mb-2 group/profile cursor-pointer hover:bg-white/5 p-2 rounded-md transition-colors"
        >
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarImage src={userPhoto || undefined} alt={userName} />
            <AvatarFallback className="bg-[#1C4D8D] text-white text-xs">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate text-white">
              {userName}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#4988C4] font-bold uppercase tracking-wider truncate">
                {formatRole(userRole)}
              </span>
            </div>
          </div>
          <UserCog className="w-4 h-4 text-white/20 group-hover/profile:text-white/80 transition-colors" />
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 text-xs text-white/50 hover:text-white hover:bg-red-500/10 rounded transition-colors group"
        >
          <LogOut className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span>Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}