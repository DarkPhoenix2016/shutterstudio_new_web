"use client"

import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Grid,
  Banknote,
  Camera,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  UserCog,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext" // [!code highlight] Switch to AuthContext
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

// Define simpler type for navigation structure
type NavGroup = {
  label: string
  items: { icon: any; label: string; path: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: CalendarDays, label: "Calendar", path: "/dashboard/calendar" },
      { icon: CheckSquare, label: "Tasks / My Work", path: "/dashboard/tasks" },
    ],
  },
  {
    label: "CLIENT & SALES",
    items: [
      { icon: MessageSquare, label: "Consultation", path: "/dashboard/consultation" },
      { icon: Grid, label: "Catalog", path: "/dashboard/catalog" },
      { icon: Banknote, label: "Payments", path: "/dashboard/payments" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { icon: Camera, label: "Inventory", path: "/dashboard/inventory" },
      { icon: Users, label: "Crew", path: "/dashboard/crew" },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [{ icon: Settings, label: "Settings", path: "/dashboard/settings" }],
  },
]

export function DashboardSidebar() {
  // [!code highlight] Access data directly from Context
  const { currentUser, userData, studioData, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/dashboard/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  // Helper to format role (e.g., "studio_manager" -> "Studio Manager")
  const formatRole = (role?: string) => {
    if (!role) return "Staff"
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "SS"
  }

  // Display Variables
  const studioName = studioData?.name || "Lumina Photography"
  const studioLogo = studioData?.logo_url
  
  const userName = userData?.displayName || userData?.name || currentUser?.email?.split("@")[0] || "User"
  const userRole = userData?.role || "crew"
  const userPhoto = userData?.photoURL || userData?.profileImage

  return (
    <Sidebar className="border-r-0 bg-[#0F2854] text-white">
      {/* --- HEADER: Studio Details --- */}
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
               {/* Show Studio Logo if available, else fallback icon */}
               {studioLogo ? (
                  <img src={studioLogo} alt="Studio Logo" className="h-full w-full object-cover" />
               ) : (
                  <Camera className="h-5 w-5 text-[#BDE8F5]" />
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              {/* Show Studio Name */}
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

      {/* --- CONTENT: Navigation --- */}
      <SidebarContent className="px-3">
        {NAV_GROUPS.map((group, groupIdx) => {
          return (
            <SidebarGroup key={group.label} className={cn(groupIdx !== 0 && "mt-4")}>
              <SidebarGroupLabel className="text-[#4988C4] text-[10px] font-bold tracking-widest px-3 mb-2">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.path
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
                            <item.icon
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
          )
        })}
      </SidebarContent>

      {/* --- FOOTER: User Profile --- */}
      <SidebarFooter className="p-4 mt-auto">
        <SidebarSeparator className="bg-white/10 mb-4" />
        
        {/* Profile Card */}
        <div 
          onClick={() => router.push('/dashboard/settings')} // Optional: Link to user settings
          className="flex items-center gap-3 px-2 mb-2 group/profile cursor-pointer hover:bg-white/5 p-2 rounded-md transition-colors"
        >
          <Avatar className="h-9 w-9 border border-white/10">
            {/* [!code highlight] Safe check for userPhoto */}
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

        {/* Logout Button */}
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