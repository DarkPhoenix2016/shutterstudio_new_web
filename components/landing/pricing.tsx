"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PricingProps {
  onGetStartedClick: () => void
}

const plans = [
  {
    name: "Freelancer",
    price: "$0",
    description: "For solo photographers just starting out",
    features: ["Up to 50 inventory items", "Basic calendar", "Client portal", "Email support"],
    popular: false,
    accentColor: "#1C4D8D",
  },
  {
    name: "Studio",
    price: "$49",
    description: "For growing studios with a small team",
    features: [
      "Unlimited inventory",
      "Advanced calendar & booking",
      "Team management (up to 5)",
      "Financial tracking",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
    accentColor: "#4988C4",
  },
  {
    name: "Agency",
    price: "$199",
    description: "For large operations and multi-location studios",
    features: [
      "Everything in Studio",
      "Unlimited team members",
      "Multi-location support",
      "Advanced analytics",
      "API access",
      "Dedicated account manager",
    ],
    popular: false,
    accentColor: "#0F2854",
  },
]

export function Pricing({ onGetStartedClick }: PricingProps) {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-primary">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free, upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={cn(
                "relative border-2 transition-all duration-300 bg-white",
                plan.popular
                  ? "border-[#4988C4] shadow-2xl scale-105"
                  : "border-border hover:border-primary/40 hover:shadow-lg",
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4988C4] text-white border-0">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className={cn(
                    "w-full text-white",
                    plan.popular ? "bg-[#4988C4] hover:bg-[#4988C4]/90" : "bg-primary hover:bg-primary/90",
                  )}
                  onClick={onGetStartedClick}
                >
                  Get Started
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
