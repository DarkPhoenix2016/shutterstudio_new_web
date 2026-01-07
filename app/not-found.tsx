import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
      
      {/* 404 Image */}
      <div className="relative w-64 h-64 mb-8 md:w-96 md:h-96">
        <Image 
          src="/images/background/404.svg" 
          alt="Page Not Found" 
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Text Content */}
      <h1 className="text-4xl font-bold text-[#0F2854] mb-2">
        Page Not Found
      </h1>
      
      <p className="text-muted-foreground mb-8 max-w-md">
        Oops! The page you are looking for doesn't exist. It might have been moved or deleted.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
               
        <Button asChild className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 gap-2 text-white">
          <Link href="/app">
            <Home className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Footer / Copyright (Optional) */}
      <div className="mt-12 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} ShutterStudio Photography Platform
      </div>
    </div>
  )
}