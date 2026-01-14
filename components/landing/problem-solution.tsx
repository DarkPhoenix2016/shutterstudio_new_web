"use client"

import { X, Check, XCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProblemSolution() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background Separator Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Stop running your studio <br />
            <span className="text-slate-500">on luck and spreadsheets.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 relative">
          
          {/* THE PROBLEM (Left) */}
          <div className="p-8 rounded-3xl border border-red-500/10 bg-red-500/[0.02] relative overflow-hidden">
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

          {/* THE SOLUTION (Right) */}
          <div className="p-8 rounded-3xl border border-blue-500/20 bg-blue-500/[0.05] relative overflow-hidden shadow-[0_0_40px_-10px_rgba(59,130,246,0.1)]">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <CheckCircle2 className="w-32 h-32 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
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

        </div>
      </div>
    </section>
  )
}

function ProblemItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-slate-400">
      <div className="mt-1 min-w-[1.25rem]"><X className="w-5 h-5 text-red-500/50" /></div>
      <span>{text}</span>
    </li>
  )
}

function SolutionItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-white">
      <div className="mt-1 min-w-[1.25rem]"><Check className="w-5 h-5 text-blue-400" /></div>
      <span>{text}</span>
    </li>
  )
}