"use client"

import Link from "next/link"
import { Camera, Github, Instagram, Linkedin, Twitter, ArrowRight, Sparkles } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-background transition-colors duration-300 pt-20 pb-10 overflow-hidden border-t border-border">
      
      {/* --- BACKGROUND GLOWS --- */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        {/* --- PRE-FOOTER CTA --- */}
        <div className="mb-20 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-primary/10 to-card/50 border border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Ready to organize your studio?
              </h3>
              <p className="text-muted-foreground max-w-lg">
                Join hundreds of professional photographers who have switched to ShutterStudio.
              </p>
            </div>
            <Link 
              href="/app/login" 
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
            >
              [ Get Started Now ]
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* --- MAIN FOOTER CONTENT --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* BRAND COLUMN */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-foreground group">
              <div className="bg-primary rounded-lg p-1.5 transition-transform group-hover:scale-110">
                <Camera className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">ShutterStudio</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The all-in-one management platform designed specifically for professional photography studios and freelance creators.
            </p>
            <div className="flex gap-3">
              <SocialLink href="#" icon={<Twitter className="h-4 w-4" />} label="Twitter" />
              <SocialLink href="#" icon={<Instagram className="h-4 w-4" />} label="Instagram" />
              <SocialLink href="#" icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" />
              <SocialLink href="#" icon={<Github className="h-4 w-4" />} label="GitHub" />
            </div>
          </div>

          {/* LINKS COLUMNS */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Product */}
            <div>
              <h3 className="font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">Product</h3>
              <ul className="space-y-4 text-sm">
                <FooterLink href="/#features">Features</FooterLink>
                <FooterLink href="/#pricing">Pricing</FooterLink>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">Resources</h3>
              <ul className="space-y-4 text-sm">
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">Company</h3>
              <ul className="space-y-4 text-sm">
                <FooterLink href="/about">About Us</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        {/* --- BOTTOM BAR --- */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/60">
          <p>© {currentYear} ShutterStudio. All rights reserved. Product of PCSTech.lk</p>
          
          <div className="flex items-center gap-8">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            
            {/* ADMIN LINK (Subtle) */}
            <Link 
              href="/admin/login" 
              className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-primary transition-colors ml-4 pl-4 border-l border-border"
            >
              <span>ShutterStudio Crew</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// --- HELPER COMPONENTS ---

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link 
        href={href} 
        className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 block"
      >
        {children}
      </Link>
    </li>
  )
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      aria-label={label}
      className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-300"
    >
      {icon}
    </Link>
  )
}
