"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, ChevronRight, Wand2 } from "lucide-react"

export default function ConsultationPage() {
  const [step, setStep] = useState(1)
  const [result, setResult] = useState<string | null>(null)

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
    else setResult("Premium Wedding Package")
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {!result ? (
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Studio Package Wizard</CardTitle>
            <CardDescription>We'll recommend the best photography package for your client.</CardDescription>
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 w-12 rounded-full ${step >= i ? "bg-primary" : "bg-slate-200"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent className="py-8 space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label className="text-lg font-semibold">What type of shoot is this?</Label>
                <RadioGroup defaultValue="wedding" className="grid grid-cols-2 gap-4">
                  {["Wedding", "Portrait", "Commercial", "Event"].map((type) => (
                    <div key={type}>
                      <RadioGroupItem value={type.toLowerCase()} id={type} className="peer sr-only" />
                      <Label
                        htmlFor={type}
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <span className="font-semibold">{type}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label className="text-lg font-semibold">Expected Budget Range</Label>
                <Select>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Under $2,000</SelectItem>
                    <SelectItem value="2">$2,000 - $5,000</SelectItem>
                    <SelectItem value="3">$5,000 - $10,000</SelectItem>
                    <SelectItem value="4">$10,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label className="text-lg font-semibold">Location Type</Label>
                <RadioGroup defaultValue="on-site">
                  <div className="flex items-center space-x-2 border p-4 rounded-md">
                    <RadioGroupItem value="on-site" id="on-site" />
                    <Label htmlFor="on-site" className="font-medium">
                      On-Site / Outdoor
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-4 rounded-md mt-2">
                    <RadioGroupItem value="studio" id="studio" />
                    <Label htmlFor="studio" className="font-medium">
                      Studio Indoor
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="ghost" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}>
              Back
            </Button>
            <Button onClick={handleNext}>
              {step === 3 ? "Generate Recommendation" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-primary p-8 text-primary-foreground text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 mb-4" />
            <h2 className="text-3xl font-bold">Recommended Package</h2>
            <p className="opacity-90">Based on your consultation data</p>
          </div>
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-primary mb-2">{result}</h3>
            <p className="text-muted-foreground mb-6">
              Includes 8 hours of coverage, 2 photographers, and premium album.
            </p>
            <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto bg-slate-50 p-6 rounded-xl">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Base Price</p>
                <p className="text-lg font-bold">$4,500</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Margin</p>
                <p className="text-lg font-bold text-green-600">65%</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 pt-0">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setResult(null)
                setStep(1)
              }}
            >
              Restart
            </Button>
            <Button className="flex-1">Create Quote</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
