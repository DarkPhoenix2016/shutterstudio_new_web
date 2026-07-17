"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchPlatformPackages, fetchPlatformDiscounts, PlatformPackage, Discount } from "@/services/platform"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

interface PricingProps {
  onGetStartedClick: () => void
}

export function Pricing({ onGetStartedClick }: PricingProps) {
  const [plans, setPlans] = useState<PlatformPackage[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "6months" | "yearly">("monthly")

  useEffect(() => {
    Promise.all([fetchPlatformPackages(), fetchPlatformDiscounts()]).then(([plansData, discountsData]) => {
      setPlans(plansData)
      setDiscounts(discountsData)
      setLoading(false)
    })
  }, [])

  const getPlanPrice = (plan: PlatformPackage, cycle: "monthly" | "6months" | "yearly") => {
    const basePrice = plan.price
    if (basePrice === 0) {
      return {
        discountedMonthlyPrice: 0,
        totalPrice: 0,
        billingText: "",
        hasCustomDiscount: false
      }
    }

    // 1. Find all active custom discounts matching this plan & cycle
    const activeDiscounts = discounts.filter(d => {
      if (!d.active) return false
      
      // Check package match
      const packageMatches = d.packageId === "all" || d.packageId === plan.id
      if (!packageMatches) return false

      // Check cycle match
      const cycleMatches = d.billingCycle === "all" || d.billingCycle === cycle
      return cycleMatches
    })

    // 2. Apply custom discount if found, else apply default percentage discount (6% for 6months, 12% for yearly)
    let discountedMonthlyPrice = basePrice
    let hasCustomDiscount = false
    let appliedDiscountName = ""

    if (activeDiscounts.length > 0) {
      // Find the best discount (one that results in the lowest price)
      let bestPrice = basePrice
      let selectedDiscount: Discount | null = null

      activeDiscounts.forEach(d => {
        let currentPrice = basePrice
        if (d.type === "percentage") {
          currentPrice = basePrice * (1 - d.value / 100)
        } else if (d.type === "flat") {
          currentPrice = basePrice - d.value
        }
        if (currentPrice < bestPrice) {
          bestPrice = currentPrice
          selectedDiscount = d
        }
      })

      if (selectedDiscount) {
        discountedMonthlyPrice = Math.max(0, bestPrice)
        hasCustomDiscount = true
        appliedDiscountName = (selectedDiscount as Discount).name
      }
    }

    // 3. Compute totals and descriptive texts
    const multiplier = cycle === "monthly" ? 1 : cycle === "6months" ? 6 : 12
    const totalPrice = Math.round(discountedMonthlyPrice * multiplier)
    const roundedMonthly = Math.round(discountedMonthlyPrice)

    let billingText = ""
    if (cycle === "monthly") {
      billingText = "Billed monthly"
    } else if (cycle === "6months") {
      billingText = `Billed LKR ${totalPrice.toLocaleString()} every 6 mos`
    } else if (cycle === "yearly") {
      billingText = `Billed LKR ${totalPrice.toLocaleString()} annually`
    }

    if (hasCustomDiscount && appliedDiscountName) {
      billingText += ` (${appliedDiscountName})`
    }

    return {
      discountedMonthlyPrice: roundedMonthly,
      totalPrice,
      billingText,
      hasCustomDiscount
    }
  }

  if (loading) {
    return (
      <section className="py-24 bg-background transition-colors duration-300 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading packages...</p>
        </div>
      </section>
    )
  }

  if (plans.length === 0) return null

  return (
    <section className="relative py-24 bg-background transition-colors duration-300 overflow-hidden border-t border-border" id="pricing">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <ScrollReveal direction="up" className="mx-auto">
          <div className="text-center space-y-4 mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Transparent pricing for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">
                studios of every size.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Choose the plan that fits your current stage. Upgrade seamlessly as you grow.
            </p>
          </div>
        </ScrollReveal>

        {/* Billing Cycle Selector */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex rounded-xl p-1 bg-card border border-border shadow-xs">
            {(["monthly", "6months", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer",
                  billingCycle === cycle
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {cycle === "monthly" && "Monthly"}
                {cycle === "6months" && "6 Months"}
                {cycle === "yearly" && "Yearly"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <ScrollReveal key={plan.id} direction="up" delay={index * 0.15} width="100%">
              <div
                className={cn(
                  "group relative flex flex-col p-8 rounded-3xl transition-all duration-300",
                  "border border-border bg-card/40 backdrop-blur-sm shadow-xs",
                  plan.featured
                    ? "z-10 bg-gradient-to-b from-card/85 to-card/95 shadow-[0_0_50px_-15px_rgba(217,119,6,0.3)] border-primary/45 scale-105"
                    : "hover:bg-card/70 hover:border-border/80"
                )}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 px-4 py-1 h-8 text-xs uppercase tracking-wider font-semibold shadow-lg shadow-primary/20">
                      <Sparkles className="w-3 h-3 mr-1.5 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {(() => {
                  const { discountedMonthlyPrice, billingText } = getPlanPrice(plan, billingCycle)
                  return (
                    <div className="mb-8 space-y-4">
                      <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                      <div className="flex flex-col gap-1.5">
                        {plan.price !== 0 && discountedMonthlyPrice < plan.price && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm line-through text-muted-foreground/60">
                              LKR {plan.price.toLocaleString()}/mo
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Save {Math.round(((plan.price - discountedMonthlyPrice) / plan.price) * 100)}%
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                            {plan.price === 0
                              ? "Free"
                              : `LKR ${discountedMonthlyPrice.toLocaleString()}`
                            }
                          </span>
                          {plan.price !== 0 && <span className="text-muted-foreground/60 font-medium">/mo</span>}
                        </div>
                        {plan.price !== 0 && (
                          <div className="text-xs text-primary font-medium text-wrap">
                            {billingText}
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed min-h-[40px] pt-1">
                        {plan.description || "Perfect for getting started."}
                      </p>
                    </div>
                  )
                })()}

                <Button
                  onClick={onGetStartedClick}
                  className="w-full h-12 rounded-xl text-base font-semibold transition-all mb-8"
                  variant={plan.featured ? "default" : "outline"}
                >
                  {plan.price === 0 ? "[ Capture Booking ]" : "[ Contact Sales ]"}
                  {plan.featured && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                {plan.include_price_table && (
                  <div className="mb-6 p-4 rounded-xl bg-background/50 border border-border space-y-2.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Team</span><span className="text-foreground">{plan.users_limit}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Events</span><span className="text-foreground">{plan.events_limit.toLocaleString()}</span></div>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Everything in {plan.name}:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                        <div className={cn("mt-0.5 rounded-full p-0.5", plan.featured ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
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