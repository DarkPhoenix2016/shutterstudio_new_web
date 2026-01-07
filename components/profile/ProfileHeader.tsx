"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Building2, Mail } from "lucide-react"

export default function ProfileHeader() {
  const { userData, studioData } = useAuth()

  const placeholderProfileImage = "/images/avatar/avatar.jpg"
  const placeholderCoverImage = "/images/background/profile-cover.jpg"

  const formatRole = (role?: string) => {
    return role ? role.replace(/_/g, " ") : "Staff"
  }

  // [!code highlight] Logic: Designation > Role
  const displayTitle = userData?.designation || formatRole(userData?.role);

  return (
    <Card className="overflow-hidden border-0 shadow-md p-0">
      <CardContent className="p-0">
        <div className="relative h-64 md:h-80 w-full bg-slate-200">
          <Image 
            src={userData?.coverURL || placeholderCoverImage} 
            alt="Cover Image" 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative bg-white px-6 pb-6 -mt-12 sm:-mt-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 z-10 shrink-0">
                <Image
                  src={userData?.photoURL || placeholderProfileImage}
                  alt="Avatar"
                  fill
                  className="rounded-full border-4 border-white shadow-lg object-cover bg-white"
                />
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left mt-2 sm:mt-0 sm:pb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                    {userData?.displayName || "User Name"}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 text-sm mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{userData?.email || "No Email"}</span>
                </div>
              </div>

              {studioData && (
                <div className="flex justify-center sm:justify-start">
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    {/* [!code highlight] Shows Designation if available */}
                    <span className="font-medium capitalize">
                      {displayTitle} <span className="text-slate-400 mx-1">@</span> {studioData.name}
                    </span>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}