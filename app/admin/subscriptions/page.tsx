"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Edit, DollarSign, TrendingUp } from "lucide-react"

const plans = [
  { id: "starter", name: "Starter", price: "$29/mo", features: 3, limit: "10 GB Storage", activeStudios: 42 },
  { id: "pro", name: "Pro", price: "$99/mo", features: 8, limit: "100 GB Storage", activeStudios: 87 },
  { id: "agency", name: "Agency", price: "$249/mo", features: 8, limit: "Unlimited Storage", activeStudios: 13 },
]

const recentInvoices = [
  { id: "INV-1042", studio: "Demo Studio", amount: "$99.00", status: "Paid", date: "Jan 1, 2025" },
  { id: "INV-1041", studio: "Elite Captures", amount: "$29.00", status: "Paid", date: "Dec 30, 2024" },
  { id: "INV-1040", studio: "Flash & Focus", amount: "$249.00", status: "Pending", date: "Dec 28, 2024" },
]

export default function SubscriptionsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscriptions & Plans</h1>
        <p className="text-muted-foreground mt-1">Manage pricing tiers and billing gateway</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-200/50">
                <DollarSign className="h-5 w-5 text-green-700" />
              </div>
              <Badge variant="outline" className="bg-white text-green-700 border-green-200">
                +14%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total MRR</p>
            <p className="text-3xl font-bold text-green-700">$15,240</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-[#1C4D8D]/10 to-[#4988C4]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#1C4D8D]/20">
                <TrendingUp className="h-5 w-5 text-[#1C4D8D]" />
              </div>
              <Badge variant="outline" className="bg-white text-[#1C4D8D] border-[#1C4D8D]/20">
                Stripe
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Payment Gateway</p>
            <p className="text-3xl font-bold text-[#1C4D8D]">Connected</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Manager */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>Plan Configuration</CardTitle>
          <CardDescription>Edit pricing and limits for subscription tiers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="font-bold">Plan Name</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="font-bold">Features</TableHead>
                <TableHead className="font-bold">Storage Limit</TableHead>
                <TableHead className="font-bold">Active Studios</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
                  <TableCell className="text-foreground font-semibold">{plan.price}</TableCell>
                  <TableCell className="text-muted-foreground">{plan.features} modules</TableCell>
                  <TableCell className="text-muted-foreground">{plan.limit}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#4988C4]/10 text-[#4988C4] border-[#4988C4]/20">
                      {plan.activeStudios} studios
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="hover:bg-[#1C4D8D] hover:text-white bg-transparent">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Plan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Master list of all payments received</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="font-bold">Invoice ID</TableHead>
                <TableHead className="font-bold">Studio</TableHead>
                <TableHead className="font-bold">Amount</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {invoice.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{invoice.studio}</TableCell>
                  <TableCell className="text-foreground font-semibold">{invoice.amount}</TableCell>
                  <TableCell>
                    {invoice.status === "Paid" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
