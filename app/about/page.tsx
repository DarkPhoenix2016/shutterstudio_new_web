"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { ArrowRight, Target, Telescope, Users, ShieldCheck, Zap, Heart, History, Layers } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
      <Navbar />

      <main className="pt-24 pb-20">
        
        {/* --- HERO: OUR STORY --- */}
        <section className="relative px-6 py-20 overflow-hidden">
          {/* Background Blobs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <ScrollReveal direction="up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
                <History className="w-4 h-4" />
                <span>Our Story</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
                Solving the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">complexity</span> of creative work.
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <div className="prose prose-invert prose-lg mx-auto text-slate-400 leading-relaxed">
                <p className="mb-6">
                  ShutterStudio was created to solve a simple but widely experienced problem: 
                  <span className="text-white"> running a photography studio has become increasingly complex, but the tools used to manage it have not evolved at the same pace.</span>
                </p>
                <p>
                  Photography studios today are expected to manage multiple events, coordinate teams, track equipment, and process payments—all while maintaining creative quality. In most cases, these responsibilities are handled using a fragmented mix of spreadsheets, messaging apps, and notebooks. This leads to missed tasks, unclear responsibilities, and unnecessary stress.
                </p>
                <p className="font-medium text-white text-xl mt-8 border-l-4 border-blue-500 pl-6 italic">
                  "ShutterStudio was developed to bring all these operational needs into one unified, cloud-based platform, designed specifically for photography studios."
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* --- MISSION & VISION (Split Cards) --- */}
        <section className="px-6 py-12">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Mission */}
              <ScrollReveal direction="left" className="h-full">
                <div className="h-full p-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.07] transition-colors">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target className="w-40 h-40 text-blue-500" />
                  </div>
                  <Target className="w-10 h-10 text-blue-400 mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                  <p className="text-slate-400 mb-6 leading-relaxed">
                    To simplify studio operations so photographers can focus on creativity, not administration. We aim to:
                  </p>
                  <ul className="space-y-3 text-slate-300">
                    {["Reduce operational complexity", "Improve crew coordination", "Increase transparency in payments", "Enable professional growth"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              {/* Vision */}
              <ScrollReveal direction="right" className="h-full" delay={0.2}>
                <div className="h-full p-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/[0.07] transition-colors">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Telescope className="w-40 h-40 text-purple-500" />
                  </div>
                  <Telescope className="w-10 h-10 text-purple-400 mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
                  <p className="text-slate-400 mb-6 leading-relaxed">
                    We envision a future where photography studios operate with the same efficiency as large agencies—without losing flexibility.
                  </p>
                  <p className="text-slate-400">
                    ShutterStudio aims to become a trusted operational backbone for creative businesses, evolving alongside studio needs to reduce administrative friction while enhancing professionalism.
                  </p>
                </div>
              </ScrollReveal>

            </div>
          </div>
        </section>

        {/* --- WHO IT IS FOR --- */}
        <section className="px-6 py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-gradient-to-b from-slate-900/50 to-transparent -z-10" />
          
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white mb-4">Who ShutterStudio is For</h2>
                <p className="text-slate-400">Built for creatives at every stage of their journey.</p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6">
              <AudienceCard 
                title="Freelancers"
                icon={Users}
                description="Manage bookings, payments, and client confirmations in one place. Maintain a professional workflow from inquiry to delivery."
                delay={0}
              />
              <AudienceCard 
                title="Growing Studios"
                icon={Layers}
                description="Coordinate crew members, assign tasks, and monitor shared equipment to prevent conflicts and missed deadlines."
                delay={0.1}
              />
              <AudienceCard 
                title="Agencies"
                icon={Zap}
                description="Handle high event volumes with role-based permissions, advanced analytics, and API capabilities for multi-team consistency."
                delay={0.2}
              />
            </div>
          </div>
        </section>

        {/* --- WHAT MAKES US DIFFERENT (Grid) --- */}
        <section className="px-6 py-20 bg-slate-900/30 border-y border-white/5">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal direction="up" className="mb-12">
              <h2 className="text-3xl font-bold text-white">What Makes Us Different</h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureBlock 
                title="Photography First" 
                desc="Not a generic project tool. Features like event-based tasks and gear tracking are built for our industry." 
              />
              <FeatureBlock 
                title="Studio-Owned Payments" 
                desc="You receive client payments directly. We take 0% commission and never hold your revenue." 
              />
              <FeatureBlock 
                title="Local-Friendly" 
                desc="Supports Sri Lankan workflows including PayHere integration and manual bank transfer verification." 
              />
              <FeatureBlock 
                title="Role-Based Access" 
                desc="Owners, photographers, and editors see only what they need, improving security and focus." 
              />
              <FeatureBlock 
                title="Scalable Architecture" 
                desc="Start small and upgrade as you grow. Our cloud tech ensures performance and real-time sync." 
              />
              <FeatureBlock 
                title="Total Transparency" 
                desc="No hidden fees. Full visibility into usage, limits, and billing. You remain in control." 
              />
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="px-6 py-24 text-center">
          <div className="container mx-auto max-w-3xl">
            <ScrollReveal direction="up">
              <h2 className="text-4xl font-bold text-white mb-6">Join Us</h2>
              <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                Whether you are just starting your photography journey or managing a growing studio, ShutterStudio is designed to support you every step of the way.
                <br /><br />
                <span className="text-white font-medium">Build better workflows. Deliver with confidence. Grow with ShutterStudio.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full">
                  <Link href="/dashboard/login">Start Your Journey <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full">
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

// --- SUB-COMPONENTS ---

function AudienceCard({ title, icon: Icon, description, delay }: any) {
  return (
    <ScrollReveal direction="up" delay={delay} className="h-full">
      <div className="h-full p-8 rounded-2xl bg-slate-900 border border-white/10 hover:border-blue-500/30 transition-all duration-300 flex flex-col items-center text-center group">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-blue-600/20 group-hover:scale-110 transition-all">
          <Icon className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </div>
    </ScrollReveal>
  )
}

function FeatureBlock({ title, desc }: any) {
  return (
    <ScrollReveal direction="up" distance={20} className="h-full">
      <div className="flex gap-4 p-6 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
        <div className="mt-1">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
          <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
        </div>
      </div>
    </ScrollReveal>
  )
}