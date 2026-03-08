"use client"

import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users,
  UserPlus,
  CreditCard,
  Settings,
  ScrollText,
  LogOut,
  Camera,
  UserCog,
  ReceiptText,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const NAV_ITEMS = {
  overview: [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { id: "analytics", icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    
  ],
  tenantManagement: [
    { id: "studios", icon: Building2, label: "Studios", path: "/admin/studios" },
    { id: "directory", icon: Users, label: "User Directory", path: "/admin/directory" },
    { id: "billing", icon: ReceiptText, label: "Billing", path: "/admin/billing" },
  ],
  platformConfig: [
    { id: "subscriptions", icon: CreditCard, label: "Subscriptions & Plans", path: "/admin/subscriptions" },
    { id: "settings", icon: Settings, label: "Global Settings", path: "/admin/settings" },
    { id: "audit", icon: ScrollText, label: "Audit Logs", path: "/admin/audit" },
  ],
}

export function AdminSidebar() {
  const { currentUser, userData, logout } = useAuth()
  
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      // 1. Clear Firebase Session
      await logout()
      // 2. Redirect
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "AD"
  }

  const displayName = userData?.name || userData?.displayName || "Admin User"
  const displayEmail = userData?.email || currentUser?.email || "admin@shutterstudio.com"
  const displayImage = userData?.profileImage || userData?.photoURL

  return (
    <Sidebar className="border-r border-border/50 bg-[#0F2854]">
      {/* HEADER */}
      <SidebarHeader className="p-4 border-b border-[#1C4D8D]/30 bg-[#0F2854]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#1C4D8D] to-[#4988C4] rounded-lg p-2 shadow-lg">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold truncate text-white text-lg">ShutterStudio</span>
              <span className="text-[10px] text-[#BDE8F5] truncate uppercase tracking-wider font-semibold">v2.0.1</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="bg-[#0F2854] py-4">
        {/* GROUP 1: OVERVIEW */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#4988C4] text-[10px] uppercase tracking-widest font-bold px-3 mb-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.overview.map((item) => {
                const isActive = pathname === item.path
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200 mx-2 rounded-lg",
                        isActive
                          ? "bg-[#1C4D8D] text-white font-semibold shadow-sm"
                          : "text-[#BDE8F5] hover:text-white hover:bg-[#1C4D8D]/50",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-[#BDE8F5]")} />
                        <span>{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 2: TENANT MANAGEMENT */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[#4988C4] text-[10px] uppercase tracking-widest font-bold px-3 mb-2">
            Tenant Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.tenantManagement.map((item) => {
                const isActive = pathname === item.path
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200 mx-2 rounded-lg",
                        isActive
                          ? "bg-[#1C4D8D] text-white font-semibold shadow-sm"
                          : "text-[#BDE8F5] hover:text-white hover:bg-[#1C4D8D]/50",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-[#BDE8F5]")} />
                        <span>{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 3: PLATFORM CONFIG */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[#4988C4] text-[10px] uppercase tracking-widest font-bold px-3 mb-2">
            Platform Config
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.platformConfig.map((item) => {
                const isActive = pathname === item.path
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200 mx-2 rounded-lg",
                        isActive
                          ? "bg-[#1C4D8D] text-white font-semibold shadow-sm"
                          : "text-[#BDE8F5] hover:text-white hover:bg-[#1C4D8D]/50",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-[#BDE8F5]")} />
                        <span>{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER - USER PROFILE */}
      <SidebarFooter className="p-4 border-t border-[#1C4D8D]/30 bg-[#0F2854]">
        {/* Clickable Profile Area */}
        <div 
          onClick={() => router.push('/admin/profile')}
          className="flex items-center gap-3 mb-3 px-2 py-2 -mx-2 rounded-lg cursor-pointer hover:bg-[#1C4D8D]/30 transition-colors group/profile"
        >
          <Avatar className="h-9 w-9 border border-[#4988C4]/50">
            {/* [!code highlight] Safe check for displayImage */}
            <AvatarImage src={displayImage || undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-[#1C4D8D] to-[#4988C4] text-white font-bold text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="flex items-center gap-2">
               <span className="text-sm font-semibold text-white truncate group-hover/profile:text-[#BDE8F5] transition-colors">
                 {displayName}
               </span>
               <UserCog className="w-3 h-3 text-[#BDE8F5]/50 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-[#BDE8F5]/70 truncate" title={displayEmail}>
              {displayEmail}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#BDE8F5] hover:text-white hover:bg-red-500/20 transition-all group border border-transparent hover:border-red-500/30"
        >
          <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          <span className="font-medium">Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}