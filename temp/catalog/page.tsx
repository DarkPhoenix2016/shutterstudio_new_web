"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Camera, Layers, Clock, DollarSign } from "lucide-react"

export default function CatalogPage() {
  const packages = [
    { title: "Essential Wedding", price: "$2,500", hours: 4, shooters: 1, tags: ["Entry", "Value"] },
    { title: "Premium Cinematic", price: "$4,500", hours: 8, shooters: 2, tags: ["Popular", "High-Margin"] },
    { title: "Elite Production", price: "$7,500", hours: 12, shooters: 3, tags: ["Full Day", "Premium"] },
    { title: "Engagement Mini", price: "$850", hours: 2, shooters: 1, tags: ["Add-on"] },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground text-sm">Photography packages and pricing tiers.</p>
        </div>
        <Button size="sm">Add New Package</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.title} className="border-none shadow-sm hover:shadow-lg transition-all group overflow-hidden">
            <div className="h-32 bg-slate-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
              <Camera className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap gap-1 mb-2">
                {pkg.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] font-bold uppercase">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardTitle className="text-lg">{pkg.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {pkg.hours} Hours Coverage
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" /> {pkg.shooters} Photographers
              </div>
              <div className="mt-4 text-2xl font-bold text-primary flex items-center">
                <DollarSign className="h-5 w-5" /> {pkg.price.replace("$", "")}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full bg-transparent">
                Edit Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
