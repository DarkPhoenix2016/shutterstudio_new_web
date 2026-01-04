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
} from "lucide-react"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { useStore, type Feature } from "@/lib/store"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

type NavGroup = {
  label: string
  items: { feature: Feature; icon: any; label: string; path: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { feature: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { feature: "calendar", icon: CalendarDays, label: "Calendar", path: "/dashboard/calendar" },
      { feature: "tasks", icon: CheckSquare, label: "Tasks / My Work", path: "/dashboard/tasks" },
    ],
  },
  {
    label: "CLIENT & SALES",
    items: [
      { feature: "consultation", icon: MessageSquare, label: "Consultation", path: "/dashboard/consultation" },
      { feature: "catalog", icon: Grid, label: "Catalog", path: "/dashboard/catalog" },
      { feature: "payments", icon: Banknote, label: "Payments", path: "/dashboard/payments" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { feature: "inventory", icon: Camera, label: "Inventory", path: "/dashboard/inventory" },
      { feature: "crew", icon: Users, label: "Crew", path: "/dashboard/crew" },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [{ feature: "settings", icon: Settings, label: "Settings", path: "/dashboard/settings" }],
  },
]

export function DashboardSidebar() {
  const { canAccess, currentUser, studio } = useAuthGate()
  const setCurrentUser = useStore((state) => state.setCurrentUser)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    setCurrentUser(null)
    router.push("/")
  }

  const userInitials = currentUser?.email
    .split("@")[0]
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Sidebar className="border-r-0 bg-[#0F2854] text-white">
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              <Camera className="h-5 w-5 text-[#BDE8F5]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold truncate leading-tight">{studio?.name || "Lumina Photography"}</span>
              <span className="text-[10px] text-[#4988C4] font-bold uppercase tracking-widest">STUDIO</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-[#BDE8F5]/10 text-[#BDE8F5] border-[#BDE8F5]/20 text-[10px] py-0 px-1.5"
          >
            PRO
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {NAV_GROUPS.map((group, groupIdx) => {
          // Filter items based on access logic
          const accessibleItems = group.items.filter((item) => canAccess(item.feature))
          if (accessibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label} className={cn(groupIdx !== 0 && "mt-4")}>
              <SidebarGroupLabel className="text-[#4988C4] text-[10px] font-bold tracking-widest px-3 mb-2">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accessibleItems.map((item) => {
                    const isActive = pathname === item.path
                    return (
                      <SidebarMenuItem key={item.feature}>
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

      <SidebarFooter className="p-4 mt-auto">
        <SidebarSeparator className="bg-white/10 mb-4" />
        <div className="flex items-center gap-3 px-2 mb-2">
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarFallback className="bg-[#1C4D8D] text-white text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{currentUser?.email.split("@")[0]}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#4988C4] font-bold uppercase tracking-wider">
                {currentUser?.role.split("_")[1] || "ADMIN"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 text-xs text-white/50 hover:text-white transition-colors group"
        >
          <LogOut className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span>Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}
