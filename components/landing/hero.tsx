"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles, CheckCircle2, Calendar, Users, BarChart3 } from "lucide-react"

interface HeroProps {
  onGetStartedClick: () => void
}

export function Hero({ onGetStartedClick }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-white selection:bg-primary/20">
      {/* --- BACKGROUND ELEMENTS --- */}
      
      {/* 1. SaaS Grid Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#C9EBFF,transparent)]" />
      </div>

      {/* 2. Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="container mx-auto max-w-6xl relative z-10">
        
        {/* --- TEXT CONTENT --- */}
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          
          {/* Feature Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm transition-transform hover:scale-105 cursor-default">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              New: <span className="text-blue-600">Smart scheduling</span> is here
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-slate-900">
            The Operating System for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Modern Studios
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Stop juggling spreadsheets and WhatsApp messages. Manage inventory, bookings, payments, and crew in one beautiful dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={onGetStartedClick}
              className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 text-white rounded-full transition-all hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-full bg-white/50 backdrop-blur-sm"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Watch Demo
            </Button>
          </div>

          {/* Social Proof / Trust Indicators */}
          <div className="pt-8 flex items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* --- HERO IMAGE / DASHBOARD MOCKUP --- */}
        <div className="mt-20 relative perspective-1000">
          {/* Glow effect behind image */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-100/50 to-transparent blur-3xl -z-10" />
          
          {/* The Dashboard Interface Container */}
          <div className="relative bg-white rounded-xl border border-slate-200/60 shadow-2xl shadow-slate-200 overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out mx-auto max-w-5xl">
            
            {/* Fake Browser Window Controls */}
            <div className="h-8 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>

            {/* Dashboard Internal Layout */}
            <div className="flex h-[400px] md:h-[500px]">
              
              {/* Sidebar */}
              <div className="w-16 md:w-64 border-r border-slate-100 bg-slate-50/50 p-4 hidden md:flex flex-col gap-4">
                <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="space-y-2 mt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-white/60">
                      <div className="h-5 w-5 bg-slate-200 rounded" />
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 bg-white/40 backdrop-blur-xl">
                
                {/* Header Mockup */}
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <div className="h-6 w-48 bg-slate-800/10 rounded mb-2" />
                    <div className="h-4 w-32 bg-slate-800/5 rounded" />
                  </div>
                  <div className="flex gap-3">
                     <div className="h-9 w-24 bg-blue-600/10 rounded" />
                     <div className="h-9 w-9 bg-blue-600 rounded" />
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
                    { icon: Users, color: "text-indigo-500", bg: "bg-indigo-50" },
                    { icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-50" }
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <div className="h-6 w-16 bg-slate-100 rounded mb-1" />
                      <div className="h-3 w-24 bg-slate-50 rounded" />
                    </div>
                  ))}
                </div>

                {/* Activity Feed / List */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100" />
                          <div>
                            <div className="h-4 w-32 bg-slate-100 rounded mb-1.5" />
                            <div className="h-3 w-20 bg-slate-50 rounded" />
                          </div>
                        </div>
                        <div className="h-6 w-20 bg-slate-50 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}