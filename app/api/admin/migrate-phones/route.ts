import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, writeBatch } from "firebase/firestore"
import { parsePhoneNumberFromString } from "libphonenumber-js"

function normalizeToE164(phone: string, defaultCountry: string = "LK"): string | null {
  if (!phone) return null
  const cleaned = phone.trim()
  if (!cleaned) return null

  // Try parsing directly (in case it already starts with + or is in international format)
  let parsed = parsePhoneNumberFromString(cleaned)
  if (parsed && parsed.isValid()) {
    return parsed.format("E.164")
  }

  // Try parsing with default country fallback
  parsed = parsePhoneNumberFromString(cleaned, defaultCountry as any)
  if (parsed && parsed.isValid()) {
    return parsed.format("E.164")
  }

  // If still invalid, try cleaning common local patterns e.g. "071234567" to Sri Lankan local format
  if (defaultCountry === "LK") {
    let rawDigits = cleaned.replace(/\D/g, "")
    if (rawDigits.length === 9 && !rawDigits.startsWith("0")) {
      rawDigits = "0" + rawDigits
    }
    if (rawDigits.length === 10 && rawDigits.startsWith("0")) {
      const formatted = "+94" + rawDigits.substring(1)
      const parsedSriLankan = parsePhoneNumberFromString(formatted, "LK")
      if (parsedSriLankan && parsedSriLankan.isValid()) {
        return parsedSriLankan.format("E.164")
      }
    }
  }

  // Last-ditch normalization fallback: add '+' if it looks like a clean international number
  if (cleaned.startsWith("94") && (cleaned.length === 11 || cleaned.length === 12)) {
    const formatted = "+" + cleaned
    const parsedSriLankan = parsePhoneNumberFromString(formatted, "LK")
    if (parsedSriLankan && parsedSriLankan.isValid()) {
      return parsedSriLankan.format("E.164")
    }
  }

  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  const devMode = process.env.NODE_ENV === "development"
  const overrideSecret = process.env.ADMIN_MIGRATION_SECRET || "shutterstudio-migrate-2026"

  if (secret !== overrideSecret && !devMode) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 })
  }

  const report = {
    users: { total: 0, migrated: 0, errors: 0 },
    studios: { total: 0, migrated: 0, errors: 0 },
    events: { total: 0, migrated: 0, errors: 0 },
    consultations: { total: 0, migrated: 0, errors: 0 },
    logs: [] as string[]
  }

  try {
    let batch = writeBatch(db)
    let opCount = 0

    const commitBatchIfNeeded = async () => {
      if (opCount >= 450) {
        await batch.commit()
        batch = writeBatch(db)
        opCount = 0
        report.logs.push("Committed a batch of updates to Firestore.")
      }
    }

    // 1. MIGRATE USERS
    const usersSnap = await getDocs(collection(db, "Users"))
    for (const userDoc of usersSnap.docs) {
      report.users.total++
      const data = userDoc.data()
      const rawPhone = data.phoneNumber || data.phone
      if (rawPhone && typeof rawPhone === "string") {
        const country = data.country || "LK"
        const normalized = normalizeToE164(rawPhone, country)
        if (normalized && normalized !== rawPhone) {
          batch.update(doc(db, "Users", userDoc.id), {
            phoneNumber: normalized,
            phone: normalized // support both fields if they co-exist
          })
          opCount++
          report.users.migrated++
          await commitBatchIfNeeded()
        }
      }
    }

    // 2. MIGRATE STUDIOS & SUB-COLLECTIONS
    const studiosSnap = await getDocs(collection(db, "Studios"))
    for (const studioDoc of studiosSnap.docs) {
      report.studios.total++
      const studioData = studioDoc.data()
      const studioId = studioDoc.id

      // Studio phone
      const rawStudioPhone = studioData.phone
      if (rawStudioPhone && typeof rawStudioPhone === "string") {
        const normalized = normalizeToE164(rawStudioPhone, "LK")
        if (normalized && normalized !== rawStudioPhone) {
          batch.update(doc(db, "Studios", studioId), { phone: normalized })
          opCount++
          report.studios.migrated++
          await commitBatchIfNeeded()
        }
      }

      // Studio Events
      try {
        const eventsSnap = await getDocs(collection(db, "Studios", studioId, "Events"))
        for (const eventDoc of eventsSnap.docs) {
          report.events.total++
          const eventData = eventDoc.data()
          let needsUpdate = false
          const updates: any = {}

          // customerMobile
          if (eventData.customerMobile && typeof eventData.customerMobile === "string") {
            const normalized = normalizeToE164(eventData.customerMobile, "LK")
            if (normalized && normalized !== eventData.customerMobile) {
              updates.customerMobile = normalized
              needsUpdate = true
            }
          }

          // contacts array
          if (Array.isArray(eventData.contacts)) {
            const updatedContacts = eventData.contacts.map((contact: any) => {
              if (contact && contact.phone && typeof contact.phone === "string") {
                const normalized = normalizeToE164(contact.phone, "LK")
                if (normalized && normalized !== contact.phone) {
                  needsUpdate = true
                  return { ...contact, phone: normalized }
                }
              }
              return contact
            })

            if (needsUpdate) {
              updates.contacts = updatedContacts
            }
          }

          if (needsUpdate) {
            batch.update(doc(db, "Studios", studioId, "Events", eventDoc.id), updates)
            opCount++
            report.events.migrated++
            await commitBatchIfNeeded()
          }
        }
      } catch (eventErr: any) {
        report.logs.push(`Error reading events for studio ${studioId}: ${eventErr.message}`)
      }

      // Studio Consultations
      try {
        const consultationsSnap = await getDocs(collection(db, "Studios", studioId, "Consultations"))
        for (const consultationDoc of consultationsSnap.docs) {
          report.consultations.total++
          const consultationData = consultationDoc.data()
          if (consultationData.client && consultationData.client.mobile && typeof consultationData.client.mobile === "string") {
            const normalized = normalizeToE164(consultationData.client.mobile, "LK")
            if (normalized && normalized !== consultationData.client.mobile) {
              batch.update(doc(db, "Studios", studioId, "Consultations", consultationDoc.id), {
                "client.mobile": normalized
              })
              opCount++
              report.consultations.migrated++
              await commitBatchIfNeeded()
            }
          }
        }
      } catch (consultationErr: any) {
        report.logs.push(`Error reading consultations for studio ${studioId}: ${consultationErr.message}`)
      }
    }

    // Commit any remaining updates
    if (opCount > 0) {
      await batch.commit()
      report.logs.push("Committed the final batch of updates to Firestore.")
    }

    return NextResponse.json({
      success: true,
      message: "Phone numbers migration completed successfully.",
      report
    })

  } catch (error: any) {
    console.error("Migration fatal error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      report
    }, { status: 500 })
  }
}
