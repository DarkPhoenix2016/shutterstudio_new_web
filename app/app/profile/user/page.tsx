"use client"

import { useState } from "react"
import ProfileHeader from "@/components/profile/ProfileHeader"
import AboutMe from "@/components/profile/AboutMe"
import ContactCard from "@/components/profile/ContactCard"
import { Button } from "@/components/ui/button"
import { QrCode, X } from "lucide-react"

export default function UserProfilePage() {
  const [showContactModal, setShowContactModal] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50/50 pb-10">
      
      {/* 1. Header Area */}
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <ProfileHeader />

        {/* 2. Action Bar */}
        <div className="flex justify-center md:justify-end">
            <Button 
                onClick={() => setShowContactModal(true)}
                className="bg-gradient-to-r from-[#1C4D8D] to-[#2a62a7] hover:shadow-lg transition-all text-white gap-2"
            >
                <QrCode className="h-4 w-4" /> View Digital Card
            </Button>
        </div>

        {/* 3. Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
                <AboutMe />
            </div>
        </div>
      </div>

      {/* 4. Contact Modal Overlay */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-200">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full"
                    onClick={() => setShowContactModal(false)}
                >
                    <X className="h-6 w-6" />
                </Button>
                <ContactCard />
            </div>
        </div>
      )}

    </div>
  )
}