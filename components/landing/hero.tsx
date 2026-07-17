"use client"

import { MouseParallax } from "@/components/ui/mouse-parallax"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface HeroProps {
  onGetStartedClick: () => void
}

export function Hero({ onGetStartedClick }: HeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background text-foreground transition-colors duration-300 pt-20">
      
      {/* Background Image & Overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1600494603989-96503707634e?q=80&w=2940&auto=format&fit=crop"
          alt="Studio Background"
          fill
          className="object-cover opacity-10 dark:opacity-20 grayscale transition-opacity duration-300"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] dark:opacity-[0.04] mix-blend-overlay pointer-events-none" />
        
        {/* Rule of Thirds Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 dark:opacity-30">
          <div className="border-r border-b border-border/40" />
          <div className="border-r border-b border-border/40" />
          <div className="border-b border-border/40" />
          <div className="border-r border-b border-border/40" />
          <div className="border-r border-b border-border/40" />
          <div className="border-b border-border/40" />
        </div>
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT: Text Content */}
          <div className="space-y-8 max-w-2xl">
            <ScrollReveal direction="down" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-primary fill-primary/20" />
                <span className="text-sm font-medium tracking-wide">
                  The new standard for <span className="text-primary font-bold">Smart Studio Workflows</span>
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tighter text-foreground">
                Capture control
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-500 to-orange-400">
                  of your studio.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Ditch the disconnected spreadsheets. Centralize bookings, gear tracking, crew assignments, and payments in one intelligent platform.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-5 pt-4">
                <Link 
                  href="/app/login" 
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 hover:-translate-y-0.5"
                >
                  [ Contact Sales ]
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link 
                  href="/#features" 
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background/50 hover:bg-secondary px-8 text-base font-semibold text-foreground transition-all hover:-translate-y-0.5"
                >
                  [ Learn More ]
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.5}>
              <div className="pt-8 border-t border-border flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>Enterprise-grade security</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-primary font-bold">RAW</span>
                  <span>Tailored onboarding support</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* RIGHT: Lightroom LCD style Dashboard */}
          <div className="relative hidden lg:block perspective-[2000px] h-[600px] w-full">
            <ScrollReveal direction="left" delay={0.4} duration={0.8} className="w-full h-full">
              <MouseParallax strength={15}>
                
                {/* Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/10 blur-[100px] rounded-full -z-10" />

                {/* Camera Viewfinder Frame Box */}
                <div className="absolute inset-0 bg-card/60 dark:bg-card/45 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden p-6 transform preserve-3d">
                  
                  {/* Viewfinder Corners */}
                  <div className="absolute inset-4 pointer-events-none opacity-40 dark:opacity-60">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                  </div>

                  {/* Focus Center Crosshair */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-primary/20 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                  </div>

                  {/* Lightroom-style LCD Metadata Topbar */}
                  <div className="flex justify-between items-center mb-8 border-b border-border pb-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    <span>ISO 400</span>
                    <span>50mm</span>
                    <span className="text-primary font-bold">f/2.8</span>
                    <span>1/250s</span>
                    <span className="text-emerald-500 font-bold">AF-C</span>
                  </div>

                  {/* LCD Info Display */}
                  <div className="space-y-6 select-none">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">METRIC STATE</span>
                        <h3 className="text-3xl font-extrabold text-foreground tracking-tight">124 ACTIVE</h3>
                      </div>
                      <div className="text-right font-mono text-xs text-muted-foreground">
                        <div>EXP: +0.3 EV</div>
                        <div>BAT: 98%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-secondary/50 border border-border rounded-xl font-mono text-xs">
                        <div className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">SHUTTER DEPTH</div>
                        <div className="text-foreground font-bold">87% MEMORY</div>
                      </div>
                      <div className="p-4 bg-secondary/50 border border-border rounded-xl font-mono text-xs">
                        <div className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">LENS ATTACHED</div>
                        <div className="text-foreground truncate font-bold">FE 24-70 F2.8 GM II</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating LCD Card (Lightroom Metadata Panel) */}
                <div className="absolute top-[35%] -left-[5%] w-[110%] transform translate-z-[40px]">
                  <div className="bg-card/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-6 border-t-primary/30">
                    <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                          <CameraSVG />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">FASHION EDITORIAL</h4>
                          <p className="text-muted-foreground text-[10px] uppercase font-mono tracking-wider">STUDIO A • RULE OF THIRDS</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 uppercase font-mono">Focused</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground text-center">
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider">SHUTTER</div>
                        <div className="text-foreground font-bold mt-0.5">1/500</div>
                      </div>
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider">APERTURE</div>
                        <div className="text-foreground font-bold mt-0.5">F/4.0</div>
                      </div>
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider">ISO</div>
                        <div className="text-foreground font-bold mt-0.5">100</div>
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

function CameraSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  )
}