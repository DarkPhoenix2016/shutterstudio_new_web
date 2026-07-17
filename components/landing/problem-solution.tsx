"use client"

import { X, Check, XCircle, CheckCircle2 } from "lucide-react"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export function ProblemSolution() {
  return (
    <section className="py-24 bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container mx-auto px-6 max-w-7xl">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Stop running your studio <br />
              <span className="text-muted-foreground">on luck and spreadsheets.</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 relative">
          
          {/* PROBLEM CARD - Slides in from LEFT */}
          <ScrollReveal direction="right" delay={0.2} width="100%" className="h-full">
            <div className="h-full p-8 rounded-3xl border border-red-500/10 bg-red-500/[0.02] relative overflow-hidden hover:bg-red-500/[0.04] transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <XCircle className="w-32 h-32 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <X className="w-5 h-5" /> The Chaos
              </h3>
              <ul className="space-y-4">
                <ProblemItem text="Bookings scattered across WhatsApp & Excel" />
                <ProblemItem text="Double-booked lenses and cameras" />
                <ProblemItem text="Chasing clients for payments manually" />
                <ProblemItem text="Crew doesn't know where to be or when" />
                <ProblemItem text="Zero visibility on monthly profit" />
              </ul>
            </div>
          </ScrollReveal>

          {/* SOLUTION CARD - Slides in from RIGHT */}
          <ScrollReveal direction="left" delay={0.2} width="100%" className="h-full">
            <div className="h-full p-8 rounded-3xl border border-primary/20 bg-primary/5 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(217,119,6,0.1)] hover:bg-primary/10 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <CheckCircle2 className="w-32 h-32 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <Check className="w-5 h-5" /> The Control
              </h3>
              <ul className="space-y-4">
                <SolutionItem text="Centralized calendar for every shoot" />
                <SolutionItem text="Smart inventory with conflict alerts" />
                <SolutionItem text="Automated invoices & payment tracking" />
                <SolutionItem text="Role-based dashboards for your crew" />
                <SolutionItem text="Real-time financial analytics" />
              </ul>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}

function ProblemItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-muted-foreground">
      <div className="mt-1 min-w-[1.25rem]"><X className="w-5 h-5 text-red-500/50" /></div>
      <span>{text}</span>
    </li>
  )
}

function SolutionItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-foreground">
      <div className="mt-1 min-w-[1.25rem]"><Check className="w-5 h-5 text-primary" /></div>
      <span>{text}</span>
    </li>
  )
}