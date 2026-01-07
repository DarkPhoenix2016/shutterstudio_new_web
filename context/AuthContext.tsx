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

interface UserData {
  uid: string
  email: string
  role: string // Changed to string to support dynamic roles
  disabled?: boolean
  name?: string
  firstName?: string
  lastName?: string
  displayName?: string
  photoURL?: string
  coverURL?: string
  phoneNumber?: string
  designation?: string
  studioID?: string
  profileImage?: string
  createdAt?: any
}

interface StudioData {
  name: string
  logo_url?: string
  cover_url?: string
  owner_uid?: string
  [key: string]: any
}

interface GlobalSettings {
  maintenanceMode: boolean
  announcement?: string
  version?: string
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
      const docRef = doc(db, "Platform", "ROLE_PERMISSIONS")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data() as RolePermissions)
      } else {
        console.warn("Platform/ROLE_PERMISSIONS missing")
        setRolePermissions({})
      }
    } catch (e) {
      console.error("Failed to fetch permissions:", e)
    }
  }

  const fetchCompleteProfile = async (uid: string) => {
    try {
      // 1. Try Users collection
      let userDocRef = doc(db, "Users", uid)
      let userDocSnap = await getDoc(userDocRef)
      
      let fetchedUserData: UserData | null = null

      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data() as UserData
      } else {
        // 2. Try SuperAdmins collection
        userDocRef = doc(db, "SuperAdmins", uid)
        userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          fetchedUserData = userDocSnap.data() as UserData
        }
      }

      if (fetchedUserData) {
        setUserData(fetchedUserData)
        // Fetch Studio if applicable
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
        // 1. User is logged in: Now safe to fetch protected data
        await Promise.all([
            fetchCompleteProfile(user.uid),
            fetchPermissions()
        ])
        
        // 2. Setup Real-time Listener for Global Settings (ONLY when logged in)
        settingsUnsub = onSnapshot(doc(db, "Platform", "settings"), (doc) => {
          if (doc.exists()) {
            setGlobalSettings(doc.data() as GlobalSettings)
          } else {
            setGlobalSettings({ maintenanceMode: false })
          }
        }, (error) => {
            console.error("Settings listener error:", error)
        })

        setCurrentUser(user)
      } else {
        // User logged out: Clean up
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
        const err: any = new Error("User data not found")
        err.code = "auth/user-not-found"
        throw err
      }

      if (data.disabled === true && data.role !== "super_admin") {
        await signOut(auth)
        const error: any = new Error("Account is disabled")
        error.code = "ACCOUNT_DISABLED"
        throw error
      }

      try {
        const collectionName = (data.role === "super_admin" || data.role === "admin") 
          ? "SuperAdmins" 
          : "Users";
          
        await updateDoc(doc(db, collectionName, user.uid), {
          lastLogin: new Date().toISOString()
        });
        
        await logAuditAction(
            "LOGIN", 
            "User signed in successfully", 
            { uid: user.uid, email: user.email, displayName: data.displayName || data.name }, 
            "Auth"
        );

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
        await logAuditAction(
            "LOGOUT", 
            "User signed out", 
            { uid: currentUser.uid, email: currentUser.email }, 
            "Auth"
        );
    }
    setUserData(null)
    setStudioData(null)
    setRolePermissions(null)
    setCurrentUser(null)
    await signOut(auth)
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
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}