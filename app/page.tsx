"use client"

import { useRouter } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"
import { ProblemSolution } from "@/components/landing/problem-solution"
import { HowItWorks } from "@/components/landing/how-it-works"
import { WhyUs } from "@/components/landing/why-us"
import { CTASection } from "@/components/landing/cta-section"

export default function LandingPage() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/app/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      <Navbar />
      <main>
        <Hero onGetStartedClick={handleGetStarted} />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <WhyUs />
        <Pricing onGetStartedClick={handleGetStarted} />
        <CTASection onGetStartedClick={handleGetStarted} />
      </main>
      <Footer />
    </div>
  )
}