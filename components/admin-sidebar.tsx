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
    <Sidebar className="border-r border-border/50 bg-brand-dark">
      {/* HEADER */}
      <SidebarHeader className="p-4 border-b border-white/10 bg-brand-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-lg p-2 shadow-lg">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold truncate text-white text-lg">ShutterStudio</span>
              <span className="text-[10px] text-brand-accent truncate uppercase tracking-wider font-semibold">v2.0.1</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="bg-brand-dark py-4">
        {/* GROUP 1: OVERVIEW */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#82b0e6] text-[11px] uppercase tracking-widest font-bold px-3 mb-2 flex items-center">
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
                        "h-9 px-3 transition-all duration-200 mx-2 rounded-lg group",
                        isActive
                          ? "bg-brand-primary text-white font-semibold shadow-sm"
                          : "text-white/80 hover:text-white hover:bg-brand-dark-hover",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#bde8f5]" : "text-white/50 group-hover:text-white")} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 2: TENANT MANAGEMENT */}
        <SidebarGroup className="mt-5">
          <SidebarGroupLabel className="text-[#82b0e6] text-[11px] uppercase tracking-widest font-bold px-3 mb-2 flex items-center">
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
                        "h-9 px-3 transition-all duration-200 mx-2 rounded-lg group",
                        isActive
                          ? "bg-brand-primary text-white font-semibold shadow-sm"
                          : "text-white/80 hover:text-white hover:bg-brand-dark-hover",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#bde8f5]" : "text-white/50 group-hover:text-white")} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 3: PLATFORM CONFIG */}
        <SidebarGroup className="mt-5">
          <SidebarGroupLabel className="text-[#82b0e6] text-[11px] uppercase tracking-widest font-bold px-3 mb-2 flex items-center">
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
                        "h-9 px-3 transition-all duration-200 mx-2 rounded-lg group",
                        isActive
                          ? "bg-brand-primary text-white font-semibold shadow-sm"
                          : "text-white/80 hover:text-white hover:bg-brand-dark-hover",
                      )}
                    >
                      <button onClick={() => router.push(item.path)}>
                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#bde8f5]" : "text-white/50 group-hover:text-white")} />
                        <span className="text-sm font-medium">{item.label}</span>
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
      <SidebarFooter className="p-4 border-t border-white/10 bg-brand-dark">
        {/* Clickable Profile Area */}
        <div 
          onClick={() => router.push('/admin/profile')}
          className="flex items-center gap-3 mb-3 px-2 py-2 -mx-2 rounded-lg cursor-pointer hover:bg-brand-dark-hover transition-colors group/profile"
        >
          <Avatar className="h-9 w-9 border border-brand-primary/20">
            {/* [!code highlight] Safe check for displayImage */}
            <AvatarImage src={displayImage || undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-primary-hover text-white font-bold text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="flex items-center gap-2">
               <span className="text-sm font-semibold text-white truncate group-hover/profile:text-brand-accent transition-colors">
                 {displayName}
               </span>
               <UserCog className="w-3 h-3 text-brand-accent/50 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-brand-accent/70 truncate" title={displayEmail}>
              {displayEmail}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-brand-accent hover:text-white hover:bg-red-500/20 transition-all group border border-transparent hover:border-red-500/30"
        >
          <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          <span className="font-medium">Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}