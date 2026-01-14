"use client"

import { CalendarPlus, Users, Camera, Send } from "lucide-react"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

const steps = [
  { icon: CalendarPlus, title: "1. Book the Shoot", desc: "Create an event, set the date, and input client requirements." },
  { icon: Users, title: "2. Assign Crew", desc: "Select available photographers and editors. They get notified instantly." },
  { icon: Camera, title: "3. Reserve Gear", desc: "Check out equipment. The system ensures no double-booking occurs." },
  { icon: Send, title: "4. Deliver & Invoice", desc: "Track editing progress, send the final invoice, and close the job." }
]

export function HowItWorks() {
  return (
    <section className="py-24 bg-slate-950 relative" id="how-it-works">
      <div className="container mx-auto px-6 max-w-7xl">
        <ScrollReveal direction="up" className="mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              From inquiry to invoice <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                in 4 simple steps.
              </span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative grid md:grid-cols-4 gap-8">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-900/50 via-blue-500/30 to-blue-900/50" />

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <ScrollReveal key={index} direction="up" delay={index * 0.2} width="100%">
                <div className="relative group text-center z-10">
                  <div className="w-24 h-24 mx-auto bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                    <Icon className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed px-2">
                    {step.desc}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}