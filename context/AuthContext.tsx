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
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"

// Define the shape of our User Data
interface UserData {
  uid: string
  email: string
  role: "super_admin" | "admin" | "studio_manager" | "studio_accountant" | "studio_crew"
  disabled?: boolean
  name?: string
  firstName?: string
  lastName?: string
  displayName?: string
  photoURL?: string
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

type RolePermissions = Record<string, string[]>

interface AuthContextType {
  currentUser: User | null
  userData: UserData | null
  studioData: StudioData | null
  rolePermissions: RolePermissions | null
  loading: boolean
  login: (email: string, pass: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  studioData: null,
  rolePermissions: null,
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
  const [loading, setLoading] = useState(true)

  // Helper: Fetch Dynamic Permissions from Firestore
  const fetchPermissions = async () => {
    try {
      const docRef = doc(db, "Platform", "ROLE_PERMISSIONS")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data() as RolePermissions)
      } else {
        console.warn("Platform/ROLE_PERMISSIONS document missing in Firestore")
        setRolePermissions({})
      }
    } catch (e) {
      console.error("Failed to fetch permissions:", e)
    }
  }

  // Helper: Fetch User & Studio
  const fetchCompleteProfile = async (uid: string) => {
    try {
      // 1. Try 'Users' collection
      let userDocRef = doc(db, "Users", uid)
      let userDocSnap = await getDoc(userDocRef)
      
      let fetchedUserData: UserData | null = null

      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data() as UserData
      } else {
        // 2. Try 'SuperAdmins' collection
        userDocRef = doc(db, "SuperAdmins", uid)
        userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          fetchedUserData = userDocSnap.data() as UserData
        }
      }

      // If user found
      if (fetchedUserData) {
        setUserData(fetchedUserData)

        // 3. IF user has a studioID, fetch the Studio details
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

  // 1. Listen for auth state changes
  useEffect(() => {
    // [!code highlight] WE REMOVED THE IMMEDIATE CALL TO fetchPermissions() HERE

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // [!code highlight] Fetch permissions ONLY after user is confirmed logged in
        await Promise.all([
            fetchCompleteProfile(user.uid),
            fetchPermissions()
        ])
        setCurrentUser(user)
      } else {
        setCurrentUser(null)
        setUserData(null)
        setStudioData(null)
        setRolePermissions(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // 2. Login Function
  const login = async (email: string, pass: string, remember: boolean) => {
    try {
      setLoading(true)
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)

      const userCredential = await signInWithEmailAndPassword(auth, email, pass)
      const user = userCredential.user

      // Parallel fetch for speed
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

      // Check Disabled Status (Super Admins bypass)
      if (data.disabled === true && data.role !== "super_admin") {
        await signOut(auth)
        const error: any = new Error("Account is disabled")
        error.code = "ACCOUNT_DISABLED"
        throw error
      }

      // Update Last Login
      try {
        const collectionName = (data.role === "super_admin" || data.role === "admin") 
          ? "SuperAdmins" 
          : "Users";
          
        await updateDoc(doc(db, collectionName, user.uid), {
          lastLogin: new Date().toISOString()
        });
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
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}