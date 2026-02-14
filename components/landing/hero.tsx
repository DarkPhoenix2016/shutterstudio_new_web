"use client"

import { MouseParallax } from "@/components/ui/mouse-parallax"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { ArrowRight, Gem, Layers, ShieldCheck, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface HeroProps {
  onGetStartedClick: () => void
}

export function Hero({ onGetStartedClick }: HeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950 pt-20">
      
      {/* Background Image & Overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1600494603989-96503707634e?q=80&w=2940&auto=format&fit=crop"
          alt="Studio Background"
          fill
          className="object-cover opacity-30 grayscale-[20%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-900/60" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT: Text Content */}
          <div className="space-y-8 max-w-2xl">
            <ScrollReveal direction="down" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-950/50 border border-blue-800/50 backdrop-blur-md text-blue-300">
                <Sparkles className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                <span className="text-sm font-medium tracking-wide">
                  The new standard for <span className="text-white font-semibold">Smart Studio Workflows</span>
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter text-white">
                Complete control over your
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                  creative chaos.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl">
                Ditch the disconnected spreadsheets. Centralize bookings, gear tracking, crew assignments, and payments in one intelligent platform.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-5 pt-4">

                <Link 
                  href="/contact" 
                  className="inline-flex h-12  items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5"
                >
                  Contact Sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                {/*
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
                  className="h-14 px-10 text-base font-semibold border-slate-700 text-blue-600 hover:bg-slate-800/50 hover:text-white hover:border-blue-500/50 backdrop-blur-sm transition-all rounded-xl"
                >
                  <Play className="mr-2 h-5 w-5 fill-current opacity-80" />
                  See Interactive Demo
                </Button>
                */}
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.5}>
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
            </ScrollReveal>
          </div>

          {/* RIGHT: 3D Floating Dashboard */}
          <div className="relative hidden lg:block perspective-[2000px] h-[600px] w-full">
             <ScrollReveal direction="left" delay={0.4} duration={0.8} className="w-full h-full">
                <MouseParallax strength={20}>
                  
                  {/* Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -z-10" />

                  {/* Main Dashboard Card */}
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 transform preserve-3d">
                      <div className="flex justify-between items-center mb-8 opacity-50">
                        <div className="h-8 w-40 bg-slate-700/50 rounded-md" />
                        <div className="flex gap-4">
                          <div className="h-8 w-8 rounded-full bg-slate-700/50" />
                          <div className="h-8 w-8 rounded-full bg-slate-700/50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 opacity-40">
                        <div className="h-32 bg-slate-800/50 rounded-xl" />
                        <div className="h-32 bg-slate-800/50 rounded-xl" />
                        <div className="h-32 bg-slate-800/50 rounded-xl" />
                      </div>
                  </div>

                  {/* Floating Elements (Closer to viewer) */}
                  <div className="absolute top-[20%] -left-[5%] w-[110%] transform translate-z-[50px]">
                      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-2xl border-t border-l border-white/20 border-b border-r border-black/30 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                    <Layers className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">Fashion Editorial</h3>
                                    <p className="text-slate-400 text-sm">Studio A • Oct 24</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20">Confirmed</span>
                        </div>
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex justify-between items-center">
                                <span className="text-slate-300 text-sm">Crew Assigned</span>
                                <div className="flex -space-x-2">
                                    <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-slate-800" />
                                    <div className="h-8 w-8 rounded-full bg-slate-600 border-2 border-slate-800" />
                                    <div className="h-8 w-8 rounded-full bg-slate-500 border-2 border-slate-800 flex items-center justify-center text-xs text-white">+2</div>
                                </div>
                            </div>
                        </div>
                      </div>
                  </div>

                </MouseParallax>
             </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  )
}