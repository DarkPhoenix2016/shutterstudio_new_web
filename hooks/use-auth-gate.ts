import { useStore, type Feature, ROLE_PERMISSIONS } from "@/lib/store"

export function useAuthGate() {
  const { currentUser, studios } = useStore()

  const studio = studios.find((s) => s.id === currentUser?.studioId)

  const canAccess = (feature: Feature) => {
    if (!currentUser) return false
    if (currentUser.role === "super_admin") return true

    // Check if feature is enabled for the studio
    const isFeatureEnabled = studio?.features.includes(feature)
    if (!isFeatureEnabled) return false

    // Check if user role has permission
    const hasRolePermission = ROLE_PERMISSIONS[currentUser.role].includes(feature)
    return hasRolePermission
  }

  const getAccessibleFeatures = () => {
    if (!currentUser) return []
    if (currentUser.role === "super_admin") return []

    return (studio?.features || []).filter((feature) => ROLE_PERMISSIONS[currentUser.role].includes(feature))
  }

  return { canAccess, getAccessibleFeatures, currentUser, studio }
}
