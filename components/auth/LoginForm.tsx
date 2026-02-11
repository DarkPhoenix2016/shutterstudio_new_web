"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// 1. Firebase Imports
import { GoogleAuthProvider, signInWithPopup, getAuth, getAdditionalUserInfo, deleteUser } from "firebase/auth"

interface LoginFormProps {
  portal: "admin" | "user"
}

export default function LoginForm({ portal }: LoginFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Loading state for Email/Pass
  const [loading, setLoading] = useState(false)
  // 2. Specific loading state for Google (Acts as a redirect guard)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { currentUser, login, loading: authLoading } = useAuth()

  const successRedirect = portal === "admin" ? "/admin" : "/app"
  const portalName = portal === "admin" ? "ShutterStudio Crew" : "ShutterStudio"

  // 3. FIX: Prevent redirect while Google is still validating the user
  useEffect(() => {
    if (!authLoading && currentUser && !googleLoading) {
      router.push(successRedirect)
    }
  }, [authLoading, currentUser, router, successRedirect, googleLoading])

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    const auth = getAuth()
    const provider = new GoogleAuthProvider()

    try {
      const result = await signInWithPopup(auth, provider)
      const details = getAdditionalUserInfo(result)

      // 4. STRICT CHECK: If new user, delete and block
      if (details?.isNewUser) {
        await deleteUser(result.user)
        throw new Error("ACCOUNT_NOT_FOUND_GOOGLE")
      }

      toast({
        title: "Welcome back!",
        description: "Google login successful. Redirecting...",
        className: "bg-green-50 border-green-200 text-green-800"
      })

    } catch (err: any) {
      let errorMessage = "Failed to sign in with Google."
      
      if (err.message === "ACCOUNT_NOT_FOUND_GOOGLE") {
        errorMessage = "No account found. Sign up is disabled for this portal."
      } else if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign in cancelled."
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      })
      console.error("Google Login error:", err)
    } finally {
      setGoogleLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanEmail = email.trim()
      await login(cleanEmail, password, remember)

      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting...",
        className: "bg-green-50 border-green-200 text-green-800"
      })

    } catch (err: any) {
      const code = err.code ?? err.message ?? ""
      let errorMessage = "Failed to log in. Please check your credentials."

      if (code === "ACCOUNT_DISABLED" || err.message?.includes("disabled")) {
        errorMessage = "Your account has been disabled. Please contact the administrator."
      } 
      else if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password."
      } 
      else if (code === "auth/invalid-email") {
        errorMessage = "The email address is badly formatted."
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      })
      
      console.error("Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 relative bg-muted">
          <Image
            src="/images/background/login-image.jpg"
            alt="Studio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 text-white">
            <h2 className="text-3xl font-bold mb-2">
               {portal === "admin" ? "Administration Access" : "Welcome back"}
            </h2>
            <p className="text-lg opacity-90">
               {portal === "admin" ? "System management" : "Photography management platform"}
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Card className="border-0 shadow-2xl">
              <CardHeader className="space-y-4 text-center">
                <Link href="/" className="flex items-center justify-center space-x-2">
                  <div className="h-10 w-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">SS</span>
                  </div>
                  <span className="text-2xl font-bold">{portalName}</span>
                </Link>
                <div>
                  <CardTitle className="text-2xl">Sign In</CardTitle>
                  <CardDescription>
                    {portal === "admin" ? "Secure Admin Login" : "Sign in to continue"}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {/* 5. Google Button Section */}
                <div className="mb-4 space-y-4">
                  <Button 
                    variant="outline" 
                    type="button" 
                    className="w-full h-11 relative" 
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                  >
                     {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                     )}
                    Sign in with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground bg-white">
                        Or continue with
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(c as boolean)} />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in with Email
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {portal === "admin" ? (
                       <span className="text-xs">Restricted Access Level</span>
                    ) : (
                      <>
                        New to ShutterStudio?{" "}
                        <Link href="/contact" className="text-primary hover:underline">
                          Contact us
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}