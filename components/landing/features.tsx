"use client"

import { CalendarDays, CheckSquare, Camera, CreditCard, Users, Package, FileCheck, BarChart3, ShieldCheck, Settings, MapPin, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export function Features() {
  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden" id="features">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        
        <ScrollReveal direction="up" className="mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Everything you need to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                run a modern studio.
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              From the first consultation to the final delivery, ShutterStudio provides the specialized tools you need.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. HERO FEATURE - Slides from LEFT */}
          <div className="md:col-span-2 md:row-span-2">
            <ScrollReveal direction="right" delay={0.1} width="100%" className="h-full">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-8 pb-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Event Lifecycle Management</h3>
                  <p className="text-slate-400 max-w-md mb-8">
                    Manage the entire journey from consultation to final delivery. Store client details, track locations, and prevent conflicts with smart calendar views.
                  </p>
                </div>
                {/* Visual Footer */}
                <div className="relative w-full h-32 md:h-48 rounded-t-xl bg-slate-900/50 border-t border-l border-r border-white/10 overflow-hidden shadow-2xl mx-4 md:mx-8 mb-0 translate-y-2">
                   <div className="absolute top-4 left-4 right-4 h-2 bg-slate-800 rounded-full w-1/3" />
                   <div className="absolute top-10 left-4 right-4 flex gap-3">
                      <div className="w-2/3 h-6 bg-blue-500/20 rounded border border-blue-500/10" />
                      <div className="w-1/3 h-6 bg-slate-800/50 rounded" />
                   </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* 2. INVENTORY - Slides from RIGHT */}
          <div className="md:col-span-1 md:row-span-2">
            <ScrollReveal direction="left" delay={0.2} width="100%" className="h-full">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 p-8 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:rotate-12 transition-transform duration-300">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Smart Inventory</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Never double-book gear again. Track cameras, lenses, and drones with real-time availability checks.
                </p>
                <div className="flex-1 space-y-3 opacity-60">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="h-2 w-20 bg-slate-600 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* 3. PAYMENTS - Slides UP */}
          <ScrollReveal direction="up" delay={0.3} width="100%">
            <FeatureCard 
              icon={CreditCard}
              title="Payments & Invoicing"
              description="Generate invoices, track partial payments, and integrate local methods."
              color="text-emerald-400"
              bg="bg-emerald-500/20"
            />
          </ScrollReveal>

          {/* 4. TASKS - Slides UP */}
          <ScrollReveal direction="up" delay={0.4} width="100%">
            <FeatureCard 
              icon={CheckSquare}
              title="Task Workflows"
              description="Assign tasks to editors and crew with deadlines linked to event dates."
              color="text-amber-400"
              bg="bg-amber-500/20"
            />
          </ScrollReveal>

          {/* 5. CREW - Slides UP */}
          <ScrollReveal direction="up" delay={0.5} width="100%">
            <FeatureCard 
              icon={Users}
              title="Crew Management"
              description="Manage roles, control access to financial data, and view team availability."
              color="text-pink-400"
              bg="bg-pink-500/20"
            />
          </ScrollReveal>

        </div>

        {/* Small Utilities - Fade In */}
        <ScrollReveal direction="up" delay={0.6} width="100%">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <SmallFeatureCard icon={Package} title="Packages & Pricing" desc="Create standard packages for consistent pricing." />
            <SmallFeatureCard icon={FileCheck} title="Client Approvals" desc="Capture digital approvals instantly." />
            <SmallFeatureCard icon={BarChart3} title="Studio Insights" desc="Track revenue and monitor growth." />
            <SmallFeatureCard icon={MapPin} title="Sri Lanka Ready" desc="Local payment workflows designed for you." />
            <SmallFeatureCard icon={ShieldCheck} title="Secure Cloud" desc="Enterprise-grade security with backups." />
            <SmallFeatureCard icon={Settings} title="Plan Control" desc="Transparent billing. Upgrade anytime." />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, description, color, bg }: any) {
  return (
    <div className="group h-full relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 p-8">
      <div className="flex items-start justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", bg, color)}>
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function SmallFeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
      <div className="shrink-0 mt-1">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div>
        <h3 className="text-white font-medium mb-1 text-sm">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}