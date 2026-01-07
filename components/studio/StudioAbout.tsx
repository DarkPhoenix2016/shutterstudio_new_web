"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Building2, FileText, Globe, Hash, Mail, Phone, TrendingUp } from "lucide-react"

export default function StudioAbout() {
  const { studioData } = useAuth()

  const generalInfo = [
    {
      icon: Building2,
      label: "Studio Name",
      value: studioData?.name,
      className: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      icon: Mail,
      label: "Email",
      value: studioData?.email,
      className: "text-green-600 bg-green-50 border-green-100",
    },
    {
      icon: Globe,
      label: "Website",
      value: studioData?.website,
      className: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      icon: Phone,
      label: "Contact Number",
      value: studioData?.phone,
      className: "text-orange-600 bg-orange-50 border-orange-100",
    },
  ]

  const settingsInfo = [
    {
      icon: FileText,
      label: "Invoice Prefix",
      value: studioData?.invoice_text || "INV",
      className: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      icon: Hash,
      label: "Next Invoice #",
      value: studioData?.invoice_number || "1000",
      className: "text-pink-600 bg-pink-50 border-pink-100",
    },
    {
      icon: TrendingUp,
      label: "Total Invoices",
      value: studioData?.invoice_current || "0",
      className: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
  ]

  return (
    <div className="space-y-6">
      {/* General Info Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1C4D8D]" />
            Studio Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalInfo.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                <div className={`p-2 rounded-md border ${item.className}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{item.value || "Not set"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Settings Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#1C4D8D] rounded-full" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {settingsInfo.map((item, index) => (
              <div key={index} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors text-center">
                <div className={`p-2 rounded-full mb-2 border ${item.className} bg-white`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{item.label}</p>
                <p className="text-lg font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}