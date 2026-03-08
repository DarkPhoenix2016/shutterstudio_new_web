"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// Firebase Imports
import { auth, db } from "@/lib/firebase" 
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import Swal from 'sweetalert2'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const setCurrentUser = useStore((state) => state.setCurrentUser)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 2. Determine Role by checking Firestore "Platform" collection
      let role: any = "studio_crew" // Default fallback

      try {
        // --- CHECK SUPER ADMIN ---
        // Reads from: Platform -> super_admin
        const superAdminRef = doc(db, "Platform", "super_admin")
        const superAdminSnap = await getDoc(superAdminRef)

        if (superAdminSnap.exists()) {
          const data = superAdminSnap.data()

          console.log("authenticated ID:",user.uid)
          console.log("Database ID:",user.uid)

          // Checks against 'userID', 'uid', or 'id' to be safe
          if (data.UserID === user.uid || data.uid === user.uid || data.id === user.uid) {
            role = "super_admin"
          }
        }

        // --- CHECK SECONDARY ADMIN ---
        // Reads from: Platform -> secondary_admin (Field: UserIDs)
        // Only check this if we haven't already found they are a super_admin
        if (role !== "super_admin") {
          const secAdminRef = doc(db, "Platform", "secondary_admin")
          const secAdminSnap = await getDoc(secAdminRef)

          if (secAdminSnap.exists()) {
            const data = secAdminSnap.data()
            // Your screenshot shows the field is named "UserIDs"
            if (data.UserIDs && Array.isArray(data.UserIDs) && data.UserIDs.includes(user.uid)) {
              role = "super_admin"
            }
          }
        }
      } catch (dbError) {
        console.error("Error reading Platform settings:", dbError)
        // Allow login to proceed as crew even if DB check fails, 
        // or handle error differently if preferred.
      }

      // 3. Update Global Store
      setCurrentUser({
        email: user.email!,
        role: role,
        // If they are admin, they don't belong to a specific studio ID yet
        studioId: role === "super_admin" ? undefined : "studio-1" 
      })

      // 4. Success UI
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      })

      Toast.fire({
        icon: 'success',
        title: `Signed in as ${role === 'super_admin' ? 'Admin' : 'Crew'}`
      })

      onOpenChange(false)
      
      // 5. Routing
      if (role === "super_admin") {
        router.push("/admin")
      } else {
        router.push("/app")
      }

    } catch (error: any) {
      console.error("Login error:", error)
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error.message || 'Please check your credentials',
        confirmButtonColor: '#1C4D8D'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0F2854]">Welcome Back</DialogTitle>
          <DialogDescription>
            Sign in to ShutterStudio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-visible:ring-[#1C4D8D]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus-visible:ring-[#1C4D8D]"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-[#1C4D8D] hover:bg-[#0F2854]"
            disabled={loading}
          >
            {loading ? "Checking Access..." : "Sign In"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
