import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { generateAndStoreOTP } from "@/lib/otp-service"
import { sendSMS, normalizePhoneForSMS } from "@/lib/sms-service"

export async function POST(request: Request) {
  try {
    const { studioId, phone } = await request.json()

    if (!studioId || !phone) {
      return NextResponse.json(
        { success: false, error: "Studio ID and phone number are required." },
        { status: 400 }
      )
    }

    const cleanSearch = phone.replace(/\D/g, "").slice(-9)
    if (cleanSearch.length < 9) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number." },
        { status: 400 }
      )
    }

    // 1. Optimized query using candidate phone variations to avoid fetching all events
    const eventsRef = collection(db, "Studios", studioId, "Events")
    const candidates = [
      phone.trim(),
      phone.replace(/\s+/g, ""),
      `+94${cleanSearch}`,
      `+1${cleanSearch}`,
      `0${cleanSearch}`,
      cleanSearch,
      normalizePhoneForSMS(phone)
    ]
    const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean)

    const q = query(eventsRef, where("customerMobile", "in", uniqueCandidates))
    const snap = await getDocs(q)
    const clientEvents = snap.docs.filter((d) => {
      const mobile = d.data().customerMobile
      if (!mobile) return false
      return mobile.replace(/\D/g, "").slice(-9) === cleanSearch
    })

    if (clientEvents.length === 0) {
      return NextResponse.json(
        { success: false, error: "No events found for this phone number." },
        { status: 404 }
      )
    }

    // 2. Generate and store OTP securely
    const otpCode = await generateAndStoreOTP(phone)

    if (process.env.NODE_ENV === "development") {
      console.log(`\n--- [DEV ONLY] SERVER OTP CODE FOR CLIENT PORTAL ---`)
      console.log(`Phone: ${phone}`)
      console.log(`OTP Code: ${otpCode}`)
      console.log(`----------------------------------------------------\n`)
    }

    // 3. Send SMS via sms-service
    const messageText = `Your ShutterStudio verification code is: ${otpCode}. Valid for 5 minutes.`
    const smsResult = await sendSMS(phone, messageText)
    
    if (!smsResult.success) {
      return NextResponse.json(
        { success: false, error: smsResult.error || "Failed to send SMS." },
        { status: 500 }
      )
    }

    // 4. Do not return otpToken, client only needs to know it was successful
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("OTP send error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch verification code.", code: error.code || null },
      { status: 500 }
    )
  }
}
