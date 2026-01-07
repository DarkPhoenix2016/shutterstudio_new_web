"use client"

import StudioHeader from "@/components/studio/StudioHeader"
import StudioAbout from "@/components/studio/StudioAbout"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function StudioProfilePage() {
  const { userData } = useAuth()
  
    return (
    <div className="min-h-screen bg-slate-50/50 pb-10">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <StudioHeader />

       {/* Content */}
        <div className="grid grid-cols-1">
            <StudioAbout />
        </div>
      </div>
    </div>
  )
}