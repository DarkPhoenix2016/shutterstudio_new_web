"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

export default function CalendarPage() {
  const days = Array.from({ length: 35 }, (_, i) => i - 3)
  const monthNames = ["October", "November", "December"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shoot Schedule</h1>
          <p className="text-muted-foreground text-sm">October 2025</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden bg-white shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 text-sm font-medium border-x">Today</div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Schedule Shoot
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-gradient-to-r from-slate-50 to-slate-100">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-xs font-bold text-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-collapse">
            {days.map((day, i) => {
              const isCurrentMonth = day > 0 && day <= 31
              const hasEvent = day === 12 || day === 15 || day === 22

              return (
                <div
                  key={i}
                  className="min-h-[120px] p-2 border-r border-b last:border-r-0 relative hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <span
                    className={`text-sm font-medium ${isCurrentMonth ? "text-foreground" : "text-muted-foreground/30"}`}
                  >
                    {day > 0 ? (day > 31 ? day - 31 : day) : 31 + day}
                  </span>
                  {hasEvent && isCurrentMonth && (
                    <div className="mt-2 space-y-1">
                      <Badge className="w-full justify-start text-[10px] bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 font-bold py-1 hover:from-primary/30 hover:to-primary/20">
                        10:00 • Sarah Wedding
                      </Badge>
                      {day === 15 && (
                        <Badge className="w-full justify-start text-[10px] bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary border border-secondary/20 font-bold py-1 hover:from-secondary/30 hover:to-secondary/20">
                          14:00 • TechFlow
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
