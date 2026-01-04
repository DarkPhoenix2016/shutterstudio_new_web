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
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
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

const NAV_ITEMS = {
  overview: [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { id: "analytics", icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  ],
  tenantManagement: [
    { id: "studios", icon: Building2, label: "Studios", path: "/admin/studios" },
    { id: "directory", icon: Users, label: "User Directory", path: "/admin/directory" },
    { id: "onboarding", icon: UserPlus, label: "Onboarding Requests", path: "/admin/onboarding" },
  ],
  platformConfig: [
    { id: "subscriptions", icon: CreditCard, label: "Subscriptions & Plans", path: "/admin/subscriptions" },
    { id: "settings", icon: Settings, label: "Global Settings", path: "/admin/settings" },
    { id: "audit", icon: ScrollText, label: "Audit Logs", path: "/admin/audit" },
  ],
}

export function AdminSidebar() {
  const setCurrentUser = useStore((state) => state.setCurrentUser)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    setCurrentUser(null)
    router.push("/")
  }

  return (
    <Sidebar className="border-r border-border/50 bg-[#0F2854]">
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

      <SidebarFooter className="p-4 border-t border-[#1C4D8D]/30 bg-[#0F2854]">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1C4D8D] to-[#4988C4] flex items-center justify-center text-white font-bold text-sm shadow-md">
            RA
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-semibold text-white truncate">Root Admin</span>
            <span className="text-[10px] text-[#BDE8F5]/70 truncate">admin@shutterstudio.com</span>
          </div>
        </div>
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
