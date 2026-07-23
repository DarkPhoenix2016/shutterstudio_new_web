import { NextResponse } from "next/server"
import { generateSessionToken } from "@/lib/portal-crypto"
import { validateOTP } from "@/lib/otp-service"

export async function POST(request: Request) {
  try {
    const { studioId, phone, code } = await request.json()

    if (!studioId || !phone || !code) {
      return NextResponse.json(
        { success: false, error: "Studio ID, phone, and verification code are required." },
        { status: 400 }
      )
    }

    const cleanSearch = phone.replace(/\D/g, "").slice(-9)
    if (cleanSearch.length < 9) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number." },
        { status: 400 }
      )
    }

    // Verify OTP securely via server-side state
    const isOtpValid = await validateOTP(phone, code.trim())
    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect or expired verification code. Please try again." },
        { status: 400 }
      )
    }

    // Generate signed, secure stateless session token
    const expiresDuration = 7 * 24 * 60 * 60 * 1000 // 7 days
    const expiresAt = Date.now() + expiresDuration
    const sessionToken = generateSessionToken(phone, studioId, expiresAt)

    return NextResponse.json({
      success: true,
      sessionToken,
      phone
    })

  } catch (error: any) {
    console.error("OTP verification error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Verification failed.", code: error.code || null },
      { status: 500 }
    )
  }
}
