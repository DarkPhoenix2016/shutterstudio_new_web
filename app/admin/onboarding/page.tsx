"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Clock } from "lucide-react"

const pendingRequests = [
  {
    id: 1,
    studioName: "Pixel Perfect Studios",
    ownerEmail: "owner@pixelperfect.com",
    plan: "Pro",
    submittedDate: "2 days ago",
  },
  {
    id: 2,
    studioName: "Flash & Focus",
    ownerEmail: "admin@flashfocus.com",
    plan: "Starter",
    submittedDate: "5 days ago",
  },
  {
    id: 3,
    studioName: "Lens Legends",
    ownerEmail: "contact@lenslegends.com",
    plan: "Agency",
    submittedDate: "1 week ago",
  },
]

export default function OnboardingPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Onboarding Requests</h1>
        <p className="text-muted-foreground mt-1">Review and approve pending studio applications</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>Studios awaiting manual approval for database provisioning</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="font-bold">Studio Name</TableHead>
                <TableHead className="font-bold">Owner Email</TableHead>
                <TableHead className="font-bold">Requested Plan</TableHead>
                <TableHead className="font-bold">Submitted</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">{request.studioName}</TableCell>
                  <TableCell className="text-muted-foreground">{request.ownerEmail}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#1C4D8D]/10 text-[#1C4D8D] border-[#1C4D8D]/20">
                      {request.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {request.submittedDate}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-red-50 hover:text-red-700 hover:border-red-200 bg-transparent"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
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
