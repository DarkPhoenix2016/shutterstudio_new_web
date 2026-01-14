"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface CTAProps {
  onGetStartedClick: () => void
}

export function CTASection({ onGetStartedClick }: CTAProps) {
  return (
    <section className="py-24 bg-slate-950 px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="relative rounded-3xl overflow-hidden px-6 py-20 text-center border border-white/10 bg-slate-900">
          
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 -z-10" />
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to professionalize <br /> your workflow?
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Join the studios that have moved from chaos to control. 
            Scalable plans for freelancers, growing teams, and agencies.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={onGetStartedClick}
              className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 rounded-full"
            >
              Contact Sales
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full"
            >
              View Packages
            </Button>
          </div>

        </div>
      </div>
    </section>
  )
}