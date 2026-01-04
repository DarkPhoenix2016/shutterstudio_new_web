"use client"

import type React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Camera, Upload, Mail, User, Shield, Plus, Trash2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export default function RootAdminProfile() {
  const {
    rootAdminProfile,
    updateRootAdminProfile,
    secondaryAdmins,
    addSecondaryAdmin,
    removeSecondaryAdmin,
    toggleSecondaryAdminStatus,
  } = useStore()

  const [profileName, setProfileName] = useState(rootAdminProfile.name)
  const [profileEmail, setProfileEmail] = useState(rootAdminProfile.email)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminName, setNewAdminName] = useState("")
  const [profilePicPreview, setProfilePicPreview] = useState(rootAdminProfile.profilePicture)

  const handleSaveProfile = () => {
    updateRootAdminProfile({
      name: profileName,
      email: profileEmail,
      profilePicture: profilePicPreview,
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddSecondaryAdmin = () => {
    if (newAdminEmail && newAdminName) {
      addSecondaryAdmin({
        email: newAdminEmail,
        name: newAdminName,
        enabled: true,
      })
      setNewAdminEmail("")
      setNewAdminName("")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Root Admin Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your administrator account and configure secondary admin access
          </p>
        </div>
        <Badge variant="outline" className="bg-[#1C4D8D] text-white border-[#1C4D8D] px-4 py-2 text-sm">
          <Shield className="h-4 w-4 mr-2" />
          Super Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile Card */}
        <Card className="lg:col-span-1 border-none shadow-lg">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#1C4D8D]" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div
                  className={cn(
                    "w-32 h-32 rounded-full border-4 border-[#1C4D8D]/20 overflow-hidden flex items-center justify-center",
                    profilePicPreview ? "bg-slate-100" : "bg-gradient-to-br from-[#1C4D8D] to-[#4988C4]",
                  )}
                >
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview || "/placeholder.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">{profileName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <label
                  htmlFor="profile-upload"
                  className="absolute bottom-0 right-0 p-2 bg-[#1C4D8D] rounded-full cursor-pointer hover:bg-[#4988C4] transition-colors shadow-lg"
                >
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Click camera icon to upload new picture</p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Full Name
              </Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your full name"
                className="border-slate-300"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Primary Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="admin@example.com"
                className="border-slate-300"
              />
            </div>

            {/* Created Date */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Account created: {new Date(rootAdminProfile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full bg-[#1C4D8D] hover:bg-[#4988C4] text-white">
              <Upload className="h-4 w-4 mr-2" />
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Secondary Admins Management */}
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#1C4D8D]" />
              Secondary Admin Accounts
            </CardTitle>
            <CardDescription>
              Add additional administrators with full Root Admin privileges. You can enable or disable access at any
              time.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Add New Admin Form */}
            <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/30">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#1C4D8D]" />
                Add New Secondary Admin
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="new-admin-name" className="text-sm">
                    Full Name
                  </Label>
                  <Input
                    id="new-admin-name"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="John Doe"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-admin-email" className="text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="new-admin-email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="border-slate-300"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddSecondaryAdmin}
                disabled={!newAdminEmail || !newAdminName}
                className="bg-[#1C4D8D] hover:bg-[#4988C4] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Secondary Admin
              </Button>
            </div>

            {/* Secondary Admins List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground mb-3">Existing Secondary Admins</h3>
              {secondaryAdmins.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-lg border border-dashed">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No secondary admins added yet</p>
                  <p className="text-xs mt-1">Add your first secondary administrator using the form above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {secondaryAdmins.map((admin) => (
                    <Card
                      key={admin.id}
                      className={cn(
                        "border transition-all hover:shadow-md",
                        admin.enabled ? "border-[#1C4D8D]/20 bg-white" : "border-slate-200 bg-slate-50",
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-md",
                                admin.enabled ? "bg-gradient-to-br from-[#1C4D8D] to-[#4988C4]" : "bg-slate-400",
                              )}
                            >
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground truncate">{admin.name}</h4>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    admin.enabled
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200",
                                  )}
                                >
                                  {admin.enabled ? "Active" : "Disabled"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Added: {new Date(admin.addedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`toggle-${admin.id}`} className="text-sm font-medium cursor-pointer">
                                {admin.enabled ? "Enabled" : "Disabled"}
                              </Label>
                              <Switch
                                id={`toggle-${admin.id}`}
                                checked={admin.enabled}
                                onCheckedChange={() => toggleSecondaryAdminStatus(admin.id)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSecondaryAdmin(admin.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
