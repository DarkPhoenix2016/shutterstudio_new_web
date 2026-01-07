import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Wrench } from "lucide-react"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative w-512 h-512 mx-auto">
          {/* Ensure this image exists in your public folder as requested */}
          <Image 
            src="/images/background/maintenance.svg" 
            alt="Under Maintenance" 
            fill
            className="object-contain"
            priority
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#0F2854]">System Under Maintenance</h1>
          <p className="text-slate-600">
            We are currently performing scheduled upgrades to the ShutterStudio platform. 
            Access to the dashboard is temporarily paused.
          </p>
        </div>

        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-start gap-3 text-left">
          <Wrench className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">What does this mean?</p>
            <p className="opacity-90">Your data is safe. We will be back online shortly. Please check back in a few minutes.</p>
          </div>
        </div>

        <div className="pt-4">
           <Button variant="outline" asChild>
             <Link href="/">Return to Home</Link>
           </Button>
        </div>
      </div>
    </div>
  )
}