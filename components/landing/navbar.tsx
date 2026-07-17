"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Camera, Menu, X, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Handle scroll effect for glass background opacity
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Prevent server-side hydration mismatches for theme icons
  useEffect(() => {
    setMounted(true)
  }, [])

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "How it Works", href: "/#how-it-works" },
    { name: "Pricing", href: "/#pricing" },
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
  ]

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-border py-3 shadow-sm"
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-lg p-1.5 transition-transform group-hover:scale-110 shadow-lg shadow-primary/20">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight transition-colors">
            ShutterStudio
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* DESKTOP ACTIONS */}
        <div className="hidden md:flex items-center gap-6">
          {/* THEME TOGGLE */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer shadow-xs"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sun className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
            </button>
          )}

          <Button 
            asChild
            className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 font-semibold shadow-md shadow-primary/20 cursor-pointer"
          >
            <Link href="/app/login">[ Capture Booking ]</Link>
          </Button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-6 shadow-2xl animate-in slide-in-from-top-5">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            
            {/* MOBILE THEME TOGGLE */}
            {mounted && (
              <div className="flex items-center justify-between p-4 bg-secondary border border-border rounded-xl">
                <span className="text-sm font-semibold text-foreground">Theme</span>
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                  {theme === "light" ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5 text-primary" aria-hidden="true" />}
                </button>
              </div>
            )}

            <Link 
              href="/app/login" 
              className="text-base font-medium text-muted-foreground hover:text-foreground text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl" asChild>
              <Link href="/app/login">[ Capture Booking ]</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}