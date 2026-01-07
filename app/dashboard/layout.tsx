"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Bell, Search, User, Loader2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, userData, globalSettings, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === "/dashboard/login"

  useEffect(() => {
    if (!loading) {
      // 1. Maintenance Mode Check
      // If maintenance is ON, and user is NOT a super_admin, kick them to maintenance page
      if (globalSettings?.maintenanceMode && userData?.role !== "super_admin" && userData?.role !== "admin") {
         router.push("/maintenance")
         return
      }

      // 2. Standard Auth Checks
      if (!currentUser && !isLoginPage) {
        router.push("/dashboard/login") 
        return
      }

      if (currentUser && userData?.role === "super_admin") {
        router.push("/admin")
        return
      }

      if (currentUser && isLoginPage) {
        router.push("/dashboard")
      }
    }
  }, [currentUser, userData, globalSettings, loading, isLoginPage, router])

  if (loading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  if (isLoginPage) return <main className="min-h-screen w-full">{children}</main>

  if (!currentUser) return null

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50/50">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
           {/* Show a banner if Maintenance is ON but user (SuperAdmin) can still see dashboard */}
           {globalSettings?.maintenanceMode && (
             <div className="bg-yellow-500 text-white text-xs font-bold text-center py-1 px-4 flex items-center justify-center gap-2">
               <AlertTriangle className="h-3 w-3" />
               SYSTEM IS CURRENTLY IN MAINTENANCE MODE (Visible only to Admins)
             </div>
           )}
           
           {/* ... (Rest of Header and Content) ... */}
           {/* (Paste your existing Header code here) */}
           <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}