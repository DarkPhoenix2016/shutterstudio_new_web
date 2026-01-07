"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Building2, CheckCircle, MapPin, Globe } from "lucide-react"

export default function StudioHeader() {
  const { studioData, loading } = useAuth()

  const placeholderLogo = "/images/avatar/avatar.jpg"
  const placeholderCover = "/images/background/profile-cover.jpg"

  if (loading) return <div className="h-64 bg-slate-100 animate-pulse rounded-lg" />

  return (
    <Card className="overflow-hidden border-0 shadow-md p-0">
      <CardContent className="p-0">
        {/* Cover Image */}
        <div className="relative h-52 md:h-64 w-full bg-slate-200">
          <Image 
            src={studioData?.cover_url || placeholderCover} 
            alt="Studio Cover" 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Verified Badge */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-600 flex items-center gap-1.5 px-3 py-1 shadow-lg backdrop-blur-sm border-0">
              <CheckCircle className="h-3.5 w-3.5" />
              Verified Studio
            </Badge>
          </div>
        </div>

        {/* Studio Info Section */}
        <div className="relative bg-white px-6 pb-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            
            {/* Logo */}
            <div className="relative z-10 shrink-0">
                <div className="w-32 h-32 rounded-full border-[5px] border-white shadow-lg overflow-hidden bg-white relative">
                    <Image
                        src={studioData?.logo_url || placeholderLogo}
                        alt="Studio Logo"
                        fill
                        className="object-cover"
                    />
                </div>
                {/* Pro Badge Icon */}
                <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-1.5 rounded-full border-4 border-white shadow-sm">
                    <Building2 className="w-4 h-4" />
                </div>
            </div>

            {/* Text Info */}
            <div className="flex-1 space-y-2 pt-2 sm:pb-2 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                    {studioData?.name || "Studio Name"}
                </h1>
                
                {/* Website Badge */}
                {studioData?.website && (
                    <a href={studioData.website} target="_blank" rel="noreferrer" className="hidden sm:inline-flex">
                        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer transition-colors">
                            <Globe className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">{studioData.website.replace(/^https?:\/\//, '')}</span>
                        </Badge>
                    </a>
                )}
              </div>

              {/* Address */}
              {studioData?.address && (
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{studioData.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}