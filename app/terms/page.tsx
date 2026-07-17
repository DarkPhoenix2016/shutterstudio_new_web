"use client"

import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Calendar } from "lucide-react"

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString("en-US", { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      <Navbar />

      <main className="pt-32 pb-20 relative overflow-hidden">
        
        {/* --- Background Effects --- */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent -z-10" />
        <div className="fixed top-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          
          {/* --- HEADER --- */}
          <ScrollReveal direction="up">
            <div className="mb-12">
              <Button asChild variant="ghost" className="mb-8 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
              </Button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Terms of Service
                </h1>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-sm bg-white/5 inline-flex px-4 py-2 rounded-full border border-white/5">
                <Calendar className="w-4 h-4" />
                <span>Last Updated: {currentDate}</span>
              </div>
            </div>
          </ScrollReveal>

          {/* --- LEGAL DOCUMENT CONTENT --- */}
          <ScrollReveal direction="up" delay={0.1}>
            <div className="p-8 md:p-12 rounded-3xl bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-2xl">
              <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-slate-400 prose-li:text-slate-400 prose-strong:text-slate-200 space-y-6">
                
                {/* Intro */}
                <p className="text-lg leading-relaxed">
                  Welcome to ShutterStudio. These Terms of Service (“Terms”) govern your access to and use of the ShutterStudio platform, website, and services (collectively, the “Service”). By accessing or using ShutterStudio, you agree to be bound by these Terms.
                </p>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm font-medium">
                  If you do not agree to these Terms, you may not use the Service.
                </div>

                {/* 1. Definitions */}
                <h2>1. Definitions</h2>
                <p>For the purposes of these Terms:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>“ShutterStudio”, “we”, “our”, or “us”</strong> refers to the ShutterStudio platform and its operators.</li>
                  <li><strong>“User”, “you”, or “your”</strong> refers to any individual or entity accessing or using the Service.</li>
                  <li><strong>“Studio”</strong> refers to a registered business or individual operating within the ShutterStudio platform.</li>
                  <li><strong>“Client”</strong> refers to customers of a studio using the Service indirectly.</li>
                  <li><strong>“Content”</strong> refers to any data, text, images, files, or information uploaded or generated through the Service.</li>
                </ul>

                {/* 2. Description */}
                <h2>2. Description of the Service</h2>
                <p>
                  ShutterStudio is a cloud-based studio management platform designed to help photography studios manage events, tasks, inventory, clients, invoices, and subscriptions.
                </p>
                <p>
                  ShutterStudio provides organizational and operational tools only and does not act as a financial intermediary for client payments unless explicitly stated.
                </p>

                {/* 3. Eligibility */}
                <h2>3. Eligibility and Account Registration</h2>
                <h3>3.1 Eligibility</h3>
                <p>You must be at least 18 years of age to use the Service. By using ShutterStudio, you represent that you meet this requirement.</p>
                
                <h3>3.2 Account Responsibility</h3>
                <p>You are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintaining the confidentiality of your login credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring that information provided is accurate and up to date</li>
                </ul>
                <p>ShutterStudio is not responsible for unauthorized access caused by user negligence.</p>

                {/* 4. Studio Accounts */}
                <h2>4. Studio Accounts and Roles</h2>
                <p>
                  Studios may create multiple user accounts with assigned roles (such as owner, manager, or crew). Role-based access controls determine the actions available to each user.
                </p>
                <p>The studio owner is responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Managing user access</li>
                  <li>Ensuring compliance with these Terms</li>
                  <li>All activities conducted under the studio account</li>
                </ul>

                {/* 5. Subscription */}
                <h2>5. Subscription Plans and Billing</h2>
                <h3>5.1 Subscription Model</h3>
                <p>ShutterStudio operates on a subscription-based model. Subscription details, pricing, limits, and features are displayed within the platform and may change over time.</p>
                
                <h3>5.2 Billing Cycle</h3>
                <p>Subscriptions may be billed monthly or annually depending on the selected plan.</p>

                <h3>5.3 Payment Obligations</h3>
                <p>Failure to pay subscription fees may result in:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Restricted access</li>
                  <li>Suspension of services</li>
                  <li>Termination of the account after a grace period</li>
                </ul>

                <h3>5.4 Changes to Plans</h3>
                <p>You may upgrade or downgrade your subscription plan subject to the platform’s rules and usage limits.</p>

                {/* 6. Client Payments */}
                <h2>6. Client Payments and Financial Responsibility</h2>
                <p>ShutterStudio allows studios to configure their own payment methods for client invoices.</p>
                <p><strong>Important clarifications:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Client payments are made directly to the studio</li>
                  <li>ShutterStudio does not collect, hold, or distribute studio revenue</li>
                  <li>ShutterStudio is not responsible for disputes between studios and clients</li>
                </ul>
                <p>Studios are solely responsible for Taxes, Refunds, Chargebacks, and Financial compliance.</p>

                {/* 7. Acceptable Use */}
                <h2>7. Acceptable Use Policy</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for unlawful purposes</li>
                  <li>Upload malicious code or harmful content</li>
                  <li>Attempt unauthorized access to systems or data</li>
                  <li>Interfere with platform functionality</li>
                  <li>Use the Service to violate third-party rights</li>
                </ul>
                <p>Violation of this policy may result in immediate suspension or termination.</p>

                {/* 8. Data Ownership */}
                <h2>8. Data Ownership and User Content</h2>
                <h3>8.1 Ownership</h3>
                <p>You retain full ownership of all content you upload to ShutterStudio.</p>
                <h3>8.2 License to Operate</h3>
                <p>By using the Service, you grant ShutterStudio a limited license to store, process, and display your content solely for the purpose of providing the Service.</p>
                <h3>8.3 Responsibility</h3>
                <p>You are responsible for ensuring that your content is lawful, does not infringe on third-party rights, and is appropriately backed up if required.</p>

                {/* 9. Data Security */}
                <h2>9. Data Security and Privacy</h2>
                <p>ShutterStudio implements reasonable technical and organizational measures to protect user data. However:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>No system is 100% secure</li>
                  <li>ShutterStudio cannot guarantee absolute security</li>
                  <li>Users are responsible for safeguarding their access credentials</li>
                </ul>
                <p>Data handling practices are described in the Privacy Policy.</p>

                {/* 10. Availability */}
                <h2>10. Service Availability and Modifications</h2>
                <p>ShutterStudio aims to provide reliable service but does not guarantee uninterrupted availability. We reserve the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify features</li>
                  <li>Add or remove functionality</li>
                  <li>Temporarily suspend the Service for maintenance</li>
                  <li>Discontinue parts of the Service with reasonable notice</li>
                </ul>

                {/* 11. Third Party */}
                <h2>11. Third-Party Services</h2>
                <p>ShutterStudio may integrate with third-party services (such as payment gateways). ShutterStudio does not control third-party services and is not responsible for their availability, performance, or terms.</p>

                {/* 12. Termination */}
                <h2>12. Termination</h2>
                <h3>12.1 By User</h3>
                <p>You may terminate your account at any time through the platform settings.</p>
                <h3>12.2 By ShutterStudio</h3>
                <p>We may suspend or terminate accounts if these Terms are violated, payment obligations are not met, or the Service is misused.</p>

                {/* 13. IP */}
                <h2>13. Intellectual Property</h2>
                <p>All platform software, branding, trademarks, and design elements are the property of ShutterStudio or its licensors. You may not copy, modify, distribute, or reverse engineer any part of the Service without prior written permission.</p>

                {/* 14. Warranties */}
                <h2>14. Disclaimer of Warranties</h2>
                <p className="uppercase text-sm font-semibold tracking-wider text-slate-500">
                  The Service is provided “as is” and “as available”.
                </p>
                <p>ShutterStudio disclaims all warranties, including but not limited to fitness for a particular purpose, accuracy, availability, and non-infringement.</p>

                {/* 15. Liability */}
                <h2>15. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, ShutterStudio shall not be liable for loss of profits, data loss, business interruption, or indirect/consequential damages. Total liability shall not exceed the amount paid by you for the Service during the preceding billing period.
                </p>

                {/* 16. Indemnification */}
                <h2>16. Indemnification</h2>
                <p>You agree to indemnify and hold harmless ShutterStudio from any claims, damages, or liabilities arising from your use of the Service, violation of these Terms, or infringement of third-party rights.</p>

                {/* 17. Governing Law */}
                <h2>17. Governing Law</h2>
                <p>These Terms shall be governed by and interpreted in accordance with applicable laws, without regard to conflict of law principles.</p>

                {/* 18. Changes */}
                <h2>18. Changes to These Terms</h2>
                <p>ShutterStudio reserves the right to update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

                {/* 19. Contact */}
                <h2>19. Contact Information</h2>
                <p>For questions or concerns regarding these Terms, please contact ShutterStudio Support:</p>
                <ul className="list-none pl-0 space-y-1">
                  <li>📧 <a href="mailto:support@shutterstudio.app" className="text-blue-400 hover:text-blue-300 transition-colors">support@shutterstudio.app</a></li>
                  <li>🌐 <a href="https://shutterstudio.app" className="text-blue-400 hover:text-blue-300 transition-colors">https://shutterstudio.app</a></li>
                </ul>

                {/* 20. Acceptance */}
                <h2>20. Acceptance</h2>
                <p>By using ShutterStudio, you acknowledge that you have read, understood, and agreed to these Terms of Service.</p>
              
              </div>
            </div>
          </ScrollReveal>

          {/* Bottom Nav */}
          <div className="mt-12 text-center pb-20">
             <p className="text-slate-500 text-sm mb-4">Need to check our data practices?</p>
             <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Link href="/privacy">View Privacy Policy</Link>
             </Button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}