import { Timestamp } from "firebase/firestore"

/**
 * Safely converts any date input (Firestore Timestamp, Date, string, plain object
 * with `seconds`) to a JS Date. Falls back to the current date on failure so
 * callers never receive `Invalid Date`.
 */
export function safeDate(dateInput: unknown): Date {
  try {
    if (!dateInput) return new Date()
    if (dateInput instanceof Date) return dateInput
    if (dateInput instanceof Timestamp) return dateInput.toDate()
    if (typeof dateInput === "object") {
      const obj = dateInput as Record<string, unknown>
      if (typeof obj.toDate === "function") return (obj.toDate as () => Date)()
      if (typeof obj.seconds === "number") return new Date(obj.seconds * 1000)
    }
    const d = new Date(dateInput as string | number)
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}
