"use client"

import { useAuth } from "@/context/AuthContext"
import { type Feature } from "@/lib/store" // Assuming Feature type is still exported here

export function useAuthGate() {
  const { currentUser, userData, rolePermissions, studioData } = useAuth()

  const canAccess = (feature: Feature): boolean => {
    // 1. If not logged in, deny
    if (!currentUser || !userData || !rolePermissions) return false

    // 2. Super Admins access everything (Fail-safe)
    if (userData.role === "super_admin") return true

    // 3. Get allowed features for this user's role from Firestore data
    const allowedFeatures = rolePermissions[userData.role] || []

    // 4. Check if the requested feature is in the allowed list
    return allowedFeatures.includes(feature)
  }

  return {
    currentUser,
    userData,
    studio: studioData,
    canAccess,
    role: userData?.role,
    isAuthenticated: !!currentUser,
  }
}