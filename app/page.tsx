"use client"

import { useState } from "react"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { LoginModal } from "@/components/login-modal"

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const handleGetStarted = () => {
    setIsLoginOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSignInClick={() => setIsLoginOpen(true)} onGetStartedClick={handleGetStarted} />
      <Hero onGetStartedClick={handleGetStarted} />
      <Features />
      <Pricing onGetStartedClick={handleGetStarted} />
      <LoginModal open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  )
}
