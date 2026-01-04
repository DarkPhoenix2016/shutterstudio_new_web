"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Database } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const growthData = [
  { month: "Jan", studios: 105 },
  { month: "Feb", studios: 112 },
  { month: "Mar", studios: 118 },
  { month: "Apr", studios: 125 },
  { month: "May", studios: 132 },
  { month: "Jun", studios: 142 },
]

const featureUsageData = [
  { feature: "Inventory", usage: 87 },
  { feature: "Calendar", usage: 95 },
  { feature: "Payments", usage: 72 },
  { feature: "Crew", usage: 64 },
  { feature: "Consultation", usage: 58 },
  { feature: "Catalog", usage: 91 },
]

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform insights and performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-200/50">
                <TrendingDown className="h-5 w-5 text-red-700" />
              </div>
              <Badge variant="outline" className="bg-white text-red-700 border-red-200">
                -2.3%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Churn Rate</p>
            <p className="text-3xl font-bold text-red-700">4.5%</p>
            <p className="text-xs text-muted-foreground mt-2">Studios cancelling plans</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-200/50">
                <Database className="h-5 w-5 text-blue-700" />
              </div>
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                65TB / 100TB
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Storage Growth</p>
            <p className="text-3xl font-bold text-blue-700">+8TB</p>
            <p className="text-xs text-muted-foreground mt-2">Need more S3 by Nov 2026</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-200/50">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <Badge variant="outline" className="bg-white text-green-700 border-green-200">
                +18%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Feature Adoption</p>
            <p className="text-3xl font-bold text-green-700">87%</p>
            <p className="text-xs text-muted-foreground mt-2">Avg modules per studio</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Studio Growth Trend</CardTitle>
          <CardDescription>New studio acquisitions over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              studios: {
                label: "Studios",
                color: "#1C4D8D",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="studios" stroke="#1C4D8D" strokeWidth={3} dot={{ fill: "#1C4D8D" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Feature Usage Heatmap */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Feature Usage Analysis</CardTitle>
          <CardDescription>Which modules are most utilized across all studios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureUsageData.map((item) => (
            <div key={item.feature} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{item.feature}</span>
                <span className="text-sm text-muted-foreground">{item.usage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#1C4D8D] to-[#4988C4] h-full rounded-full transition-all"
                  style={{ width: `${item.usage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
