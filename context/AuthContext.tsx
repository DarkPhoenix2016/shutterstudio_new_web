"use client"

import { auth, db } from "@/lib/firebase"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth"
import { doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from "firebase/firestore" 
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { logAuditAction } from "@/lib/logger"

// --- Types ---
interface UserData {
  id: string
  uid: string
  email: string
  role: string 
  disabled?: boolean
  name?: string
  displayName?: string
  photoURL?: string
  profileImage?: string
  lastLogin?: string
  coverURL?: string
  phoneNumber?: string
  studioID: string
  designation?: string
  createdAt?: any
}

interface StudioData {
  name: string
  logo_url?: string
  cover_url?: string
  designations?: string[]
  invoice_text?: string
  invoice_number?: string
  invoice_current?: string
  address?: string
  phone?: string
  website?: string
  [key: string]: any
}

// [!code highlight] Added Navigation Types to Global Settings
interface NavItem {
  label: string
  path: string
  icon: string
  feature: string
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

interface GlobalSettings {
  maintenanceMode: boolean
  announcement?: string
  version?: string
  navigation?: NavGroup[] // [!code highlight] Added navigation structure
}

type RolePermissions = Record<string, string[]>

interface AuthContextType {
  currentUser: User | null
  userData: UserData | null
  studioData: StudioData | null
  rolePermissions: RolePermissions | null
  globalSettings: GlobalSettings | null
  loading: boolean
  login: (email: string, pass: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  studioData: null,
  rolePermissions: null,
  globalSettings: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUserData: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [studioData, setStudioData] = useState<StudioData | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPermissions = async () => {
    try {
      // Fetch Role Permissions from Firestore
      const docRef = doc(db, "Platform", "ROLE_PERMISSIONS")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data() as RolePermissions)
      } else {
        setRolePermissions({})
      }
    } catch (e) {
      console.error("Failed to fetch permissions:", e)
    }
  }

  const fetchCompleteProfile = async (uid: string) => {
    try {
      let userDocRef = doc(db, "Users", uid)
      let userDocSnap = await getDoc(userDocRef)
      
      let fetchedUserData: UserData | null = null

      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data() as UserData
      } else {
        userDocRef = doc(db, "SuperAdmins", uid)
        userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          fetchedUserData = userDocSnap.data() as UserData
        }
      }

      if (fetchedUserData) {
        setUserData(fetchedUserData)
        if (fetchedUserData.studioID) {
          try {
            const studioDocRef = doc(db, "Studios", fetchedUserData.studioID)
            const studioDocSnap = await getDoc(studioDocRef)
            if (studioDocSnap.exists()) {
              setStudioData(studioDocSnap.data() as StudioData)
            } else {
              setStudioData(null)
            }
          } catch (studioErr) {
            console.error("Error fetching studio data:", studioErr)
          }
        } else {
            setStudioData(null)
        }
      } else {
        setUserData(null)
        setStudioData(null)
      }
      return fetchedUserData
    } catch (error) {
      console.error("Error fetching complete profile:", error)
      return null
    }
  }

  useEffect(() => {
    let settingsUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await Promise.all([
            fetchCompleteProfile(user.uid),
            fetchPermissions()
        ])
        
        // Real-time listener for Settings (including Navigation)
        settingsUnsub = onSnapshot(doc(db, "Platform", "settings"), (doc) => {
          if (doc.exists()) {
            setGlobalSettings(doc.data() as GlobalSettings)
          } else {
            setGlobalSettings({ maintenanceMode: false, navigation: [] })
          }
        }, (error) => {
            console.error("Settings listener error:", error)
        })

        setCurrentUser(user)
      } else {
        if (settingsUnsub) settingsUnsub();
        setCurrentUser(null)
        setUserData(null)
        setStudioData(null)
        setRolePermissions(null)
        setGlobalSettings(null)
      }
      setLoading(false)
    })

    return () => {
      authUnsub()
      if (settingsUnsub) settingsUnsub();
    }
  }, [])

  const login = async (email: string, pass: string, remember: boolean) => {
    try {
      setLoading(true)
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)

      const userCredential = await signInWithEmailAndPassword(auth, email, pass)
      const user = userCredential.user

      const [data, _] = await Promise.all([
        fetchCompleteProfile(user.uid),
        fetchPermissions()
      ])

      if (!data) {
        await signOut(auth)
        throw { code: "auth/user-not-found", message: "User data not found" }
      }

      if (data.disabled === true && data.role !== "super_admin") {
        await signOut(auth)
        throw { code: "ACCOUNT_DISABLED", message: "Account is disabled" }
      }

      // Update Last Login
      try {
        const collectionName = (data.role === "super_admin" || data.role === "admin") ? "SuperAdmins" : "Users";
        await updateDoc(doc(db, collectionName, user.uid), { lastLogin: new Date().toISOString() });
        await logAuditAction("LOGIN", "User signed in successfully", { uid: user.uid, email: user.email }, "Auth");
      } catch (logError) {
        console.error("Failed to update last login:", logError);
      }

      setCurrentUser(user)

    } catch (error) {
      setLoading(false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (currentUser) {
        await logAuditAction("LOGOUT", "User signed out", { uid: currentUser.uid, email: currentUser.email }, "Auth");
    }
    await signOut(auth)
    setUserData(null)
    setStudioData(null)
    setRolePermissions(null)
    setCurrentUser(null)
  }

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchCompleteProfile(currentUser.uid)
    }
  }

  const value = {
    currentUser,
    userData,
    studioData,
    rolePermissions,
    globalSettings,
    loading,
    login,
    logout,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}