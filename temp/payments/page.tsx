"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Plus } from "lucide-react"

export default function PaymentsPage() {
  const invoices = [
    { id: "INV-2025-001", client: "Sarah Miller", amount: "$4,500.00", date: "Oct 12, 2025", status: "Paid" },
    { id: "INV-2025-002", client: "TechFlow HQ", amount: "$1,200.00", date: "Oct 15, 2025", status: "Pending" },
    { id: "INV-2025-003", client: "Zenith Watch", amount: "$2,850.00", date: "Oct 20, 2025", status: "Overdue" },
    { id: "INV-2025-004", client: "John & Doe", amount: "$3,100.00", date: "Oct 22, 2025", status: "Paid" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground text-sm">Overview of studio financials and cashflow.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$14,250.00</div>
            <p className="text-xs opacity-60 mt-1">From 12 pending invoices</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$184,200.00</div>
            <p className="text-xs text-green-600 mt-1">+15% from last year</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,450.00</div>
            <p className="text-xs text-muted-foreground mt-1">Across all packages</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell>{inv.client}</TableCell>
                  <TableCell className="font-bold">{inv.amount}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === "Paid" ? "default" : inv.status === "Pending" ? "secondary" : "destructive"
                      }
                      className={inv.status === "Paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
