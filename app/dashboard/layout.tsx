"use client"

import type React from "react"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Bell, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthGate()
  const router = useRouter()

  useEffect(() => {
    if (!currentUser) {
      router.push("/")
    } else if (currentUser.role === "super_admin") {
      router.push("/admin")
    }
  }, [currentUser, router])

  if (!currentUser) return null

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50/50">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger />
              <div className="relative max-w-md w-full hidden md:block">
                <Suspense fallback={null}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search projects, gear, crew..." className="pl-9 h-9 bg-slate-50 border-none" />
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
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
