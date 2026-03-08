//layout.tsx
"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar" // [!code highlight] Added imports
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // We need userData to check the role (admin vs user)
  const { currentUser, userData, loading } = useAuth()

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (!loading) {
      // 1. Not logged in? -> Go to Admin Login
      if (!currentUser && !isLoginPage) {
        router.push("/admin/login")
        return
      }

      // 2. Logged in, but NOT an admin? -> Go to User Dashboard
      // This protects the route from manual entry by standard users
      if (currentUser && userData && !isLoginPage) {
        if (userData.role !== "super_admin") {
          router.push("/app")
          return
        }
      }

      // 3. Logged in AS Admin, but on Login Page? -> Go to Admin Dashboard
      if (currentUser && isLoginPage) {
         // Double check role before redirecting to admin dashboard
         if ( userData?.role === "super_admin") {
            router.push("/admin")
         }
      }
    }
  }, [currentUser, userData, loading, isLoginPage, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium">Verifying access...</span>
        </div>
      </div>
    )
  }

  // SCENARIO 1: Login Page (No Sidebar, No Provider needed)
  if (isLoginPage) {
    return <main className="min-h-screen w-full">{children}</main>
  }

  // SCENARIO 2: Protected Admin Layout
  // If no user/userdata yet, return null while redirect happens
  if (!currentUser || !userData) return null

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Trigger for better UX on small screens */}
          <div className="p-4 md:hidden">
            <SidebarTrigger /> 
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
