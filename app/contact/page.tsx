"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Mail, 
  HelpCircle, 
  Clock, 
  Send, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from "lucide-react"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    // Gather form data
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      category: formData.get("category"),
      message: formData.get("message"),
    }

    try {
      // Send data to our API route
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to send message")
      
      setIsSuccess(true)
    } catch (err) {
      setError("Something went wrong. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      <Navbar />

      <main className="pt-32 pb-20 relative overflow-hidden">
        
        {/* --- Background Effects --- */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          
          {/* --- HEADER --- */}
          <ScrollReveal direction="up" className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Get in Touch with <span className="text-blue-400">ShutterStudio</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Have a question, need support, or want to learn more? We’re here to help. 
              Whether you’re a freelancer or an agency, feel free to reach out.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* --- LEFT COLUMN: INFO --- */}
            <div className="space-y-8">
              <ScrollReveal direction="right" delay={0.1}>
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">How Can We Help?</h2>
                  </div>
                  <p className="text-slate-400 mb-6">You can contact us for:</p>
                  <ul className="space-y-3">
                    {[
                      "General inquiries about ShutterStudio",
                      "Subscription and pricing questions",
                      "Technical support or issue reporting",
                      "Feature requests or feedback",
                      "Partnership or business inquiries"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.2}>
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-white">Alternative Contact</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    Prefer email? Contact us directly. Please include your studio name for faster service.
                  </p>
                  <a href="mailto:shutterstudio.dev@gmail.com" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    shutterstudio.dev@gmail.com
                  </a>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.3}>
                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/50">
                  <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium text-sm">Response Time</h4>
                    <p className="text-slate-400 text-xs mt-1">
                      We aim to respond within 1–2 business days. Support requests may be prioritized based on subscription plans.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* --- RIGHT COLUMN: FORM --- */}
            <ScrollReveal direction="left" delay={0.2} className="h-full">
              <div className="relative h-full p-8 md:p-10 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
                
                {isSuccess ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-400 max-w-xs mx-auto mb-8">
                      Thank you for contacting ShutterStudio. We’ll get back to you shortly via email.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSuccess(false)}
                      className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Send a Message</h3>
                      <p className="text-sm text-slate-400">Fill out the form below and we'll reply via email.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Full Name</label>
                        <Input name="name" required placeholder="John Doe" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
                        <Input name="email" required type="email" placeholder="john@studio.com" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Subject</label>
                      <Input name="subject" required placeholder="Briefly describe your inquiry" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category (Optional)</label>
                      <div className="relative">
                        {/* FIXED: Using defaultValue on Select */}
                        <select 
                          name="category"
                          defaultValue=""
                          className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                          <option value="" disabled>Select a category</option>
                          <option value="general">General Inquiry</option>
                          <option value="technical">Technical Support</option>
                          <option value="billing">Billing & Subscription</option>
                          <option value="feature">Feature Request</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none opacity-50">
                           <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Message</label>
                      <Textarea name="message" required placeholder="How can we help you today?" className="min-h-[120px] bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500" />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-slate-500 text-center leading-relaxed px-4">
                      Information submitted is used only for communication. We do not share data with third parties. 
                      See our <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}