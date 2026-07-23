import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { createStudioContact, updateStudioContact, StudioContact } from "@/services/customer-service"
import Swal from "sweetalert2"

interface ContactFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: StudioContact | null
    studioId: string
    onSuccess: () => void
}

export function ContactFormDialog({ open, onOpenChange, initialData, studioId, onSuccess }: ContactFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        email: "",
        notes: ""
    })

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    name: initialData.name || "",
                    mobile: initialData.mobile || "",
                    email: initialData.email || "",
                    notes: initialData.notes || ""
                })
            } else {
                setFormData({ name: "", mobile: "", email: "", notes: "" })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!studioId) return
        if (!formData.name.trim() || !formData.mobile.trim()) {
            Swal.fire("Required", "Please provide at least a name and mobile number.", "warning")
            return
        }

        setLoading(true)
        try {
            if (initialData?.id) {
                await updateStudioContact(studioId, initialData.id, formData)
            } else {
                await createStudioContact(studioId, formData)
            }
            onSuccess()
            onOpenChange(false)
            Swal.fire("Success", `Contact ${initialData ? "updated" : "saved"} successfully!`, "success")
        } catch (error) {
            console.error("Save Error", error)
            Swal.fire("Error", "Failed to save contact. Please try again.", "error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Contact" : "New Contact"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Update the details for this contact." : "Add a new customer to your studio phonebook directly."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                        <Input 
                            id="name" 
                            placeholder="e.g. John Doe"
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
                        <Input 
                            id="mobile" 
                            type="tel"
                            placeholder="e.g. 0771234567"
                            value={formData.mobile} 
                            onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                            id="email" 
                            type="email"
                            placeholder="Optional"
                            value={formData.email} 
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="notes">Internal Notes</Label>
                        <Input 
                            id="notes" 
                            placeholder="Optional context about the customer"
                            value={formData.notes} 
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-[#1C4D8D] hover:bg-[#153a6b]" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? "Save Changes" : "Create Contact"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
