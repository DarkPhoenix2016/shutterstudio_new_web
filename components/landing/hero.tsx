"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles, ShieldCheck, Gem, Layers } from "lucide-react"
import Image from "next/image"

interface HeroProps {
  onGetStartedClick: () => void // Opens Contact/Sales flow
}

export function Hero({ onGetStartedClick }: HeroProps) {
  return (
    // Changed: Dark theme section with relative positioning for background image
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950">
      
      {/* --- BACKGROUND IMAGE & OVERLAY --- */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1600494603989-96503707634e?q=80&w=2940&auto=format&fit=crop" // Placeholder: Moody Studio Setup
          alt="Professional photography studio background"
          fill
          className="object-cover opacity-40 grayscale-[30%]"
          priority
        />
        {/* Gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/50" />
        {/* Subtle texture mesh */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>


      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          
          {/* --- LEFT COLUMN: CONTENT --- */}
          <div className="space-y-8 max-w-2xl animate-fade-in-up">
            
            {/* Feature Badge (Updated messaging: Smart, not AI) */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-950/50 border border-blue-800/50 backdrop-blur-md text-blue-300">
              <Sparkles className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              <span className="text-sm font-medium tracking-wide">
                The new standard for <span className="text-white font-semibold">Smart Studio Workflows</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter text-white">
              Complete control over your
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                creative chaos.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl">
              Ditch the disconnected spreadsheets. Centralize bookings, gear tracking, crew assignments, and payments in one intelligent platform built for professionals.
            </p>

            {/* CTA Buttons (Updated actions) */}
            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <Button
                size="lg"
                onClick={onGetStartedClick}
                className="h-14 px-10 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)] border-0 transition-all rounded-xl"
              >
                Contact Sales
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                // Assuming you might have a demo route later, or this opens a video modal
                className="h-14 px-10 text-purple font-semibold border-slate-700 text-slate-200 hover:bg-slate-800/50 hover:text-white hover:border-blue-500/50 backdrop-blur-sm transition-all rounded-xl"
              >
                <Play className="mr-2 h-5 w-5 fill-current opacity-80" />
                See Interactive Demo
              </Button>
            </div>

            {/* Trust Indicators (Service focus) */}
            <div className="pt-8 border-t border-slate-800/50 flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Gem className="h-5 w-5 text-indigo-400" />
                <span>Tailored onboarding</span>
              </div>
            </div>
          </div>


          {/* --- RIGHT COLUMN: UNIQUE VISUALS (Glassmorphism Layering) --- */}
          <div className="relative hidden lg:block perspective-[2000px] translate-x-10">
             {/* Glow effect behind visuals */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -z-10"></div>
            
            {/* Layer 1: The Base Dashboard (Tilted backwards) */}
            <div className="relative transform rotateX(5deg) rotateY(-10deg) hover:rotateX(0) hover:rotateY(0) transition-all duration-700 ease-out">
              <div className="w-full h-[500px] bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6">
                 {/* Abstract Dashboard elements underneath */}
                 <div className="flex justify-between items-center mb-8 opacity-50">
                    <div className="h-8 w-40 bg-slate-700/50 rounded-md"></div>
                    <div className="flex gap-4"><div className="h-8 w-8 rounded-full bg-slate-700/50"></div><div className="h-8 w-8 rounded-full bg-slate-700/50"></div></div>
                 </div>
                 <div className="grid grid-cols-3 gap-4 opacity-40">
                    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                 </div>
              </div>

              {/* Layer 2: The "Floating Active Card" (Popping out closer) */}
              <div className="absolute top-[15%] -left-[10%] w-[110%] transform translateZ(50px) hover:translateZ(70px) transition-transform duration-500">
                 <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-2xl border-t border-l border-white/20 border-b border-r border-black/30 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-6 relative overflow-hidden">
                    {/* Decorative light leak */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                <Layers className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Upcoming Shoot: Fashion Editorial</h3>
                                <p className="text-slate-400 text-sm">Studio A • Oct 24, 10:00 AM</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20">Confirmed</span>
                    </div>

                    <div className="space-y-4">
                        <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Crew Assigned</span>
                            <div className="flex -space-x-2">
                                <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-slate-800"></div>
                                <div className="h-8 w-8 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                                <div className="h-8 w-8 rounded-full bg-slate-500 border-2 border-slate-800 flex items-center justify-center text-xs text-white">+2</div>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Gear Status</span>
                            <span className="text-blue-300 text-sm flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div> All reserved</span>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}