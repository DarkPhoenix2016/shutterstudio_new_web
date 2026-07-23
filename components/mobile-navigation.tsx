"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, MobileNavItem } from "@/context/AuthContext"
import { getIcon } from "@/components/icons"
import { Plus } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

export function MobileNavigationBar() {
    const { globalSettings, rolePermissions, userData } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const [quickActionsOpen, setQuickActionsOpen] = useState(false)

    if (!globalSettings?.mobileNavigation?.enabled) return null
    if (!pathname.startsWith('/app')) return null

    const config = globalSettings.mobileNavigation
    const items = config.items || []

    const getItem = (pos: string) => items.find(i => i.position === pos)

    const left1 = getItem('left1')
    const left2 = getItem('left2')
    const center = getItem('center')
    const right1 = getItem('right1')
    const right2 = getItem('right2')

    // Evaluate quick actions dynamically based on roles
    const userRole = userData?.role || ""
    const currentFeatures = rolePermissions?.[userRole] || []
    const isSuperAdmin = userRole === "super_admin"
    const hasFeature = (f: string) => isSuperAdmin || currentFeatures.includes(f)

    const baseActions = [
       { id: "action_event", label: "Create Event", icon: "CalendarDays", route: "/app/events?action=new", feature: "event" },
       { id: "action_customer", label: "New Contact", icon: "User", route: "/app/phonebook/customers?action=new", feature: "customers" },
       { id: "action_task", label: "Create Task", icon: "CheckSquare", route: "/app/tasks?action=new", feature: "my_tasks" }
    ]

    const quickActions = baseActions.filter(a => hasFeature(a.feature))
    // Also include a fallback item just in case they don't have these specific features
    if (quickActions.length === 0) {
        quickActions.push({ id: "action_dash", label: "Dashboard", icon: "LayoutDashboard", route: "/app", feature: "" })
    }

    const handleActionClick = (route: string) => {
       setQuickActionsOpen(false)
       router.push(route)
    }

    const renderButton = (item?: MobileNavItem) => {
        if (!item) return <div className="w-16 h-14" />
        if (item.type === "quick_actions") return renderCenterFAB(item)
        
        const IconComponent = item.icon ? getIcon(item.icon) : getIcon("LayoutDashboard")
        const isActive = item.route 
          ? pathname === item.route || (item.route !== '/app' && item.route !== '/' && pathname.startsWith(`${item.route}/`)) 
          : false
        
        return (
           <button 
             onClick={() => item.route && router.push(item.route)}
             className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all",
                isActive ? "text-[#1C4D8D]" : "text-slate-400 hover:text-slate-600"
             )}
           >
             {IconComponent && <IconComponent className={cn("w-5 h-5", isActive && "fill-[#1C4D8D]/10")} />}
             <span className="text-[10px] font-medium tracking-wide truncate max-w-full px-1">{item.title}</span>
           </button>
        )
    }

    const renderCenterFAB = (item: MobileNavItem) => {
        return (
           <div className="relative z-[50]">
               <Drawer open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                  <DrawerTrigger asChild>
                     <button className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1C4D8D] text-white shadow-lg shadow-[#1C4D8D]/30 transition-transform active:scale-95 -mt-6 ring-4 ring-slate-50">
                        <Plus className={cn("w-6 h-6 transition-transform", quickActionsOpen && "rotate-45")} />
                     </button>
                  </DrawerTrigger>
                  <DrawerContent>
                     <div className="mx-auto w-full max-w-sm px-4 pb-8 pt-4">
                         <DrawerHeader className="px-0 pt-0 pb-4 text-left">
                            <DrawerTitle className="text-lg font-bold text-slate-800">Quick Actions</DrawerTitle>
                            <DrawerDescription>Create new entries quickly</DrawerDescription>
                         </DrawerHeader>
                         
                         <div className="grid grid-cols-2 gap-3">
                             {quickActions.map(action => {
                                const ActionIcon = getIcon(action.icon)
                                return (
                                   <button 
                                     key={action.id}
                                     onClick={() => handleActionClick(action.route)}
                                     className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-colors text-left"
                                   >
                                      <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
                                         <ActionIcon className="w-5 h-5 text-[#1C4D8D]" />
                                      </div>
                                      <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                                   </button>
                                )
                             })}
                         </div>
                     </div>
                  </DrawerContent>
               </Drawer>
           </div>
        )
    }

    return (
        <>
            <div className="md:hidden h-20 w-full shrink-0 bg-transparent" />
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-50 border-t border-slate-200 z-[40] flex items-center justify-between px-2 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                {renderButton(left1)}
                {renderButton(left2)}
                {renderButton(center)}
                {renderButton(right1)}
                {renderButton(right2)}
            </div>
        </>
    )
}
