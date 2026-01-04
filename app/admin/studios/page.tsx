"use client"

import { useState } from "react"
import { useStore, type Feature, type StudioConfig } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Building2, Search, Settings2, UserCog, Database } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense } from "react"

const FEATURE_LABELS: Record<Feature, string> = {
  dashboard: "Overview Dashboard",
  calendar: "Event Calendar",
  consultation: "Client Consultation Wizard",
  catalog: "Product Catalog",
  inventory: "Equipment Inventory",
  payments: "Payment & Invoicing",
  crew: "Crew Management",
  settings: "Studio Settings",
}

function StudiosContent() {
  const { studios, toggleFeature } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const filteredStudios = studios.filter((studio) => studio.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Studios</h1>
          <p className="text-muted-foreground mt-1">Manage all tenant studios and their configurations</p>
        </div>
        <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
          <Building2 className="h-4 w-4 mr-2" />
          Add New Studio
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Studio Name, Owner Email, or Subdomain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Master Table */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>All Studios</CardTitle>
          <CardDescription>Complete tenant registry with configuration controls</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Owner</TableHead>
                <TableHead className="font-bold">Plan</TableHead>
                <TableHead className="font-bold">Storage Used</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Last Login</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudios.map((studio) => (
                <TableRow key={studio.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">{studio.name}</TableCell>
                  <TableCell className="text-muted-foreground">owner@{studio.id}.com</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#1C4D8D]/10 text-[#1C4D8D] border-[#1C4D8D]/20">
                      Pro
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>2.4 GB</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">2 hours ago</TableCell>
                  <TableCell className="text-right space-x-2">
                    <FeatureManager studio={studio} onToggle={(f) => toggleFeature(studio.id, f)} />
                    <Button variant="outline" size="sm" className="hover:bg-[#4988C4] hover:text-white bg-transparent">
                      <UserCog className="h-4 w-4 mr-2" />
                      Impersonate
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

function FeatureManager({ studio, onToggle }: { studio: StudioConfig; onToggle: (f: Feature) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-[#1C4D8D] hover:text-white bg-transparent">
          <Settings2 className="h-4 w-4 mr-2" />
          Features
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Feature Manager: {studio.name}</DialogTitle>
          <DialogDescription>Enable or disable specific modules for this studio tenant.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {(Object.keys(FEATURE_LABELS) as Feature[]).map((feature) => (
            <div key={feature} className="flex items-center justify-between space-x-4 p-3 rounded-lg bg-slate-50/50">
              <div className="flex flex-col space-y-1">
                <Label htmlFor={`feature-${feature}`} className="font-medium">
                  {FEATURE_LABELS[feature]}
                </Label>
                <p className="text-xs text-muted-foreground">Allow access to the {feature} module</p>
              </div>
              <Switch
                id={`feature-${feature}`}
                checked={studio.features.includes(feature)}
                onCheckedChange={() => onToggle(feature)}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function StudiosPage() {
  return (
    <Suspense fallback={null}>
      <StudiosContent />
    </Suspense>
  )
}
