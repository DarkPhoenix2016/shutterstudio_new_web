"use client"

import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock, Shield } from "lucide-react"

export default function PrivacyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
      <Navbar />

      <main className="pt-32 pb-20 relative overflow-hidden">
        
        {/* --- Background Effects --- */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent -z-10" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          
          {/* --- HEADER --- */}
          <ScrollReveal direction="up">
            <div className="mb-12">
              <Button asChild variant="ghost" className="mb-8 pl-0 text-slate-400 hover:text-white hover:bg-transparent">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
              </Button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Privacy Policy
                </h1>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-sm bg-white/5 inline-flex px-4 py-2 rounded-full border border-white/5">
                <Shield className="w-4 h-4" />
                <span>Last Updated: {currentDate}</span>
              </div>
            </div>
          </ScrollReveal>

          {/* --- POLICY CONTENT --- */}
          <ScrollReveal direction="up" delay={0.1}>
            <div className="p-8 md:p-12 rounded-3xl bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-2xl">
              <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-slate-400 prose-li:text-slate-400 prose-strong:text-slate-200 space-y-6">
                
                {/* 1. Introduction (Standard SaaS Boilerplate) */}
                <h2>1. Introduction</h2>
                <p>
                  At ShutterStudio (“we,” “our,” or “us”), we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you access our platform and services.
                </p>

                {/* 2. Information We Collect (Standard SaaS Boilerplate) */}
                <h2>2. Information We Collect</h2>
                <p>We collect information that you provide directly to us, such as when you create an account, update your profile, or communicate with support. This may include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, phone number, and business details.</li>
                  <li><strong>Billing Information:</strong> Payment details (processed securely by third-party providers).</li>
                  <li><strong>Studio Content:</strong> Client lists, event details, and photos uploaded to the platform.</li>
                </ul>

                {/* 3. How We Use Your Information (Standard SaaS Boilerplate) */}
                <h2>3. How We Use Your Information</h2>
                <p>We use the collected data to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve the ShutterStudio platform.</li>
                  <li>Process transactions and send related information, including confirmations and invoices.</li>
                  <li>Send technical notices, updates, security alerts, and support messages.</li>
                  <li>Monitor and analyze trends, usage, and activities in connection with our Service.</li>
                </ul>

                {/* 4. Data Sharing (Standard SaaS Boilerplate) */}
                <h2>4. Data Sharing and Disclosure</h2>
                <p>
                  We do not sell your personal data. We may share information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf (e.g., payment processing, hosting).
                </p>

                {/* 5. Data Security (Standard SaaS Boilerplate) */}
                <h2>5. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no Internet transmission is completely secure, and we cannot guarantee absolute security.
                </p>

                {/* 6. Data Retention (Standard SaaS Boilerplate) */}
                <h2>6. Data Retention</h2>
                <p>
                  We retain your personal data only for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements.
                </p>

                <hr className="border-white/10 my-10" />

                {/* --- USER PROVIDED CONTENT STARTS HERE --- */}

                {/* 7. Third-Party Services */}
                <h2>7. Third-Party Services</h2>
                <p>ShutterStudio may integrate with third-party services such as payment gateways or analytics tools.</p>
                <p><strong>Please note:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Third-party services operate under their own privacy policies</li>
                  <li>ShutterStudio is not responsible for third-party data handling practices</li>
                  <li>Users should review third-party privacy policies independently</li>
                </ul>

                {/* 8. Cookies */}
                <h2>8. Cookies and Tracking Technologies</h2>
                <p>ShutterStudio may use cookies or similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain user sessions</li>
                  <li>Improve performance</li>
                  <li>Analyze platform usage</li>
                </ul>
                <p>You may control or disable cookies through your browser settings, though some features may be affected.</p>

                {/* 9. User Rights */}
                <h2>9. User Rights</h2>
                <p>Depending on applicable laws, users may have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of personal data</li>
                  <li>Object to or restrict certain processing</li>
                  <li>Withdraw consent where applicable</li>
                </ul>
                <p>Requests can be made by contacting ShutterStudio support.</p>

                {/* 10. Studio Responsibilities */}
                <h2>10. Studio Responsibilities</h2>
                <p>Studio owners are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Lawful collection and use of client data</li>
                  <li>Informing their clients about data usage</li>
                  <li>Ensuring compliance with applicable privacy laws</li>
                </ul>
                <p>ShutterStudio provides tools but does not control how studios use client data.</p>

                {/* 11. Children’s Privacy */}
                <h2>11. Children’s Privacy</h2>
                <p>ShutterStudio is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from minors.</p>

                {/* 12. International Data Transfers */}
                <h2>12. International Data Transfers</h2>
                <p>Data may be stored or processed in locations outside your country of residence. We take reasonable steps to ensure appropriate data protection safeguards are in place.</p>

                {/* 13. Changes */}
                <h2>13. Changes to This Privacy Policy</h2>
                <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised “Last Updated” date.</p>
                <p>Continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.</p>

                {/* 14. Contact Information */}
                <h2>14. Contact Information</h2>
                <p>If you have questions or concerns about this Privacy Policy or data handling practices, please contact ShutterStudio Support:</p>
                <ul className="list-none pl-0 space-y-1">
                  <li>📧 <a href="mailto:support@shutterstudio.app" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@shutterstudio.app</a></li>
                  <li>🌐 <a href="https://shutterstudio.app" className="text-emerald-400 hover:text-emerald-300 transition-colors">https://shutterstudio.app</a></li>
                </ul>

                {/* 15. Acceptance */}
                <h2>15. Acceptance of This Policy</h2>
                <p>By using ShutterStudio, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>
              
              </div>
            </div>
          </ScrollReveal>

          {/* Bottom Nav */}
          <div className="mt-12 text-center pb-20">
             <p className="text-slate-500 text-sm mb-4">Looking for our terms of use?</p>
             <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Link href="/terms">View Terms of Service</Link>
             </Button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}