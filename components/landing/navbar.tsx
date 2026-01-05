"use client"

import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import Link from "next/link"

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-muted bg-white/90 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-primary">ShutterStudio</span>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-primary text-white hover:bg-primary/90" asChild>
            <Link href="/dashboard/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
