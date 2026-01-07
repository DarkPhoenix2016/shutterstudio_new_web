"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Building2, Mail, Phone } from "lucide-react"
import { useQRCode } from "next-qrcode"

export default function ContactCard() {
  const { userData, studioData } = useAuth()
  const { Canvas } = useQRCode()

  const placeholderProfileImage = "/images/avatar/avatar.jpg"

  const formatRole = (role?: string) => {
    if (!role) return ""
    return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // [!code highlight] Logic: Designation > Role
  const displayTitle = userData?.designation || formatRole(userData?.role)

  // Generate VCard String
  const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${userData?.displayName || ""}
TEL;TYPE=Mobile:${userData?.phoneNumber || ""}
EMAIL;TYPE=Work:${userData?.email || ""}
ORG:${studioData?.name || "Lumina Studio"}
TITLE:${displayTitle} 
ADR;TYPE=WORK:${studioData?.address || ""}
END:VCARD`.trim()

  return (
    <Card className="w-full max-w-sm mx-auto bg-white shadow-2xl border-0 overflow-hidden">
      <CardContent className="p-0">
        {/* Digital Card Header */}
        <div className="bg-[#1C4D8D] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-30 rotate-12 scale-150" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-full p-1 shadow-lg">
                <Image
                src={userData?.photoURL || placeholderProfileImage}
                alt="Avatar"
                width={80}
                height={80}
                className="rounded-full object-cover w-full h-full"
                />
            </div>
            <h2 className="text-lg font-bold">{userData?.displayName}</h2>
            {/* [!code highlight] Shows Designation OR Role */}
            <p className="text-blue-100 text-xs uppercase tracking-wide opacity-90">
                {displayTitle}
            </p>
          </div>
        </div>

        {/* Info Rows */}
        <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-[#1C4D8D]" />
                <span className="truncate">{userData?.email}</span>
            </div>
            {userData?.phoneNumber && (
                <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-[#1C4D8D]" />
                    <span>{userData.phoneNumber}</span>
                </div>
            )}
            <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-[#1C4D8D]" />
                <span>{studioData?.name}</span>
            </div>
        </div>

        {/* QR Code */}
        <div className="p-5 bg-slate-50 border-t flex flex-col items-center">
          <div className="bg-white p-2 rounded shadow-sm border">
            <Canvas
              text={vCardData}
              options={{
                errorCorrectionLevel: "M",
                margin: 2,
                scale: 4,
                width: 140,
                color: { dark: "#0F2854", light: "#ffffff" },
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Scan to save contact</p>
        </div>
      </CardContent>
    </Card>
  )
}