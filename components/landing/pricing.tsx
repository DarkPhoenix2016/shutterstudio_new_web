"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchPlatformPackages, PlatformPackage } from "@/services/platform"

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
      <section className="py-20 bg-white flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </section>
    )
  }

  // Fallback if no plans load (prevents empty section)
  if (plans.length === 0) return null

  return (
    <section className="py-20 px-4 bg-white" id="pricing">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-primary">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free, upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative border-2 transition-all duration-300 bg-white flex flex-col",
                plan.featured
                  ? "border-[#4988C4] shadow-2xl scale-105 z-10"
                  : "border-border hover:border-primary/40 hover:shadow-lg"
              )}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4988C4] text-white border-0 hover:bg-[#4988C4]">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-base min-h-[50px]">
                   {plan.description || "Perfect for growing your photography business."}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">
                    LKR {plan.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 flex-1 flex flex-col">
                <Button
                  className={cn(
                    "w-full text-white",
                    plan.featured 
                      ? "bg-[#4988C4] hover:bg-[#4988C4]/90" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                  onClick={onGetStartedClick}
                >
                  {plan.price === 0 ? "Start Free Trial" : "Get Started"}
                </Button>

                <div className="space-y-4 flex-1">
                  {/* Limits Summary */}
                  {plan.include_price_table && (
                    <div className="text-sm font-medium p-3 bg-muted/30 rounded-lg space-y-1 text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Users</span>
                            <span className="text-foreground">{plan.users_limit}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Events</span>
                            <span className="text-foreground">{plan.events_limit.toLocaleString()}</span>
                        </div>
                    </div>
                  )}

                  {/* Feature List */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check 
                          className="h-5 w-5 shrink-0 mt-0.5" 
                          style={{ color: plan.accentColor || "#1C4D8D" }} 
                        />
                        <span className="text-sm text-muted-foreground leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}