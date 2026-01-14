"use client"

import { useRouter } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"
// Import new sections
import { ProblemSolution } from "@/components/landing/problem-solution"
import { HowItWorks } from "@/components/landing/how-it-works"
import { WhyUs } from "@/components/landing/why-us"
import { CTASection } from "@/components/landing/cta-section"

export default function LandingPage() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/dashboard/login")
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      
      {/* 1. Navbar */}
      <Navbar />

      <main>
        {/* 2. Hero */}
        <Hero onGetStartedClick={handleGetStarted} />
        
        {/* 3. Problem -> Solution */}
        <ProblemSolution />
        
        {/* 4. Features */}
        <Features />
        
        {/* 5. How It Works */}
        <HowItWorks />
        
        {/* 6. Why ShutterStudio / Security (Merged for flow) */}
        <WhyUs />

        {/* 7. Pricing */}
        <Pricing onGetStartedClick={handleGetStarted} />
        
        {/* 8. Final CTA (Distinct from Footer) */}
        <CTASection onGetStartedClick={handleGetStarted} />
      </main>

      {/* 9. Footer */}
      <Footer />
      
    </div>
  )
}