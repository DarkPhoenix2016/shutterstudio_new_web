import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, collection, arrayUnion } from "firebase/firestore"

// --- Types ---

export interface ParameterDef {
  name: string
  type: 'text' | 'number' | 'boolean'
  unit?: string
}

export interface PackageData {
  id: string
  name: string
  price: number
  disabled: boolean
  discounted: boolean
  discountType: 'percentage' | 'fixed'
  discountValue: number
  parameters: Record<string, any>
}

// --- Service Object ---

export const CatalogueService = {
  
  // ==========================================
  // READ METHODS
  // ==========================================

  /**
   * Fetches the Studio's base configuration to get the Currency.
   * Assumes currency is stored in the root studio document (e.g., /Studios/STU_123).
   */
  async getStudioCurrency(studioId: string): Promise<string> {
    try {
      const ref = doc(db, "Studios", studioId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        return snap.data().base_currency || "$" // Default to $ if missing
      }
      return "$"
    } catch (error) {
      console.error("Error fetching currency:", error)
      return "$"
    }
  },

  /**
   * Fetches the parameter definitions from the CONFIG document.
   */
  async getParameters(studioId: string): Promise<ParameterDef[]> {
    try {
      const ref = doc(db, "Studios", studioId, "Packages", "CONFIG")
      const snap = await getDoc(ref)
      if (snap.exists()) {
        return snap.data().parameters || []
      }
      return []
    } catch (error) {
      console.error("Error fetching parameters:", error)
      return []
    }
  },

  /**
   * Fetches the list of packages based on the 'package_list' document order.
   */
  async getPackages(studioId: string): Promise<PackageData[]> {
    try {
      const listRef = doc(db, "Studios", studioId, "Packages", "package_list")
      const listSnap = await getDoc(listRef)

      if (listSnap.exists()) {
        const idList: string[] = listSnap.data().LIST || []
        
        if (idList.length > 0) {
          const fetchPromises = idList.map(async (pkgId) => {
            const pkgSnap = await getDoc(doc(db, "Studios", studioId, "Packages", pkgId))
            if (pkgSnap.exists()) {
              return { id: pkgSnap.id, ...pkgSnap.data() } as PackageData
            }
            return null
          })

          const results = await Promise.all(fetchPromises)
          return results.filter((p) => p !== null) as PackageData[]
        }
      }
      return []
    } catch (error) {
      console.error("Error fetching packages:", error)
      return []
    }
  },

  // ==========================================
  // WRITE METHODS
  // ==========================================

  /**
   * Saves the parameter configuration to the CONFIG document.
   */
  async saveParameters(studioId: string, parameters: ParameterDef[]): Promise<void> {
    const configRef = doc(db, "Studios", studioId, "Packages", "CONFIG")
    await setDoc(configRef, { parameters }, { merge: true })
  },

  /**
   * Creates or Updates a package.
   * Handles ID generation and updating the index list automatically.
   */
  async savePackage(studioId: string, pkgData: Partial<PackageData>): Promise<PackageData> {
    // 1. Determine ID (Use existing or generate new)
    let pkgId = pkgData.id
    const isNew = !pkgId

    if (isNew) {
      const newRef = doc(collection(db, "Studios", studioId, "Packages"))
      pkgId = newRef.id
    }

    // 2. Prepare Data Object
    const finalData: PackageData = {
      id: pkgId!,
      name: pkgData.name!,
      price: Number(pkgData.price || 0),
      disabled: pkgData.disabled || false,
      discounted: pkgData.discounted || false,
      discountType: pkgData.discountType || 'fixed',
      discountValue: Number(pkgData.discountValue || 0),
      parameters: pkgData.parameters || {}
    }

    // 3. Save the Package Document
    await setDoc(doc(db, "Studios", studioId, "Packages", pkgId!), finalData, { merge: true })

    // 4. If new, add ID to the master list
    if (isNew) {
      const listRef = doc(db, "Studios", studioId, "Packages", "package_list")
      await setDoc(listRef, { LIST: arrayUnion(pkgId) }, { merge: true })
    }

    return finalData
  },

  /**
   * Toggles the disabled status of a package.
   */
  async togglePackageStatus(studioId: string, pkgId: string, currentStatus: boolean): Promise<boolean> {
    const newStatus = !currentStatus
    const ref = doc(db, "Studios", studioId, "Packages", pkgId)
    await updateDoc(ref, { disabled: newStatus })
    return newStatus
  }
}