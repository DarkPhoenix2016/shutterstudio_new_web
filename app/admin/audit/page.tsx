"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Shield, Clock } from "lucide-react"

const auditLogs = [
  {
    id: 1,
    action: "Suspended Studio",
    target: "Flash & Focus",
    admin: "Root Admin",
    timestamp: "Dec 12, 2024 at 3:45 PM",
    severity: "high",
  },
  {
    id: 2,
    action: "Enabled Payment Module",
    target: "Demo Studio",
    admin: "Root Admin",
    timestamp: "Dec 10, 2024 at 10:22 AM",
    severity: "medium",
  },
  {
    id: 3,
    action: "Updated SMTP Config",
    target: "Global Settings",
    admin: "Root Admin",
    timestamp: "Dec 8, 2024 at 2:15 PM",
    severity: "medium",
  },
  {
    id: 4,
    action: "Approved Studio Application",
    target: "Pixel Perfect Studios",
    admin: "Root Admin",
    timestamp: "Dec 5, 2024 at 9:30 AM",
    severity: "low",
  },
  {
    id: 5,
    action: "Changed Plan Pricing",
    target: "Pro Plan",
    admin: "Root Admin",
    timestamp: "Dec 1, 2024 at 4:00 PM",
    severity: "high",
  },
]

export default function AuditPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#1C4D8D]/10">
          <Shield className="h-6 w-6 text-[#1C4D8D]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Immutable record of all administrative actions</p>
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[#1C4D8D]" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Read-only log of every action taken by administrators</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="font-bold">Action</TableHead>
                <TableHead className="font-bold">Target</TableHead>
                <TableHead className="font-bold">Admin</TableHead>
                <TableHead className="font-bold">Timestamp</TableHead>
                <TableHead className="font-bold">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-foreground">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="text-foreground">{log.admin}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {log.timestamp}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.severity === "high" && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        High
                      </Badge>
                    )}
                    {log.severity === "medium" && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Medium
                      </Badge>
                    )}
                    {log.severity === "low" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Low
                      </Badge>
                    )}
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
