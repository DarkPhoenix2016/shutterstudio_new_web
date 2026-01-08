"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Save, Trash2, Settings2 } from "lucide-react"
import Swal from "sweetalert2"

// --- Types ---
interface ParameterDef {
  name: string
  type: 'text' | 'number' | 'boolean'
  unit?: string // e.g., "mins", "pcs"
}

export default function CatalogueSettingsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // State for Parameters
  const [parameters, setParameters] = useState<ParameterDef[]>([])
  
  // State for New Input
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<'text'|'number'|'boolean'>("number")
  const [newUnit, setNewUnit] = useState("")

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!userData?.studioID) return
      
      try {
        const configRef = doc(db, "Studios", userData.studioID, "Packages", "CONFIG")
        const snap = await getDoc(configRef)
        
        if (snap.exists()) {
          setParameters(snap.data().parameters || [])
        }
      } catch (e) {
        console.error("Fetch settings error", e)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) fetchSettings()
  }, [userData, authLoading])

  // Add Parameter
  const handleAdd = () => {
    if (!newName.trim()) return
    // Check duplicate
    if (parameters.some(p => p.name.toLowerCase() === newName.trim().toLowerCase())) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Parameter already exists', timer: 3000, showConfirmButton: false })
        return
    }

    setParameters([...parameters, { name: newName.trim(), type: newType, unit: newUnit.trim() }])
    setNewName("")
    setNewUnit("")
    setNewType("number")
  }

  // Delete Parameter
  const handleDelete = (index: number) => {
    const newParams = parameters.filter((_, i) => i !== index)
    setParameters(newParams)
  }

  // Save to Firebase
  const handleSave = async () => {
    if (!userData?.studioID) return
    setSaving(true)
    
    try {
      const configRef = doc(db, "Studios", userData.studioID, "Packages", "CONFIG")
      await setDoc(configRef, { parameters }, { merge: true })
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Settings saved successfully',
        timer: 3000,
        showConfirmButton: false
      })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Catalogue Settings</h1>
            <p className="text-slate-500">Define the structure and parameters for your packages.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#1C4D8D]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Save Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#1C4D8D]"/> Package Parameters</CardTitle>
            <CardDescription>Define what deliverables are tracked in your packages (e.g., Number of Photos, Video Length).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Input Area */}
            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                <div className="flex-1 space-y-2 w-full">
                    <Label>Parameter Name</Label>
                    <Input placeholder="e.g. Edited Photos" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="w-full md:w-40 space-y-2">
                    <Label>Data Type</Label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-32 space-y-2">
                    <Label>Unit (Opt)</Label>
                    <Input placeholder="e.g. pcs" value={newUnit} onChange={e => setNewUnit(e.target.value)} disabled={newType === 'boolean'} />
                </div>
                <Button onClick={handleAdd} variant="secondary" className="w-full md:w-auto"><Plus className="h-4 w-4 mr-2"/> Add</Button>
            </div>

            {/* List */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Parameter Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parameters.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-slate-400 py-8">No parameters defined yet.</TableCell>
                            </TableRow>
                        )}
                        {parameters.map((param, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium">{param.name}</TableCell>
                                <TableCell className="capitalize badge">{param.type}</TableCell>
                                <TableCell className="text-slate-500">{param.unit || "-"}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}