"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Camera, Users, CreditCard, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Camera,
    title: "Smart Inventory",
    description: "Never lose a lens again. Check-in/out tracking with real-time availability.",
    color: "#1C4D8D",
    bgColor: "bg-[#1C4D8D]/10",
  },
  {
    icon: Users,
    title: "Team Sync",
    description: "Assign crew to specific events with role-based access control.",
    color: "#4988C4",
    bgColor: "bg-[#4988C4]/10",
  },
  {
    icon: CreditCard,
    title: "Financials",
    description: "Automated invoicing and expense tracking. Get paid faster.",
    color: "#0F2854",
    bgColor: "bg-[#0F2854]/5",
  },
  {
    icon: Globe,
    title: "Client Portal",
    description: "Let clients book packages directly. Reduce back-and-forth emails.",
    color: "#1C4D8D",
    bgColor: "bg-[#BDE8F5]/40",
  },
]

export function Features() {
  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-primary">Everything you need to run your studio</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Built for photographers, by photographers. No bloat, just the tools that matter.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="border-border bg-white hover:border-primary/40 hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("rounded-xl p-3 border border-border", feature.bgColor)}>
                      <Icon className="h-6 w-6" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
