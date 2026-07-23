import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface PublicStudioData {
  id: string
  name: string
  slug: string
  logo_url?: string
  cover_url?: string
  phone?: string
  email?: string
  website?: string
  address?: string
}

/**
 * Fetches a studio document by its unique URL slug.
 * Used by middleware-rewritten subdomain routes to resolve the public studio page.
 */
export async function getStudioBySlug(slug: string): Promise<PublicStudioData | null> {
  try {
    if (!slug || typeof slug !== "string") return null

    const normalized = slug.toLowerCase().trim()
    const studiosRef = collection(db, "Studios")
    const q = query(studiosRef, where("slug", "==", normalized), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      id: doc.id,
      name: data.name || "",
      slug: data.slug || "",
      logo_url: data.logo_url,
      cover_url: data.cover_url,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
    }
  } catch (error) {
    console.error("Error fetching studio by slug:", error)
    return null
  }
}

/**
 * Checks whether a given slug is available (not already taken by another studio).
 * Pass `currentStudioId` to exclude the current studio from the uniqueness check.
 */
export async function isSlugAvailable(
  slug: string,
  currentStudioId?: string
): Promise<boolean> {
  try {
    if (!slug) return false

    const normalized = slug.toLowerCase().trim()
    const studiosRef = collection(db, "Studios")
    const q = query(studiosRef, where("slug", "==", normalized), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return true

    // If the only match is the current studio, the slug is "available" for them
    if (currentStudioId && snapshot.docs[0].id === currentStudioId) return true

    return false
  } catch (error) {
    console.error("Error checking slug availability:", error)
    return false
  }
}

// Reserved slugs that cannot be used by studios
const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "mail",
  "ftp",
  "blog",
  "support",
  "help",
  "status",
  "docs",
  "cdn",
  "static",
  "assets",
  "login",
  "signup",
  "register",
])

/**
 * Validates a slug string against formatting and reservation rules.
 * Returns an error message string or `null` if valid.
 */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug is required"
  if (slug.length < 3) return "Must be at least 3 characters"
  if (slug.length > 30) return "Must be 30 characters or fewer"
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return "Only lowercase letters, numbers, and hyphens allowed (cannot start/end with hyphen)"
  }
  if (RESERVED_SLUGS.has(slug)) return "This subdomain is reserved"
  return null
}
