"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
    createEvent, updateEvent,
    fetchStudioSettingsList, fetchPackagesList, fetchPackageConfig,
    EventData, EventDayConfig, CustomItem, PackageData, PackageConfigParameter
} from "@/services/event-service"
import { validateSubscriptionAction } from "@/services/subscription-service"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
    Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from "@/components/ui/drawer"

// Icons
import { Plus, Calendar as CalendarIcon, Loader2, Check, Trash2, Lock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

const DEFAULT_TYPES = ["Wedding", "Homecoming", "Preshoot", "Engagement", "Birthday", "Corporate", "Other"]

// Ordered workflow statuses. "Quotation" is always the entry point for new events.
const EVENT_STATUSES = [
    "Quotation",
    "Scheduled",
    "In Progress",
    "Post Production",
    "Review",
    "Completed",
    "Handed Over",
    "Cancelled",
]

interface EventFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Pass an existing event to edit; omit or null to create new */
    initialData?: EventData | null
    onSuccess?: () => void
}

export function EventFormDialog({ open, onOpenChange, initialData, onSuccess }: EventFormDialogProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const title = initialData ? "Edit Event" : "New Event"
    const description = initialData ? "Update event details." : "Create a new event inquiry."

    const formContent = (
        <EventForm
            key={initialData?.id ?? "new"}
            initialData={initialData}
            onSuccess={() => { onOpenChange(false); onSuccess?.() }}
            onCancel={() => onOpenChange(false)}
        />
    )

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[780px] p-0 flex flex-col max-h-[90vh] gap-0">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    {formContent}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[95vh] flex flex-col p-0 rounded-t-xl">
                <DrawerHeader className="px-6 py-4 border-b text-left shrink-0">
                    <DrawerTitle>{title}</DrawerTitle>
                    <DrawerDescription>{description}</DrawerDescription>
                </DrawerHeader>
                {formContent}
            </DrawerContent>
        </Drawer>
    )
}

// ---------------------------------------------------------------------------
// Internal form component
// ---------------------------------------------------------------------------

function EventForm({
    initialData,
    onSuccess,
    onCancel,
}: {
    initialData?: EventData | null
    onSuccess: () => void
    onCancel: () => void
}) {
    const { userData } = useAuth()
    const [submitting, setSubmitting] = useState(false)
    const [loaded, setLoaded] = useState(false)

    // Package lock: if customer has approved the quotation, disable package/pricing fields
    const isLocked = Boolean(initialData?.approval?.customer_confirmed)

    // Lists
    const [typeList, setTypeList] = useState<string[]>(DEFAULT_TYPES)
    const [packages, setPackages] = useState<PackageData[]>([])
    const [configParams, setConfigParams] = useState<PackageConfigParameter[]>([])

    // For a new event the only valid starting status is "Quotation"
    const isNew = !initialData

    // Form data — lazy initializer so the correct status/values are present
    // on the very first render (no flicker or race with useEffect)
    const [formData, setFormData] = useState<Partial<EventData>>(() => {
        if (initialData) {
            return {
                ...initialData,
                days: initialData.days.map(d => ({
                    ...d,
                    date: d.date instanceof Date
                        ? d.date
                        : new Date((d.date as any)?.seconds ? (d.date as any).seconds * 1000 : d.date),
                })),
            }
        }
        return {
            customerName: "", customerMobile: "", customerEmail: "",
            eventName: "", eventType: "", status: "Quotation",
            dayCount: 1,
            days: [{ date: new Date(), type: "package", cost: 0, customItems: [] }],
            discountType: "fixed",
            discount: 0,
            notes: "",
        }
    })

    // Load config on mount
    useEffect(() => {
        const init = async () => {
            if (!userData?.studioID) return
            try {
                const [types, pkgs, cfgParams] = await Promise.all([
                    fetchStudioSettingsList(userData.studioID, "EVENT_TYPES"),
                    fetchPackagesList(userData.studioID),
                    fetchPackageConfig(userData.studioID),
                ])
                if (types.length) setTypeList(types)
                setPackages(pkgs as PackageData[])
                setConfigParams(cfgParams as PackageConfigParameter[])
            } catch (e) {
                console.error(e)
            }
            setLoaded(true)
        }
        init()
    }, [userData])

    // Disable "Quotation" option when editing an event that has already moved past it
    const quotationLocked = !isNew && formData.status !== "Quotation"

    const financials = useMemo(() => {
        const total = (formData.days || []).reduce((acc, day: EventDayConfig) => acc + (day.cost || 0), 0)
        const discountAmount =
            formData.discountType === "percentage"
                ? total * ((formData.discount || 0) / 100)
                : Number(formData.discount || 0)
        return { total, discountAmount, subTotal: Math.max(0, total - discountAmount) }
    }, [formData.days, formData.discount, formData.discountType])

    // Day / package handlers
    const handleDayCountChange = (count: number) => {
        const newCount = Math.max(1, count)
        const currentDays = [...(formData.days || [])]
        if (newCount > currentDays.length) {
            for (let i = currentDays.length; i < newCount; i++) {
                const prevDate = new Date(currentDays[i - 1].date)
                prevDate.setDate(prevDate.getDate() + 1)
                currentDays.push({ date: prevDate, type: "package", cost: 0, customItems: [] })
            }
        } else {
            currentDays.length = newCount
        }
        setFormData({ ...formData, dayCount: newCount, days: currentDays })
    }

    const updateDayConfig = (index: number, updates: Partial<EventDayConfig>) => {
        const newDays = [...(formData.days || [])]
        const updatedDay = { ...newDays[index], ...updates }
        if (updates.packageId && updatedDay.type === "package") {
            const pkg = packages.find(p => p.id === updates.packageId)
            if (pkg) updatedDay.cost = Number(pkg.price || 0)
        }
        if (updates.customItems && updatedDay.type === "custom") {
            updatedDay.cost = updates.customItems.reduce(
                (sum, item: CustomItem) => sum + (item.price || 0) * (item.quantity || 1),
                0
            )
        }
        newDays[index] = updatedDay
        setFormData({ ...formData, days: newDays })
    }

    const addCustomItem = (dayIndex: number, param?: PackageConfigParameter) => {
        const day = formData.days![dayIndex]
        const newItem: CustomItem = param
            ? { name: param.name, quantity: 1, unit: param.unit || "", price: param.defaultPrice || 0 }
            : { name: "", quantity: 1, unit: "", price: 0 }
        updateDayConfig(dayIndex, { customItems: [...(day.customItems || []), newItem] })
    }

    const updateCustomItem = (dayIndex: number, itemIndex: number, field: keyof CustomItem, value: any) => {
        const day = formData.days![dayIndex]
        const newItems = [...(day.customItems || [])]
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }
        updateDayConfig(dayIndex, { customItems: newItems })
    }

    const removeCustomItem = (dayIndex: number, itemIndex: number) => {
        const day = formData.days![dayIndex]
        const newItems = (day.customItems || []).filter((_, i) => i !== itemIndex)
        updateDayConfig(dayIndex, { customItems: newItems })
    }

    const handleSubmit = async () => {
        if (!userData?.studioID) return
        if (!formData.eventName || !formData.customerName) {
            Swal.fire({ icon: "warning", title: "Missing required fields", text: "Event Name and Customer Name are required." })
            return
        }

        setSubmitting(true)

        if (!initialData) {
            const check = await validateSubscriptionAction(userData.studioID, "create_event")
            if (!check.allowed) {
                setSubmitting(false)
                Swal.fire({ icon: "error", title: "Limit Reached", text: check.message })
                return
            }
        }

        try {
            const payload = {
                ...formData,
                totalBudget: financials.total,
                finalBudget: financials.subTotal,
            } as EventData

            if (initialData?.id) {
                await updateEvent(userData.studioID, initialData.id, payload)
                Swal.fire({ icon: "success", title: "Event Updated", timer: 1500, showConfirmButton: false })
            } else {
                payload.inquiryDate = new Date()
                payload.advancePaid = 0
                payload.assignedCrew = []
                payload.assignedEquipment = []
                await createEvent(userData.studioID, payload)
                Swal.fire({ icon: "success", title: "Event Created", timer: 1500, showConfirmButton: false })
            }

            onSuccess()
        } catch {
            Swal.fire({ icon: "error", title: initialData ? "Failed to update" : "Failed to create" })
        } finally {
            setSubmitting(false)
        }
    }

    if (!loaded) {
        return (
            <div className="flex flex-1 items-center justify-center p-8 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading configurations...
            </div>
        )
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                {/* ── 1. CUSTOMER & META ── */}
                <div className="space-y-3">
                    <Input
                        placeholder="Event Name *"
                        value={formData.eventName}
                        onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                        className="bg-slate-50 font-medium"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 uppercase tracking-wide">Event Type</Label>
                            <Select value={formData.eventType} onValueChange={v => setFormData({ ...formData, eventType: v })}>
                                <SelectTrigger className="bg-slate-50">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 uppercase tracking-wide">Status</Label>
                            {isNew ? (
                                // New events are always created as Quotation — no choice needed
                                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 cursor-not-allowed">
                                    Quotation
                                </div>
                            ) : (
                                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                                    <SelectTrigger className="bg-slate-50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EVENT_STATUSES.map(s => (
                                            <SelectItem
                                                key={s}
                                                value={s}
                                                disabled={s === "Quotation" && quotationLocked}
                                            >
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <Input
                        placeholder="Customer Name *"
                        value={formData.customerName}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        className="bg-slate-50"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Mobile" value={formData.customerMobile} onChange={e => setFormData({ ...formData, customerMobile: e.target.value })} className="bg-slate-50" />
                        <Input placeholder="Email" value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} className="bg-slate-50" />
                    </div>
                </div>

                {/* ── 2. PACKAGES & PRICING ── */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Packages</h3>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Days</Label>
                            <Input
                                type="number" min="1" max="7"
                                className="w-14 h-7 text-center bg-slate-50 text-xs"
                                value={formData.dayCount}
                                disabled={isLocked}
                                onChange={e => handleDayCountChange(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Lock banner */}
                    {isLocked && (
                        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            <Lock className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                            <span>
                                Package details are <strong>locked</strong> — the customer has approved this quotation.
                                Only non-pricing fields can be edited.
                            </span>
                        </div>
                    )}

                    <div className={cn(isLocked && "opacity-60 pointer-events-none")}>
                        <Tabs defaultValue="day-0" className="w-full">
                            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100">
                                {formData.days?.map((_: EventDayConfig, i: number) => (
                                    <TabsTrigger key={i} value={`day-${i}`} className="px-4 py-1.5 text-xs">Day {i + 1}</TabsTrigger>
                                ))}
                            </TabsList>

                            {formData.days?.map((day: EventDayConfig, i: number) => (
                                <TabsContent key={i} value={`day-${i}`} className="border rounded-md p-4 mt-2 space-y-4 bg-white">
                                    {/* Date picker */}
                                    <div className="border rounded-md p-2 bg-slate-50 flex items-center justify-between">
                                        <Label className="text-xs text-slate-500 ml-2">Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="h-6 text-sm font-normal" disabled={isLocked}>
                                                    {day.date ? format(day.date, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-2 h-3 w-3 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={day.date}
                                                    onSelect={d => d && updateDayConfig(i, { date: d })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Package / Custom tabs */}
                                    <Tabs defaultValue={day.type} onValueChange={(v: any) => updateDayConfig(i, { type: v })} className="w-full">
                                        <TabsList className="w-full grid grid-cols-2 h-8">
                                            <TabsTrigger value="package" className="text-xs" disabled={isLocked}>Package</TabsTrigger>
                                            <TabsTrigger value="custom" className="text-xs" disabled={isLocked}>Custom Plan</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="package" className="pt-2 space-y-3">
                                            <Select value={day.packageId} onValueChange={v => updateDayConfig(i, { packageId: v })} disabled={isLocked}>
                                                <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                                                <SelectContent>
                                                    {packages.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} — LKR {p.price.toLocaleString()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {day.packageId && (() => {
                                                const pkg = packages.find(p => p.id === day.packageId)
                                                if (!pkg) return null
                                                return (
                                                    <div className="border rounded-md p-3 bg-white space-y-2 text-sm shadow-sm">
                                                        <div className="flex justify-between font-bold text-slate-800 pb-2 border-b">
                                                            <span>Price</span>
                                                            <span>LKR {Number(pkg.price).toLocaleString()}</span>
                                                        </div>
                                                        {pkg.featuresList?.length ? (
                                                            <div className="space-y-1.5">
                                                                {pkg.featuresList.map((f, idx) => (
                                                                    <div key={idx} className="flex items-center text-slate-600 text-xs">
                                                                        <Check className="h-3 w-3 text-green-500 mr-2" />
                                                                        <span>{f}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic">No features listed.</p>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </TabsContent>

                                        <TabsContent value="custom" className="pt-2 space-y-3">
                                            <div className="space-y-1.5">
                                                {/* Column headers — only shown when there are items */}
                                                {(day.customItems?.length ?? 0) > 0 && (
                                                    <div className="grid grid-cols-12 gap-2 px-1">
                                                        <div className="col-span-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Item</div>
                                                        <div className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-center">Qty</div>
                                                        <div className="col-span-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">Unit Price</div>
                                                        <div className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">Total</div>
                                                        <div className="col-span-1" />
                                                    </div>
                                                )}

                                                {day.customItems?.map((item: CustomItem, itemIdx: number) => {
                                                    const rowTotal = (item.price || 0) * (item.quantity || 1)
                                                    return (
                                                        <div key={itemIdx} className="grid grid-cols-12 gap-2 items-center bg-white rounded-md border border-slate-100 px-1 py-1">
                                                            <div className="col-span-4">
                                                                <Input
                                                                    placeholder="Item name"
                                                                    className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-brand-primary/30 px-2"
                                                                    value={item.name}
                                                                    disabled={isLocked}
                                                                    onChange={e => updateCustomItem(i, itemIdx, "name", e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Input
                                                                    type="number" min="1" placeholder="1"
                                                                    className="h-8 text-xs text-center border-slate-200 focus-visible:ring-brand-primary/30"
                                                                    value={item.quantity}
                                                                    disabled={isLocked}
                                                                    onChange={e => updateCustomItem(i, itemIdx, "quantity", Math.max(1, Number(e.target.value)))}
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Input
                                                                    type="number" min="0" placeholder="0"
                                                                    className="h-8 text-xs text-right border-slate-200 focus-visible:ring-brand-primary/30"
                                                                    value={item.price}
                                                                    disabled={isLocked}
                                                                    onChange={e => updateCustomItem(i, itemIdx, "price", Number(e.target.value))}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 text-right">
                                                                <span className="text-xs font-semibold text-brand-primary tabular-nums pr-1">
                                                                    {rowTotal.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    disabled={isLocked}
                                                                    onClick={() => removeCustomItem(i, itemIdx)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}

                                                <Select disabled={isLocked} onValueChange={val => {
                                                    if (val === "custom_new") addCustomItem(i)
                                                    else {
                                                        const param = configParams.find(p => p.name === val)
                                                        addCustomItem(i, param)
                                                    }
                                                }}>
                                                    <SelectTrigger className="h-8 text-xs bg-slate-50 border-dashed w-full text-left justify-start px-3 text-slate-500 hover:text-slate-800">
                                                        <span className="flex items-center"><Plus className="h-3 w-3 mr-2" /> Add Parameter</span>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {configParams.map((p, idx) => (
                                                            <SelectItem key={idx} value={p.name}>{p.name} {p.unit ? `(${p.unit})` : ""}</SelectItem>
                                                        ))}
                                                        <Separator className="my-1" />
                                                        <SelectItem value="custom_new">Other (Custom)...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Day subtotal */}
                                            <div className="flex items-center justify-between rounded-lg bg-brand-primary/5 border border-brand-primary/10 px-3 py-2">
                                                <span className="text-xs text-slate-600">
                                                    {day.customItems?.length ?? 0} item{(day.customItems?.length ?? 0) !== 1 ? "s" : ""}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500 mr-2">Day Total</span>
                                                    <span className="text-sm font-bold text-brand-primary">
                                                        {(day.cost || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>

                    {/* Financial summary */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3 border">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Budget</span>
                            <span className="font-semibold">LKR {financials.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Discount</span>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={formData.discountType}
                                    onValueChange={(v: any) => setFormData({ ...formData, discountType: v })}
                                    disabled={isLocked}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-xs bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">LKR</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    className="h-8 w-24 text-right bg-white text-sm"
                                    placeholder="0"
                                    value={formData.discount || ""}
                                    disabled={isLocked}
                                    onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 px-1">
                            <span />
                            <span>- LKR {financials.discountAmount.toLocaleString()}</span>
                        </div>
                        <Separator className="bg-slate-300" />
                        <div className="flex justify-between text-base font-bold text-brand-primary">
                            <span>Final Budget</span>
                            <span>LKR {financials.subTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* ── 3. NOTES ── */}
                <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                        placeholder="Specific requirements..."
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="bg-slate-50"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-white flex gap-3 shrink-0">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button
                    className="bg-brand-primary hover:bg-brand-primary-hover flex-1"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting
                        ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving...</>
                        : initialData ? "Save Changes" : "Create Event"
                    }
                </Button>
            </div>
        </div>
    )
}
