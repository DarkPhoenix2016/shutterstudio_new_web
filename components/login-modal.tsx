"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore, AUTH_MAP } from "@/lib/store"
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

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const setCurrentUser = useStore((state) => state.setCurrentUser)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const user = AUTH_MAP[email.toLowerCase()]

    if (user) {
      setCurrentUser(user)
      onOpenChange(false)
      if (user.role === "super_admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } else {
      setError("Invalid email. Try one of the demo accounts below.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome back to ShutterStudio</DialogTitle>
          <DialogDescription>
            Sign in to access your studio dashboard and manage your photography business.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="rounded-lg bg-muted p-4 text-xs space-y-2">
            <p className="font-mono font-semibold text-muted-foreground">Try these demo accounts:</p>
            <ul className="space-y-1 font-mono">
              <li className="text-foreground">admin@shutterstudio.com <span className="text-muted-foreground">(Super Admin)</span></li>
              <li className="text-foreground">owner@demo.com <span className="text-muted-foreground">(Manager)</span></li>
              <li className="text-foreground">crew@demo.com <span className="text-muted-foreground">(Staff)</span></li>
            </ul>
          </div>

          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
