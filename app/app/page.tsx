//app/app/page.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, DollarSign, Calendar, Users, Camera, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { studio, currentUser } = useAuthGate()

  const stats = [
    {
      label: "Monthly Revenue",
      value: "$12,450",
      change: "+12.5%",
      icon: DollarSign,
      bgColor: "bg-[#1C4D8D]/5",
      iconBg: "bg-[#1C4D8D]/10",
      iconColor: "text-[#1C4D8D]",
    },
    {
      label: "Active Shoots",
      value: "8",
      change: "+2 this week",
      icon: Camera,
      bgColor: "bg-[#4988C4]/5",
      iconBg: "bg-[#4988C4]/10",
      iconColor: "text-[#4988C4]",
    },
    {
      label: "Crew Available",
      value: "14",
      change: "Full team",
      icon: Users,
      bgColor: "bg-[#0F2854]/5",
      iconBg: "bg-[#0F2854]/10",
      iconColor: "text-[#0F2854]",
    },
    {
      label: "Equipment Out",
      value: "24",
      change: "60% utilized",
      icon: Clock,
      bgColor: "bg-[#BDE8F5]/30",
      iconBg: "bg-[#BDE8F5]/50",
      iconColor: "text-[#1C4D8D]",
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {currentUser?.email.split("@")[0]}
          </h1>
          <p className="text-muted-foreground">Here's what's happening at {studio?.name} today.</p>
        </div>
        <Button className="bg-primary text-white hover:bg-primary/90 shadow-lg">
          <Calendar className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={cn("border-none shadow-md hover:shadow-xl transition-shadow", stat.bgColor)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2.5 rounded-xl", stat.iconBg)}>
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white border-border/50 text-foreground">
                  {stat.change}
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
            <div>
              <CardTitle className="text-foreground">Upcoming Shoots</CardTitle>
              <CardDescription>Your schedule for the next 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-muted">
              View All <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[
                {
                  title: "Wedding: Sarah & James",
                  type: "Wedding",
                  date: "Tomorrow, 10:00 AM",
                  status: "Confirmed",
                  color: "#1C4D8D",
                },
                {
                  title: "Corporate: TechFlow HQ",
                  type: "Event",
                  date: "Oct 24, 02:00 PM",
                  status: "Pending Gear",
                  color: "#4988C4",
                },
                {
                  title: "Product: Zenith Watch Co",
                  type: "Studio",
                  date: "Oct 26, 09:00 AM",
                  status: "Confirmed",
                  color: "#0F2854",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center font-bold border"
                      style={{ backgroundColor: `${item.color}10`, color: item.color, borderColor: `${item.color}20` }}
                    >
                      {item.type[0]}
                    </div>
                  </div>
                  <Badge
                    variant={item.status === "Confirmed" ? "default" : "secondary"}
                    className={
                      item.status === "Confirmed" ? "bg-green-100 text-green-700" : "bg-[#BDE8F5] text-[#1C4D8D]"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-primary">Studio Utilization</CardTitle>
            <CardDescription>Weekly resource capacity</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[
                { label: "Studio A", percentage: 85, color: "#1C4D8D" },
                { label: "Camera Gear", percentage: 62, color: "#4988C4" },
                { label: "Lighting Kits", percentage: 44, color: "#0F2854" },
                { label: "Post-Production", percentage: 91, color: "#4988C4" },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 rounded-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
