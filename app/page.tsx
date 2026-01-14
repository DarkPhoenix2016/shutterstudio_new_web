"use client"

import { useRouter } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  const router = useRouter()

  // Central handler for all CTA buttons
  const handleGetStarted = () => {
    router.push("/dashboard/login")
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      
      {/* Navigation */}
      <Navbar />

      <main>
        {/* Hero Section */}
        <Hero onGetStartedClick={handleGetStarted} />
        
        {/* Features Grid */}
        <Features />
        
        {/* Dynamic Pricing Section (Fetches from Firestore) */}
        <Pricing onGetStartedClick={handleGetStarted} />
      </main>

      {/* Footer */}
      <Footer />
      
    </div>
  )
}