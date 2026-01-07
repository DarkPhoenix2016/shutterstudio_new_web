"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard, ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] bg-slate-50/50 px-4 text-center animate-in fade-in zoom-in duration-300">
      
      {/* 403 Illustration */}
      <div className="relative w-64 h-64 mb-6 md:w-80 md:h-80">
        {/* Ensure you add this image to your public folder: public/images/backgrounds/403.svg */}
        <Image 
          src="/images/backgrounds/403.svg" 
          alt="Access Restricted" 
          fill
          className="object-contain drop-shadow-sm"
          priority
        />
      </div>

      {/* Message Content */}
      <div className="space-y-3 max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-[#0F2854] flex items-center justify-center gap-3">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          Access Denied
        </h1>
        
        <p className="text-slate-600 leading-relaxed">
          You do not have the required permissions to view this module. <br/>
          This area is restricted to specific roles within your studio.
        </p>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mt-4">
          <strong>Tip:</strong> If you believe this is an error, please contact your Studio Manager to update your role permissions in <em>Settings &gt; Roles</em>.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
        
        <Button asChild className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 gap-2 text-white shadow-md">
          <Link href="/app">
            <LayoutDashboard className="h-4 w-4" /> Dashboard Home
          </Link>
        </Button>
      </div>
    </div>
  )
}