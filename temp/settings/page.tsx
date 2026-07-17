"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { Upload } from "lucide-react"

export default function SettingsPage() {
  const { studio } = useAuthGate()

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Studio Settings</h1>
        <p className="text-muted-foreground text-sm">Update your brand identity and public profile.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize how your studio appears to clients and crew.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-xl bg-slate-100 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 group cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Logo</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Studio Logo</h4>
              <p className="text-xs text-muted-foreground">PNG or JPG. Max 2MB. Recommended 400x400.</p>
              <Button variant="outline" size="sm" className="mt-2 h-8 text-xs bg-transparent">
                Update Image
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="studio-name">Legal Studio Name</Label>
              <Input id="studio-name" defaultValue={studio?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studio-email">Public Support Email</Label>
              <Input id="studio-email" placeholder="contact@studio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" placeholder="https://studio.com" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-slate-50/50 p-6 flex justify-end">
          <Button>Save Changes</Button>
        </CardFooter>
      </Card>

      <Card className="border-none shadow-sm border-l-4 border-l-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Plan Visibility</CardTitle>
          <CardDescription>These features are controlled by the Super Admin at ShutterStudio Central.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {studio?.features.map((f: string) => (
              <div
                key={f}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold uppercase text-slate-500 border"
              >
                {f}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Note: If a feature is missing from your sidebar, it has been disabled by the Super Admin.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
