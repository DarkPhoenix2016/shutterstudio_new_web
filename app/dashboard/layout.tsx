"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useAuth } from "@/context/AuthContext" // Changed from useAuthGate to useAuth for better control
import { useRouter, usePathname } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Bell, Search, User, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, userData, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === "/dashboard/login"

  useEffect(() => {
    if (!loading) {
      // 1. Not logged in AND not on login page? -> Go to Login
      if (!currentUser && !isLoginPage) {
        // Redirect to /dashboard/login instead of home "/" so they can actually log in
        router.push("/dashboard/login") 
        return
      }

      // 2. Logged in as Super Admin? -> Redirect to Admin Portal
      // (Optional: depending on if you want admins to see the user dashboard)
      if (currentUser && userData?.role === "super_admin") {
        router.push("/admin")
        return
      }

      // 3. Logged in AND on login page? -> Go to Dashboard
      if (currentUser && isLoginPage) {
        router.push("/dashboard")
      }
    }
  }, [currentUser, userData, loading, isLoginPage, router])

  // Show loading spinner to prevent "flash" of content or premature redirects
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // SCENARIO 1: Login Page
  // Return ONLY the children (Login Form) without the Sidebar/Header
  if (isLoginPage) {
    return <main className="min-h-screen w-full">{children}</main>
  }

  // SCENARIO 2: Protected Content
  // If not logged in (and not on login page), return null while redirect happens
  if (!currentUser) return null

  // SCENARIO 3: The Actual Dashboard UI
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50/50">
        <DashboardSidebar />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger />
              <div className="relative max-w-md w-full hidden md:block">
                <Suspense fallback={null}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search projects, gear, crew..." 
                    className="pl-9 h-9 bg-slate-50 border-none" 
                  />
                </Suspense>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <User className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}