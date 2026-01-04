"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles } from "lucide-react"

interface HeroProps {
  onGetStartedClick: () => void
}

export function Hero({ onGetStartedClick }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#1C4D8D]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-[#4988C4]/10 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-[#BDE8F5]/30 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Now with AI-powered scheduling</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="text-primary">The Operating System for</span>
            <br />
            <span className="text-[#4988C4]">Modern Photography Studios</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage inventory, book clients, track finances, and coordinate your crew—all in one powerful platform built
            for creative professionals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={onGetStartedClick}
              className="text-base bg-primary hover:bg-primary/90 shadow-lg text-white"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base border-2 border-primary/20 hover:border-primary hover:bg-muted bg-transparent text-primary"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-[#BDE8F5]/30 blur-3xl rounded-full" />
          <div className="relative bg-white border-2 border-border rounded-2xl shadow-2xl p-8 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-[#1C4D8D]/10 rounded-lg animate-pulse" />
              <div className="h-20 bg-[#4988C4]/10 rounded-lg animate-pulse delay-75" />
              <div className="h-20 bg-[#BDE8F5]/40 rounded-lg animate-pulse delay-150" />
              <div className="col-span-2 h-32 bg-[#1C4D8D]/5 rounded-lg animate-pulse delay-200" />
              <div className="h-32 bg-[#4988C4]/5 rounded-lg animate-pulse delay-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
