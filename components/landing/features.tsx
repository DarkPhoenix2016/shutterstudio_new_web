"use client"

import { CalendarDays, CheckSquare, Camera, CreditCard, Users, Package, FileCheck, BarChart3, ShieldCheck, Settings, MapPin, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export function Features() {
  return (
    <section className="relative py-24 bg-background transition-colors duration-300 overflow-hidden" id="features">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        
        <ScrollReveal direction="up" className="mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Everything you need to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">
                run a modern studio.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              From the first consultation to the final delivery, ShutterStudio provides the specialized tools you need.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. HERO FEATURE - Slides from LEFT */}
          <div className="md:col-span-2 md:row-span-2">
            <ScrollReveal direction="right" delay={0.1} width="100%" className="h-full">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 flex flex-col shadow-xs">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-8 pb-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Event Lifecycle Management</h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Manage the entire journey from consultation to final delivery. Store client details, track locations, and prevent conflicts with smart calendar views.
                  </p>
                </div>
                {/* Visual Footer */}
                <div className="relative w-full h-32 md:h-48 rounded-t-xl bg-muted/30 border-t border-l border-r border-border overflow-hidden shadow-2xl mx-4 md:mx-8 mb-0 translate-y-2">
                   <div className="absolute top-4 left-4 right-4 h-2 bg-muted rounded-full w-1/3" />
                   <div className="absolute top-10 left-4 right-4 flex gap-3">
                      <div className="w-2/3 h-6 bg-primary/20 rounded border border-primary/10" />
                      <div className="w-1/3 h-6 bg-muted/50 rounded" />
                   </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* 2. INVENTORY - Slides from RIGHT */}
          <div className="md:col-span-1 md:row-span-2">
            <ScrollReveal direction="left" delay={0.2} width="100%" className="h-full">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 p-8 flex flex-col shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:rotate-12 transition-transform duration-300">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Smart Inventory</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Never double-book gear again. Track cameras, lenses, and drones with real-time availability checks.
                </p>
                <div className="flex-1 space-y-3 opacity-60">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted border border-border/50">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      <div className="h-2 w-20 bg-muted-foreground/30 rounded-full" />
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
              color="text-emerald-500 dark:text-emerald-400"
              bg="bg-emerald-500/10 dark:bg-emerald-500/20"
            />
          </ScrollReveal>

          {/* 4. TASKS - Slides UP */}
          <ScrollReveal direction="up" delay={0.4} width="100%">
            <FeatureCard 
              icon={CheckSquare}
              title="Task Workflows"
              description="Assign tasks to editors and crew with deadlines linked to event dates."
              color="text-amber-500 dark:text-amber-400"
              bg="bg-amber-500/10 dark:bg-amber-500/20"
            />
          </ScrollReveal>

          {/* 5. CREW - Slides UP */}
          <ScrollReveal direction="up" delay={0.5} width="100%">
            <FeatureCard 
              icon={Users}
              title="Crew Management"
              description="Manage roles, control access to financial data, and view team availability."
              color="text-orange-500 dark:text-orange-400"
              bg="bg-orange-500/10 dark:bg-orange-500/20"
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
    <div className="group h-full relative overflow-hidden rounded-3xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 p-8 shadow-xs">
      <div className="flex items-start justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", bg, color)}>
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function SmallFeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card/10 hover:bg-card/30 transition-colors">
      <div className="shrink-0 mt-1">
        <Icon className="h-5 w-5 text-muted-foreground/80" />
      </div>
      <div>
        <h3 className="text-foreground font-medium mb-1 text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}