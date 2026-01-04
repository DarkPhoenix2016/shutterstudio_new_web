"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Building2, Activity, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const growthData = [
  { day: "Day 1", signups: 2 },
  { day: "Day 7", signups: 5 },
  { day: "Day 14", signups: 8 },
  { day: "Day 21", signups: 12 },
  { day: "Day 30", signups: 15 },
]

const activityFeed = [
  { id: 1, event: "New Studio Signup", studio: "Pixel Perfect Studios", time: "5 minutes ago" },
  { id: 2, event: "Payment Received", studio: "Demo Studio", time: "23 minutes ago" },
  { id: 3, event: "Feature Enabled", studio: "Elite Captures", time: "1 hour ago" },
  { id: 4, event: "New Studio Signup", studio: "Flash & Focus", time: "3 hours ago" },
]

export default function SuperAdminDashboard() {
  const { studios } = useStore()

  const totalStudios = studios.length
  const activeModules = studios.reduce((sum, studio) => sum + studio.features.length, 0)

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of platform health and business metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-[#1C4D8D]/10 to-[#4988C4]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#1C4D8D]/20">
                <DollarSign className="h-5 w-5 text-[#1C4D8D]" />
              </div>
              <Badge variant="outline" className="bg-white text-green-600 border-green-200">
                +12%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total MRR</p>
            <p className="text-3xl font-bold text-[#1C4D8D]">$15,240</p>
            <p className="text-xs text-muted-foreground mt-2">Month-over-month trend</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-[#4988C4]/10 to-[#BDE8F5]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#4988C4]/20">
                <Building2 className="h-5 w-5 text-[#4988C4]" />
              </div>
              <Badge variant="outline" className="bg-white text-[#4988C4] border-[#4988C4]/20">
                Active: {totalStudios}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Active Tenants</p>
            <p className="text-3xl font-bold text-[#4988C4]">{totalStudios}</p>
            <p className="text-xs text-muted-foreground mt-2">vs Suspended/Cancelled: 0</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-200/50">
                <AlertCircle className="h-5 w-5 text-orange-700" />
              </div>
              <Badge variant="outline" className="bg-white text-orange-700 border-orange-200">
                65%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Storage Load</p>
            <p className="text-3xl font-bold text-orange-700">65TB</p>
            <p className="text-xs text-muted-foreground mt-2">of 100TB capacity</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-200/50">
                <Activity className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Online</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">System Status</p>
            <p className="text-lg font-bold text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Operational
            </p>
            <p className="text-xs text-muted-foreground mt-2">All systems running</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#1C4D8D]" />
            Studio Growth Chart
          </CardTitle>
          <CardDescription>New studio acquisitions over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer
            config={{
              signups: {
                label: "Signups",
                color: "#1C4D8D",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#1C4D8D"
                  strokeWidth={3}
                  dot={{ fill: "#1C4D8D", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>Live Activity Feed</CardTitle>
          <CardDescription>Real-time log of new studio signups and gateway events</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {activityFeed.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-[#4988C4] rounded-full" />
                  <div>
                    <p className="font-medium text-foreground">{activity.event}</p>
                    <p className="text-sm text-muted-foreground">{activity.studio}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
