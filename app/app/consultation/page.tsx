"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import {
  fetchEvents,
  fetchPackagesList,
  createEvent,
  EventData,
  PackageData
} from "@/services/event-service"
import {
  saveConsultation,
  convertConsultationStatus,
  ConsultationData
} from "@/services/consultation-service"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react"
import Swal from "sweetalert2"

// ---------------------------------------------------

export default function ConsultationPage() {
  const { userData } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [events, setEvents] = useState<EventData[]>([])
  const [packages, setPackages] = useState<PackageData[]>([])
  const [saving, setSaving] = useState(false)

  const [consultation, setConsultation] = useState<ConsultationData>({
    studioId: "",
    status: "draft",
    client: { name: "" },
    requirements: {
      eventType: "Wedding",
      budgetRange: [0, 350000],
      locations: [],
      styleTags: [],
      deliverables: {
        photo: true,
        video: true,
        album: true,
        drone: false
      }
    },
    inspiration: {
      matchedEventIds: [],
      selectedEventIds: []
    },
    package: {
      customItems: [],
      totalEstimate: 0
    }
  })

  // ---------------------------------------------------
  // INIT
  useEffect(() => {
    if (!userData?.studioID) return

    const init = async () => {
      const [evt, pkg] = await Promise.all([
        fetchEvents(userData.studioID),
        fetchPackagesList(userData.studioID)
      ])

      setEvents(evt)
      setPackages(pkg)
      setConsultation(c => ({ ...c, studioId: userData.studioID! }))
    }

    init()
  }, [userData])

  // ---------------------------------------------------
  // SIMILAR EVENTS
  const matchedEvents = useMemo(() => {
    return events.filter(e =>
      e.eventType === consultation.requirements.eventType &&
      e.galleryUrls?.length &&
      (
        consultation.requirements.styleTags.length === 0 ||
        e.tags?.some(t => consultation.requirements.styleTags.includes(t))
      )
    )
  }, [events, consultation.requirements])

  // ---------------------------------------------------
  // SAVE
  const autoSave = async () => {
    if (!userData?.studioID) return
    setSaving(true)
    const saved = await saveConsultation(userData.studioID, consultation)
    if (!consultation.id) {
      setConsultation(c => ({ ...c, id: saved.id }))
    }
    setSaving(false)
  }

  // ---------------------------------------------------
  // CONVERT
  const convertToEvent = async () => {
    if (!userData?.studioID) return

    const result = await Swal.fire({
      title: "Create Event?",
      text: "This will create a new event using this consultation.",
      showCancelButton: true,
      confirmButtonText: "Create Event"
    })

    if (!result.isConfirmed) return

    const newEvent: EventData = {
      eventName: `${consultation.requirements.eventType} - ${consultation.client.name}`,
      customerName: consultation.client.name,
      eventType: consultation.requirements.eventType,
      status: "Inquiry",
      tags: consultation.requirements.styleTags,
      notes: consultation.requirements.notes,
      dayCount: 1,
      days: consultation.requirements.preferredDate
        ? [{
            date: consultation.requirements.preferredDate,
            type: "package",
            cost: consultation.package.totalEstimate,
            customItems: []
          }]
        : []
    }

    const event = await createEvent(userData.studioID, newEvent)
    await convertConsultationStatus(userData.studioID, consultation.id!)
    router.push(`/app/events/${event.id}`)
  }

  // ---------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* CONSULTATION HEADER */}
      <div className="h-14 bg-white border-b px-6 flex items-center justify-between">
        <span className="font-semibold">Consultation</span>
        <Button variant="ghost" size="icon">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* BODY */}
      <ScrollArea className="flex-1 p-6">
        {step === 1 && (
          <div className="grid grid-cols-2 gap-6">
            {matchedEvents.map(e => (
              <Card key={e.id}>
                <CardContent className="p-2">
                  <img
                    src={e.galleryUrls?.[0]}
                    className="rounded-md object-cover h-48 w-full"
                  />
                  <div className="mt-2 font-medium">{e.eventName}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* FOOTER */}
      <div className="border-t bg-white p-4 flex justify-between">
        <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {step === 3 ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={autoSave}>Save</Button>
            <Button onClick={convertToEvent}>Save & Convert</Button>
          </div>
        ) : (
          <Button onClick={() => { autoSave(); setStep(s => s + 1) }}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
