"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter, MoreVertical } from "lucide-react"

export default function InventoryPage() {
  const items = [
    { name: "Sony A7IV", serial: "SN-98231", status: "In-Stock", category: "Camera" },
    { name: "Canon R5", serial: "SN-22104", status: "Rented", category: "Camera" },
    { name: "Profoto B10X", serial: "SN-44321", status: "In-Stock", category: "Lighting" },
    { name: "DJI Ronin RS3", serial: "SN-55612", status: "Maintenance", category: "Gimbal" },
    { name: "Sony 24-70mm GM", serial: "SN-12198", status: "In-Stock", category: "Lens" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipment Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage studio assets and rental status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hover:bg-slate-50 hover:border-primary bg-transparent">
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search serial or name..." className="pl-9 h-9 border-border/50 focus:border-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-50 hover:to-slate-100">
                <TableHead className="font-bold text-foreground">Item Name</TableHead>
                <TableHead className="font-bold text-foreground">Serial #</TableHead>
                <TableHead className="font-bold text-foreground">Category</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.serial} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{item.serial}</TableCell>
                  <TableCell className="text-foreground">{item.category}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        item.status === "In-Stock"
                          ? "bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary border border-secondary/20 hover:from-secondary/30"
                          : item.status === "Rented"
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 hover:from-primary/30"
                            : "bg-gradient-to-r from-accent/20 to-accent/10 text-accent border border-accent/20 hover:from-accent/30"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 hover:text-primary">
                      <MoreVertical className="h-4 w-4" />
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
