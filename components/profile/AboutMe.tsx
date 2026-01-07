"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Building2, Mail, MapPin, Phone, User, Briefcase, ShieldCheck } from "lucide-react"

export default function AboutMe() {
  const { userData, studioData } = useAuth()

  const contactInfo = [
    {
      icon: Phone,
      label: "Phone",
      value: userData?.phoneNumber || "Not set",
      className: "text-green-600 bg-green-50 border-green-100",
    },
    {
      icon: Mail,
      label: "Email",
      value: userData?.email,
      className: "text-blue-600 bg-blue-50 border-blue-100",
    },
  ]

  const studioInfo = [
    {
      icon: Building2,
      label: "Studio",
      value: studioData?.name || "No Studio",
      className: "text-purple-600 bg-purple-50 border-purple-100",
    },
    // [!code highlight] Designation (Condition: only if exists)
    ...(userData?.designation ? [{
      icon: Briefcase,
      label: "Designation",
      value: userData.designation,
      className: "text-indigo-600 bg-indigo-50 border-indigo-100",
    }] : []),
    // [!code highlight] Access Level (Role)
    {
      icon: ShieldCheck,
      label: "Access Level",
      value: userData?.role?.replace(/_/g, " ") || "Crew",
      className: "text-orange-600 bg-orange-50 border-orange-100",
    },
  ]

  return (
    <Card className="border-0 shadow-md h-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-800">About Me</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Contact Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="h-4 w-4" /> Personal Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactInfo.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                  <div className={`p-2 rounded-md border ${item.className}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{item.value}</p>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Studio Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Organization
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studioInfo.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                <div className={`p-2 rounded-md border ${item.className}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="text-sm font-medium text-slate-800 capitalize">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        {studioData?.address && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="p-2 rounded-lg bg-white border shadow-sm text-slate-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Studio Address</p>
              <p className="text-sm font-medium text-slate-800">{studioData.address}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}