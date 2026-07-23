import { db } from "@/lib/firebase"
import { collection, doc, getDocs, writeBatch } from "firebase/firestore"
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

  // If still invalid, try cleaning Sri Lankan standard local formats
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

export async function runStudioPhoneMigration(
  studioId: string,
  defaultCountry: string = "LK",
  onProgress: (msg: string) => void
) {
  onProgress("Starting phone number migration for studio...")
  
  let batch = writeBatch(db)
  let opCount = 0
  let migratedEvents = 0
  let migratedConsultations = 0

  const commitBatchIfNeeded = async () => {
    if (opCount >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      opCount = 0
      onProgress("Committed intermediate update batch to Firestore.")
    }
  }

  // 1. Events migration
  onProgress("Fetching studio events...")
  const eventsSnap = await getDocs(collection(db, "Studios", studioId, "Events"))
  onProgress(`Found ${eventsSnap.size} events. Normalizing phone numbers...`)

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data()
    let needsUpdate = false
    const updates: any = {}

    // customerMobile
    if (eventData.customerMobile && typeof eventData.customerMobile === "string") {
      const normalized = normalizeToE164(eventData.customerMobile, defaultCountry)
      if (normalized && normalized !== eventData.customerMobile) {
        updates.customerMobile = normalized
        needsUpdate = true
      }
    }

    // contacts array
    if (Array.isArray(eventData.contacts)) {
      const updatedContacts = eventData.contacts.map((contact: any) => {
        if (contact && contact.phone && typeof contact.phone === "string") {
          const normalized = normalizeToE164(contact.phone, defaultCountry)
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
      migratedEvents++
      await commitBatchIfNeeded()
    }
  }

  // 2. Consultations migration
  onProgress("Fetching studio consultations...")
  const consultationsSnap = await getDocs(collection(db, "Studios", studioId, "Consultations"))
  onProgress(`Found ${consultationsSnap.size} consultations. Normalizing phone numbers...`)

  for (const consultationDoc of consultationsSnap.docs) {
    const consultationData = consultationDoc.data()
    if (consultationData.client && consultationData.client.mobile && typeof consultationData.client.mobile === "string") {
      const normalized = normalizeToE164(consultationData.client.mobile, defaultCountry)
      if (normalized && normalized !== consultationData.client.mobile) {
        batch.update(doc(db, "Studios", studioId, "Consultations", consultationDoc.id), {
          "client.mobile": normalized
        })
        opCount++
        migratedConsultations++
        await commitBatchIfNeeded()
      }
    }
  }

  // Commit any remaining updates
  if (opCount > 0) {
    await batch.commit()
    onProgress("Committed the final batch of updates to Firestore.")
  }

  onProgress(`Migration finished. Standardized phone numbers in ${migratedEvents} events and ${migratedConsultations} consultations.`)
  return { migratedEvents, migratedConsultations }
}
