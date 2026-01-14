"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchPlatformPackages, PlatformPackage } from "@/services/platform"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

interface PricingProps {
  onGetStartedClick: () => void
}

export function Pricing({ onGetStartedClick }: PricingProps) {
  const [plans, setPlans] = useState<PlatformPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlatformPackages().then((data) => {
      setPlans(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-slate-950 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-500 text-sm">Loading packages...</p>
        </div>
      </section>
    )
  }

  if (plans.length === 0) return null

  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden" id="pricing">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <ScrollReveal direction="up" className="mx-auto">
          <div className="text-center space-y-4 mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Transparent pricing for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                studios of every size.
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              Choose the plan that fits your current stage. Upgrade seamlessly as you grow.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <ScrollReveal key={plan.id} direction="up" delay={index * 0.15} width="100%">
              <div
                className={cn(
                  "group relative flex flex-col p-8 rounded-3xl transition-all duration-300",
                  "border border-white/10 bg-white/5 backdrop-blur-sm",
                  plan.featured
                    ? "z-10 bg-gradient-to-b from-slate-900/80 to-slate-900/90 shadow-[0_0_50px_-15px_rgba(37,99,235,0.3)] border-blue-500/30 scale-105"
                    : "hover:bg-white/[0.07] hover:border-white/20"
                )}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 hover:bg-blue-500 text-white border-0 px-4 py-1 h-8 text-xs uppercase tracking-wider font-semibold shadow-lg shadow-blue-900/50">
                      <Sparkles className="w-3 h-3 mr-1.5 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <div className="mb-8 space-y-4">
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                      {plan.price === 0 ? "Free" : `LKR ${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price !== 0 && <span className="text-slate-500 font-medium">/mo</span>}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed min-h-[40px]">
                    {plan.description || "Perfect for getting started."}
                  </p>
                </div>

                <Button
                  onClick={onGetStartedClick}
                  className={cn(
                    "w-full h-12 rounded-xl text-base font-semibold transition-all mb-8",
                    plan.featured
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  )}
                >
                  {plan.price === 0 ? "Start Free" : "Contact Sales"}
                  {plan.featured && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                {plan.include_price_table && (
                   <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-2.5">
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Team</span><span className="text-white">{plan.users_limit}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Events</span><span className="text-white">{plan.events_limit.toLocaleString()}</span></div>
                   </div>
                )}

                <div className="space-y-4 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Everything in {plan.name}:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                        <div className={cn("mt-0.5 rounded-full p-0.5", plan.featured ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400")}>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </div>
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}