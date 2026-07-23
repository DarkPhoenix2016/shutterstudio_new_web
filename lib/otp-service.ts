import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"

export async function generateAndStoreOTP(phone: string): Promise<string> {
  const otpCode = String(100000 + Math.floor(Math.random() * 900000))
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

  // Store OTP token in DB, keyed by phone
  await setDoc(doc(db, "ClientPortalOTPs", phone), {
    code: otpCode,
    expiresAt,
  })

  return otpCode
}

export async function validateOTP(phone: string, code: string): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, "")
  // Because the generated document uses the exact string passed in `phone` inside generateAndStoreOTP,
  // we must be sure to look up with `phone`, but client sends raw `phone`.
  // To be robust, the frontend sends the original `phone` state which should match.
  const docRef = doc(db, "ClientPortalOTPs", phone)
  const snap = await getDoc(docRef)

  if (!snap.exists()) {
    return false
  }

  const data = snap.data()
  if (data.code !== code) {
    return false
  }

  if (Date.now() > data.expiresAt) {
    // Expired
    await deleteDoc(docRef)
    return false
  }

  // OTP consumed successfully
  await deleteDoc(docRef)
  return true
}
