import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" // Ensure this points to your firebase config

export interface PlatformPackage {
  id: string
  name: string
  price: number
  description?: string
  users_limit: number
  events_limit: number
  photos_per_event: number
  features: string[]
  featured: boolean
  include_price_table: boolean
  accentColor?: string // Optional for UI styling
}

export async function fetchPlatformPackages() {
  try {
    const ref = doc(db, "Platform", "packages")
    const snap = await getDoc(ref)

    if (!snap.exists()) return []

    const data = snap.data()
    
    // Use the packages_list array to determine order
    // Default to empty array if packages_list is missing
    const list = data.packages_list || []

    const orderedPackages = list.map((key: string) => {
      // safely access the package object inside the document
      const pkgData = data[key]
      return {
        id: key,
        ...pkgData,
        // Ensure price is a number for calculation, even if string in DB
        price: Number(pkgData.price) || 0, 
      }
    })

    return orderedPackages as PlatformPackage[]
  } catch (error) {
    console.error("Error fetching packages:", error)
    return []
  }
}