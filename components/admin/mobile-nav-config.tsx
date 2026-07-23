"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ICON_OPTIONS } from "@/components/icons"
import Swal from "sweetalert2"
import { Loader2, Smartphone, Save } from "lucide-react"

// Types matching AuthContext
export interface MobileNavItem {
  id: string
  position: 'left1' | 'left2' | 'center' | 'right1' | 'right2'
  title?: string
  icon?: string
  route?: string
  type?: 'quick_actions' | 'link'
}

export interface MobileNavigationConfig {
  enabled: boolean
  items: MobileNavItem[]
}

const DEFAULT_MOBILE_NAV: MobileNavigationConfig = {
  enabled: true,
  items: [
    { position: "left1", id: "dashboard", title: "Dashboard", route: "/app", icon: "LayoutDashboard", type: "link" },
    { position: "left2", id: "calendar", title: "Calendar", route: "/app/events/calendar", icon: "CalendarDays", type: "link" },
    { position: "center", id: "quick", type: "quick_actions" },
    { position: "right1", id: "tasks", title: "Tasks", route: "/app/tasks", icon: "CheckSquare", type: "link" },
    { position: "right2", id: "profile", title: "Profile", route: "/app/profile/user", icon: "User", type: "link" }
  ]
}

const POSITIONS = ['left1', 'left2', 'center', 'right1', 'right2'] as const

export function MobileNavConfigPanel() {
  const { globalSettings } = useAuth()
  const [config, setConfig] = useState<MobileNavigationConfig>(DEFAULT_MOBILE_NAV)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (globalSettings?.mobileNavigation) {
      setConfig(globalSettings.mobileNavigation)
    }
  }, [globalSettings])

  const handleUpdateItem = (position: string, field: keyof MobileNavItem, value: any) => {
    setConfig(prev => {
      const items = [...prev.items]
      const idx = items.findIndex(i => i.position === position)
      if (idx !== -1) {
        items[idx] = { ...items[idx], [field]: value }
      } else {
        items.push({ position: position as any, id: `item-${Date.now()}`, [field]: value })
      }
      return { ...prev, items }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await setDoc(doc(db, "Platform", "settings"), {
        mobileNavigation: config
      }, { merge: true })
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        icon: 'success',
        title: 'Mobile Navigation saved successfully'
      })
    } catch (e) {
      console.error(e)
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Failed to save', timer: 3000 })
    } finally {
      setLoading(false)
    }
  }

  const getItem = (pos: string) => config.items.find(i => i.position === pos) || ({ position: pos as any, id: `new-${pos}`, type: 'link' } as MobileNavItem)

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-[#1C4D8D]"/> Mobile App Navigation</CardTitle>
          <CardDescription>Configure the bottom bar navigation for mobile devices.</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Enable Mobile Bar</Label>
          <Switch checked={config.enabled} onCheckedChange={(val) => setConfig({ ...config, enabled: val })} />
          <Button onClick={handleSave} disabled={loading} className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 ml-4">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {POSITIONS.map(pos => {
            const item = getItem(pos)
            return (
              <div key={pos} className={`p-4 border rounded-xl flex flex-col gap-4 ${pos === 'center' ? 'bg-[#1C4D8D]/5 border-[#1C4D8D]/20 shadow-inner' : 'bg-white'}`}>
                <div className="text-center">
                  <Badge variant="outline" className="mb-2 font-mono uppercase text-[10px] tracking-wider">{pos}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Action Type</Label>
                  <Select value={item.type || 'link'} onValueChange={val => handleUpdateItem(pos, 'type', val)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Page Link</SelectItem>
                      <SelectItem value="quick_actions">Quick Actions FAB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {item.type !== 'quick_actions' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Title</Label>
                      <Input 
                        placeholder="e.g. Dashboard" 
                        value={item.title || ''} 
                        onChange={e => handleUpdateItem(pos, 'title', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Icon Name</Label>
                      <Select value={item.icon || ''} onValueChange={val => handleUpdateItem(pos, 'icon', val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select icon..." /></SelectTrigger>
                        <SelectContent className="max-h-56">
                          {ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Route Path</Label>
                      <Input 
                        placeholder="e.g. /app/tasks" 
                        value={item.route || ''} 
                        onChange={e => handleUpdateItem(pos, 'route', e.target.value)} 
                        className="h-9 text-xs font-mono" 
                      />
                    </div>
                  </>
                )}
                {item.type === 'quick_actions' && (
                  <div className="pt-4 text-center text-xs text-slate-500">
                    This position will render the Quick Context Actions Button (+).
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Ensure Badge is exported from ui correctly, if not found, we import locally
import { Badge } from "@/components/ui/badge"
