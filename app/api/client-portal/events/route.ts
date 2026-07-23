import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from "firebase/firestore"
import { verifySessionToken } from "@/lib/portal-crypto"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studioId = searchParams.get("studioId")
    const sessionToken = searchParams.get("sessionToken")

    if (!studioId || !sessionToken) {
      return NextResponse.json(
        { success: false, error: "Missing studio ID or session token." },
        { status: 400 }
      )
    }

    // 1. Verify session statelessly
    const sessionInfo = verifySessionToken(sessionToken, studioId)
    if (!sessionInfo) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      )
    }

    const clientPhone = sessionInfo.phone.replace(/\D/g, "").slice(-9)

    // 2. Fetch studio, packages, and events (filtered by candidate list to optimize)
    const eventsRef = collection(db, "Studios", studioId, "Events")
    const candidates = [
      `+94${clientPhone}`,
      `+1${clientPhone}`,
      `0${clientPhone}`,
      clientPhone
    ]
    const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean)
    const eventsQuery = query(eventsRef, where("customerMobile", "in", uniqueCandidates))

    const [studioSnap, packagesSnap, eventsSnap] = await Promise.all([
      getDoc(doc(db, "Studios", studioId)),
      getDocs(collection(db, "Studios", studioId, "Packages")),
      getDocs(eventsQuery)
    ])

    const studioData = studioSnap.exists() ? studioSnap.data() : {}
    const packagesList = packagesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Filter events matching clientPhone (last 9 digits)
    const matchedEvents = (eventsSnap.docs
      .map(d => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
          days: Array.isArray(data.days)
            ? data.days.map((day: any) => ({
                ...day,
                date: day.date instanceof Timestamp ? day.date.toDate() : day.date
              }))
            : [],
          locations: Array.isArray(data.locations)
            ? data.locations.map((loc: any) => ({
                ...loc,
                date: loc.date instanceof Timestamp ? loc.date.toDate() : loc.date
              }))
            : [],
          transactions: Array.isArray(data.transactions)
            ? data.transactions.map((t: any) => ({
                ...t,
                date: t.date instanceof Timestamp ? t.date.toDate() : t.date
              }))
            : [],
          contacts: data.contacts || []
        }
      }) as any[])
      .filter(event => {
        const mobile = event.customerMobile
        if (!mobile) return false
        return mobile.replace(/\D/g, "").slice(-9) === clientPhone
      })

    return NextResponse.json({
      success: true,
      events: matchedEvents,
      packages: packagesList,
      studio: {
        name: studioData.name || "Photography Studio",
        logo_url: studioData.logo_url || "",
        cover_url: studioData.cover_url || "",
        address: studioData.address || "",
        phone: studioData.phone || "",
        email: studioData.email || "",
        website: studioData.website || "",
        banking_details: studioData.banking_details || null,
        privacy_policy_notice: studioData.privacy_policy_notice || ""
      }
    })

  } catch (error: any) {
    console.error("Fetch events error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve events data.", code: error.code || null },
      { status: 500 }
    )
  }
}
