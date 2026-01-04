"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Save, Mail, Megaphone } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Settings</h1>
        <p className="text-muted-foreground mt-1">Platform-wide configuration and system controls</p>
      </div>

      {/* Maintenance Mode */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle>System Maintenance</CardTitle>
          <CardDescription>Control platform availability for all users</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-[#1C4D8D]" />
              <div>
                <Label className="font-medium text-foreground">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Display "Under Maintenance" to all users</p>
              </div>
            </div>
            <Switch />
          </div>
          <div className="flex items-center gap-2 px-4">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              System Online
            </Badge>
            <span className="text-sm text-muted-foreground">All services operational</span>
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#1C4D8D]" />
            Platform Announcements
          </CardTitle>
          <CardDescription>Push banner messages to every dashboard</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement" className="font-medium">
              Announcement Message
            </Label>
            <Textarea
              id="announcement"
              placeholder="e.g., 'New Feature Alert! The Consultation Wizard now supports video calls.'"
              className="min-h-[100px]"
            />
          </div>
          <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
            <Megaphone className="h-4 w-4 mr-2" />
            Broadcast to All Studios
          </Button>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#1C4D8D]" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>Email server settings for password resets and notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" placeholder="smtp.example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input id="smtp-port" placeholder="587" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username</Label>
              <Input id="smtp-user" placeholder="noreply@shutterstudio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Password</Label>
              <Input id="smtp-pass" type="password" placeholder="••••••••" />
            </div>
          </div>
          <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90">
            <Save className="h-4 w-4 mr-2" />
            Save SMTP Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
