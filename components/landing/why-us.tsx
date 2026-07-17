"use client"

import { ShieldCheck, Server, Coins, Globe2 } from "lucide-react"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export function WhyUs() {
  return (
    <section className="py-24 bg-background border-t border-border transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <ScrollReveal direction="right" width="100%">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground">
                Built for <span className="text-primary font-extrabold">Professional</span> Studios.
                <br />
                Trusted by the Best.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We understand the unique challenges of running a photography business in Sri Lanka. 
                Our platform is designed to handle local workflows, currency, and team dynamics securely.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <TrustItem icon={Coins} title="Zero Commissions" desc="We don't take a cut. Your revenue is 100% yours." />
                <TrustItem icon={Globe2} title="Local Optimized" desc="Designed for LKR payments and local banking workflows." />
                <TrustItem icon={ShieldCheck} title="Enterprise Security" desc="Role-based access control keeps financial data private." />
                <TrustItem icon={Server} title="Auto-Backups" desc="Your data is encrypted and backed up daily in the cloud." />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" width="100%" delay={0.2}>
            <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
               <div className="relative bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6 border-b border-border pb-6">
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                          <div className="text-foreground font-semibold">System Status</div>
                          <div className="text-green-400 text-sm flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              Operational • 99.9% Uptime
                          </div>
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div className="h-2 bg-secondary rounded-full w-3/4" />
                      <div className="h-2 bg-secondary rounded-full w-1/2" />
                      <div className="h-2 bg-secondary rounded-full w-5/6" />
                  </div>
               </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}

function TrustItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 shrink-0"><Icon className="w-6 h-6 text-primary" /></div>
      <div>
        <h4 className="text-foreground font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}