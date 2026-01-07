import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"

export interface AuditLog {
  action: string
  details: string
  executor: string
  executorId: string
  timestamp: string // ISO string for easy sorting/reading
  module: string
}

export const logAuditAction = async (
  action: string,
  details: string,
  executor: { uid: string; email?: string | null; displayName?: string |null; name?: string | null },
  module: string = "System"
) => {
  try {
    const logEntry: AuditLog = {
      action,
      details,
      executor: executor.email || executor.name || executor.displayName || "Unknown User",
      executorId: executor.uid,
      timestamp: new Date().toISOString(),
      module
    }

    // Write to the 'AuditLogs' collection
    // addDoc automatically generates a unique ID for the document
    await addDoc(collection(db, "AuditLogs"), logEntry)

  } catch (error) {
    console.error("FAILED TO LOG ACTION:", error)
    // We intentionally don't throw here to prevent logging failures from breaking the app flow
  }
}