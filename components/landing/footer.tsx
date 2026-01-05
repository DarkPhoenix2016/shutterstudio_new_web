import Link from "next/link"
import { Camera, Github, Instagram, Linkedin, Twitter } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* BRAND COLUMN */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 text-slate-100 hover:text-white transition-colors">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">ShutterStudio</span>
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              The all-in-one management platform designed for professional photography studios and freelance creators.
            </p>
            <div className="flex gap-4">
              <SocialLink href="#" icon={<Twitter className="h-4 w-4" />} />
              <SocialLink href="#" icon={<Instagram className="h-4 w-4" />} />
              <SocialLink href="#" icon={<Linkedin className="h-4 w-4" />} />
              <SocialLink href="#" icon={<Github className="h-4 w-4" />} />
            </div>
          </div>

          {/* LINKS COLUMNS */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Product */}
            <div>
              <h3 className="font-semibold text-slate-100 mb-4 text-sm uppercase tracking-wider">Product</h3>
              <ul className="space-y-3 text-sm">
                <FooterLink href="/features">Features</FooterLink>
                <FooterLink href="/pricing">Pricing</FooterLink>
                <FooterLink href="/showcase">Studio Showcase</FooterLink>
                <FooterLink href="/changelog">Changelog</FooterLink>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-slate-100 mb-4 text-sm uppercase tracking-wider">Resources</h3>
              <ul className="space-y-3 text-sm">
                <FooterLink href="/docs">Documentation</FooterLink>
                <FooterLink href="/blog">Blog</FooterLink>
                <FooterLink href="/community">Community</FooterLink>
                <FooterLink href="/help">Help Center</FooterLink>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-slate-100 mb-4 text-sm uppercase tracking-wider">Company</h3>
              <ul className="space-y-3 text-sm">
                <FooterLink href="/about">About</FooterLink>
                <FooterLink href="/careers">Careers</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {currentYear} ShutterStudio. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">
              Privacy
            </Link>
            
            {/* THE ADMIN LOGIN LINK */}
            <Link 
              href="/admin/login" 
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors font-medium ml-4 pl-4 border-l border-slate-800"
            >
              <span>ShutterStudio Crew</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Helper Components for cleaner code
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-blue-400 transition-colors duration-200 block">
        {children}
      </Link>
    </li>
  )
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-white transition-all duration-200"
    >
      {icon}
    </Link>
  )
}