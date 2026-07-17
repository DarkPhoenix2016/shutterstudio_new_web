"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

interface CTAProps {
  onGetStartedClick: () => void
}

export function CTASection({ onGetStartedClick }: CTAProps) {
  return (
    <section className="py-24 bg-background transition-colors duration-300 px-6 border-t border-border">
      <div className="container mx-auto max-w-5xl">
        <ScrollReveal direction="up" distance={50} duration={0.8}>
          <div className="relative rounded-3xl overflow-hidden px-6 py-20 text-center border border-border bg-card">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-card to-card -z-10" />
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Ready to professionalize <br /> your workflow?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Join the studios that have moved from chaos to control. 
              Scalable plans for freelancers, growing teams, and agencies.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={onGetStartedClick}
                className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl transition-transform hover:-translate-y-1"
              >
                [ Capture Booking ]
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-xl"
              >
                [ Preview Packages ]
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}