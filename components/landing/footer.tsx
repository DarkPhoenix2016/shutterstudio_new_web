"use client"

import Link from "next/link"
import { Camera, Github, Instagram, Linkedin, Twitter, ArrowRight, Sparkles } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-slate-950 pt-20 pb-10 overflow-hidden border-t border-white/10">
      
      {/* --- BACKGROUND GLOWS --- */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        {/* --- PRE-FOOTER CTA --- */}
        <div className="mb-20 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-blue-900/20 to-slate-900/50 border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Ready to organize your studio?
              </h3>
              <p className="text-slate-400 max-w-lg">
                Join hundreds of professional photographers who have switched to ShutterStudio.
              </p>
            </div>
            <Link 
              href="/dashboard/login" 
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* --- MAIN FOOTER CONTENT --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* BRAND COLUMN */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-white group">
              <div className="bg-blue-600 rounded-lg p-1.5 transition-transform group-hover:scale-110">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">ShutterStudio</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
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
              <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Product</h3>
              <ul className="space-y-4 text-sm">
                <FooterLink href="/#features">Features</FooterLink>
                <FooterLink href="/#pricing">Pricing</FooterLink>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Resources</h3>
              <ul className="space-y-4 text-sm">
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Company</h3>
              <ul className="space-y-4 text-sm">
                <FooterLink href="/about">About Us</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        {/* --- BOTTOM BAR --- */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {currentYear} ShutterStudio. All rights reserved. Product of PCSTech.lk</p>
          
          <div className="flex items-center gap-8">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            
            {/* ADMIN LINK (Subtle) */}
            <Link 
              href="/admin/login" 
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-400 transition-colors ml-4 pl-4 border-l border-slate-800"
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
        className="text-slate-400 hover:text-blue-400 hover:translate-x-1 transition-all duration-200 block"
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
      className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all duration-300"
    >
      {icon}
    </Link>
  )
}