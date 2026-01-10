"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useParams, useRouter } from "next/navigation"
import { 
    fetchEventById, updateEvent, fetchStudioSettingsList, 
    checkResourceAvailability, EventData, EventContact, EventLocation, TransactionRecord,
    fetchPackageConfig, fetchPackagesList, PackageData, AdditionalService,
    EventDayConfig, CustomItem, PackageConfigParameter
} from "@/services/event-service"
import { uploadFileToStorage } from "@/lib/storage-utils"
import { compressImage } from "@/lib/image-utils"
import {
    fetchInventory, InventoryItem,
    assignInventorySchedule, removeInventorySchedule
} from "@/services/inventory-service"
import { ref, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { arrayUnion, arrayRemove } from "firebase/firestore"
import {
    fetchCrewMembers,
    assignCrewSchedule, removeCrewSchedule
} from "@/services/crew-service"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { deleteField } from "firebase/firestore"
import { validateSubscriptionAction } from "@/services/subscription-service"



// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import {
    Loader2, ArrowLeft, Save, MapPin, Phone,
    Plus, Trash2, Camera, Lock, FileText,
    Calendar as CalendarIcon, CheckCircle, RefreshCcw, ExternalLink,
    MessageCircle, LayoutGrid, Pencil, Check, DollarSign,
    TrendingUp, Wallet, Search, Users, Briefcase, ChevronDown,ChevronLeft,ChevronRight,
    ImageIcon, UploadCloud, X, Maximize2
} from "lucide-react"
import { format } from "date-fns"
import Swal from "sweetalert2"

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
})

// --- HELPER: SAFE DATE PARSING ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (dateInput instanceof Date) return dateInput;
        if (typeof dateInput === 'object') {
            if (typeof dateInput.toDate === 'function') return dateInput.toDate();
            if ('seconds' in dateInput) return new Date(dateInput.seconds * 1000);
        }
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
        return new Date();
    }
};

// --- HELPER: CUSTOM SEARCHABLE SELECT ---
function SearchableSelect({
    options,
    placeholder,
    onSelect,
    grouped = false
}: {
    options: { id: string, label: string, group?: string, disabled?: boolean }[],
    placeholder: string,
    onSelect: (val: string) => void,
    grouped?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))

    // Grouping Logic
    const groupedOptions = useMemo(() => {
        if (!grouped) return { "All": filtered };
        return filtered.reduce((acc, opt) => {
            const g = opt.group || "Other";
            if (!acc[g]) acc[g] = [];
            acc[g].push(opt);
            return acc;
        }, {} as Record<string, typeof options>);
    }, [filtered, grouped]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-[220px] justify-between text-xs h-9">
                    {placeholder}
                    <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
                <div className="p-2 border-b">
                    <div className="flex items-center px-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-6 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                    {Object.entries(groupedOptions).map(([group, opts]) => (
                        <div key={group}>
                            {grouped && opts.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">{group}</div>}
                            {opts.map(opt => (
                                <div
                                    key={opt.id}
                                    onClick={() => { if (!opt.disabled) { onSelect(opt.id); setOpen(false); setSearch(""); } }}
                                    className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No matching results.</div>}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default function EventDetailPage() {
    const { id } = useParams()
    const { userData } = useAuth()
    const router = useRouter()

    // State
    const [event, setEvent] = useState<EventData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [currency, setCurrency] = useState("LKR") // Default Currency

    // Edit States for Modals
    const [editingContact, setEditingContact] = useState<EventContact | null>(null)
    const [isContactOpen, setIsContactOpen] = useState(false)

    const [editingLocation, setEditingLocation] = useState<EventLocation | null>(null)
    const [isLocationOpen, setIsLocationOpen] = useState(false)

    const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null)
    const [isTransactionOpen, setIsTransactionOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income')

    // --- ADDITIONALS (SERVICES) STATE ---
    const [editingService, setEditingService] = useState<AdditionalService | null>(null)
    const [isServiceOpen, setIsServiceOpen] = useState(false)

    // New state to control "Custom" vs "Preset" logic
    const [serviceNameInput, setServiceNameInput] = useState("")
    const [servicePriceInput, setServicePriceInput] = useState<number>(0)
    const [isCustomService, setIsCustomService] = useState(false)

    // Lists & Data
    const [paymentMethods, setPaymentMethods] = useState<string[]>([])
    const [crewList, setCrewList] = useState<any[]>([])
    const [equipmentList, setEquipmentList] = useState<InventoryItem[]>([])
    const [serviceParams, setServiceParams] = useState<any[]>([])
    const [activePackage, setActivePackage] = useState<PackageData | null>(null)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    // --- NEW LISTS FOR PACKAGE EDITING ---
    const [packagesList, setPackagesList] = useState<PackageData[]>([])
    const [configParams, setConfigParams] = useState<PackageConfigParameter[]>([])

    // Load Data
    useEffect(() => {
        const load = async () => {
            if (userData?.studioID && id) {
                // Fetch Studio Doc for Currency
                const studioRef = doc(db, "Studios", userData.studioID);
                const studioSnap = await getDoc(studioRef);
                if (studioSnap.exists()) {
                    setCurrency(studioSnap.data().base_currency || "LKR");
                }

                const [evtData, methods, crew, equip, params, allPackages] = await Promise.all([
                    fetchEventById(userData.studioID, id as string),
                    fetchStudioSettingsList(userData.studioID, 'payment_methods'),
                    fetchCrewMembers(userData.studioID),
                    fetchInventory(userData.studioID),
                    fetchPackageConfig(userData.studioID),
                    fetchPackagesList(userData.studioID)
                ])

                setEvent(evtData)
                setPaymentMethods(methods)
                setCrewList(crew)
                setEquipmentList(equip)
                setServiceParams(params)

                // Store full lists for the Package & Notes tab
                setPackagesList(allPackages as PackageData[]);
                setConfigParams(params as PackageConfigParameter[]);

                if (evtData && evtData.days?.length > 0 && evtData.days[0].packageId) {
                    const foundPkg = allPackages.find(p => p.id === evtData.days[0].packageId);
                    if (foundPkg) setActivePackage(foundPkg);
                }

                setLoading(false)
            }
        }
        load()
    }, [userData, id])

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!event || !userData?.studioID || !e.target.files?.[0]) return;
        
        const file = e.target.files[0];
        const currentCount = event.galleryUrls?.length || 0;

        // 1. Check Subscription Limit
        const limitCheck = await validateSubscriptionAction(userData.studioID, 'check_photo_limit', currentCount + 1);
        if (!limitCheck.allowed) {
            return Swal.fire({ icon: 'error', title: 'Limit Reached', text: limitCheck.message });
        }

        setUploading(true);
        try {
            // 2. Compress & Prepare
            const compressedFile = await compressImage(file);
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `event_${event.displayId || event.id}_${Date.now()}.${ext}`;
            const path = `Studios/${userData.studioID}/Events/${event.id}/${fileName}`;

            // 3. Upload
            const url = await uploadFileToStorage(path, compressedFile);

            // 4. Update Firestore
            await handleUpdateEvent({ 
                galleryUrls: [...(event.galleryUrls || []), url] 
            });
            
            Toast.fire({ icon: 'success', title: 'Photo uploaded' });
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Upload failed' });
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    // [!code ++] NEW: Gallery Delete Handler
    const handleGalleryDelete = async (url: string) => {
        if (!event || !userData?.studioID) return;

        const result = await Swal.fire({
            title: 'Delete Image?',
            text: "This cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it'
        });

        if (!result.isConfirmed) return;

        setSaving(true); // Reuse saving state for UI feedback
        try {
            // 1. Delete from Storage (Try/Catch in case file is missing but link exists)
            try {
                // Extract relative path from URL or reconstruct it if you follow strict naming
                // Simple regex to extract path from Firebase Storage URL
                const fileRef = ref(storage, url); 
                await deleteObject(fileRef);
            } catch (storageErr) {
                console.warn("Storage file might already be gone", storageErr);
            }

            // 2. Remove from Firestore
            const newGallery = (event.galleryUrls || []).filter(u => u !== url);
            await handleUpdateEvent({ galleryUrls: newGallery });
            
            Toast.fire({ icon: 'success', title: 'Image deleted' });
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Delete failed' });
        } finally {
            setSaving(false);
        }
    };

    // Helper to check if gallery is active
    const isGalleryEnabled = ["In Progress", "Post Production", "Review", "Completed", "Handed Over"].includes(event?.status || "");

    // --- CALCULATIONS ---
    const financials = useMemo(() => {
        if (!event) return { total: 0, baseCost: 0, servicesCost: 0, discountAmount: 0, finalBudget: 0, paid: 0, due: 0, totalExpenses: 0, profit: 0 };

        // Recalculate baseCost based on current Days config
        const baseCost = event.days?.reduce((acc, day) => acc + (day.cost || 0), 0) || 0;
        const servicesCost = event.additionalServices?.reduce((acc, s) => acc + (s.total || 0), 0) || 0;
        const totalBudget = baseCost + servicesCost;

        let discountAmount = 0;
        if (event.discountType === 'percentage') {
            discountAmount = totalBudget * ((event.discount || 0) / 100);
        } else {
            discountAmount = Number(event.discount || 0);
        }

        const finalBudget = Math.max(0, totalBudget - discountAmount);

        // Split Transactions
        const paid = event.transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;
        const totalExpenses = event.transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;

        return {
            total: totalBudget,
            baseCost,
            servicesCost,
            discountAmount,
            finalBudget,
            paid,
            due: finalBudget - paid,
            totalExpenses,
            profit: finalBudget - totalExpenses
        };
    }, [event]);

    // --- ACTIONS ---

    const handleUpdateEvent = async (updates: Partial<EventData>) => {
        if (!event || !userData?.studioID) return;
        if (event.approval?.customer_confirmed && (updates.eventName || updates.days)) {
            Toast.fire({ icon: 'warning', title: 'Event is locked by customer approval.' });
            return;
        }
        setSaving(true);
        try {
            // If we are updating days or discounts, we must also update the final budgets
            let calculatedUpdates = { ...updates };

            if (updates.days || updates.discount || updates.discountType) {
                // We rely on the backend or next render to sync, but for immediate UI consistency
                // we can't easily recalculate everything here without duplicating logic.
                // However, the 'financials' memo updates the UI.
                // We should save the computed values to DB.
                // (Simplified for this snippet: saving what's passed)
            }

            await updateEvent(userData.studioID, event.id!, calculatedUpdates);
            setEvent(prev => prev ? { ...prev, ...calculatedUpdates } : null);
            Toast.fire({ icon: 'success', title: 'Saved' });
        } catch (e) {
            Toast.fire({ icon: 'error', title: 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    // --- PACKAGE & NOTES EDITING LOGIC ---
    const handleDayCountChange = (count: number) => {
        if (!event) return;
        const newCount = Math.max(1, count);
        const currentDays = [...(event.days || [])];
        if (newCount > currentDays.length) {
            for (let i = currentDays.length; i < newCount; i++) {
                const prevDate = new Date(currentDays[i - 1].date);
                prevDate.setDate(prevDate.getDate() + 1);
                currentDays.push({ date: prevDate, type: 'package', cost: 0, customItems: [] });
            }
        } else if (newCount < currentDays.length) {
            currentDays.length = newCount;
        }
        // Update local state directly for responsiveness, user must click Save to persist
        setEvent({ ...event, dayCount: newCount, days: currentDays });
    }

    const updateDayConfig = (index: number, updates: Partial<EventDayConfig>) => {
        if (!event) return;
        const newDays = [...(event.days || [])];
        const updatedDay = { ...newDays[index], ...updates };

        // Auto-price update logic
        if (updates.packageId && updatedDay.type === 'package') {
            const pkg = packagesList.find(p => p.id === updates.packageId);
            if (pkg) updatedDay.cost = Number(pkg.price || 0);
        }
        if (updates.customItems && updatedDay.type === 'custom') {
            updatedDay.cost = updates.customItems.reduce(
                (sum, item) =>
                    sum + (Number(item.quantity || 1) * Number(item.price || 0)),
                0
            )
        }
        newDays[index] = updatedDay;
        setEvent({ ...event, days: newDays });
    }

    const addCustomItem = (dayIndex: number, param?: PackageConfigParameter) => {
        if (!event) return;
        const day = event.days![dayIndex];
        const newItem: CustomItem = param
            ? { name: param.name, quantity: 1, unit: param.unit || "", price: param.defaultPrice || 0 }
            : { name: "", quantity: 1, unit: "", price: 0 };

        const newItems = [...(day.customItems || []), newItem];
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const updateCustomItem = (dayIndex: number, itemIndex: number, field: keyof CustomItem, value: any) => {
        if (!event) return;
        const day = event.days![dayIndex];
        const newItems = [...(day.customItems || [])];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const removeCustomItem = (dayIndex: number, itemIndex: number) => {
        if (!event) return;
        const day = event.days![dayIndex];
        const newItems = (day.customItems || []).filter((_: CustomItem, i: number) => i !== itemIndex);
        updateDayConfig(dayIndex, { customItems: newItems });
    }

    const savePackageChanges = async () => {
        if (!event) return;

        // [!code ++]
        if (event.approval?.customer_confirmed) {
            return Swal.fire({
                icon: 'warning',
                title: 'Quotation Locked',
                text: 'You must reset the customer approval in the Overview tab before making changes to the package.'
            });
        }

        // Calculate final budget to save to DB
        const updates = {
            days: event.days,
            dayCount: event.dayCount,
            discount: event.discount,
            discountType: event.discountType,
            notes: event.notes,
            totalBudget: financials.total,
            finalBudget: financials.finalBudget
        };
        await handleUpdateEvent(updates);
    }

    // --- EXISTING ACTIONS (Reset, Upload, Remove etc) ---

    const handleResetApproval = async () => {
        if (!event) return

        // BLOCK RESET FOR PROGRESSED EVENTS
        if (["In Progress", "Completed", "Handed Over"].includes(event.status)) {
            return Swal.fire({
                icon: "error",
                title: "Cannot Reset",
                text: "This event has already progressed beyond quotation."
            })
        }

        const result = await Swal.fire({
            title: 'Reset Approval?',
            text: 'This will unlock the quotation and revert the event back to Quotation status.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, reset'
        })

        if (!result.isConfirmed) return

        await handleUpdateEvent({
            status: "Quotation",
            "approval.customer_confirmed": false,
            "approval.confirmedAt": deleteField()
        } as any)
    }



    const handleUploadImage = async (file: File, isCover: boolean) => {
        if (!event || !userData?.studioID) return;
        setUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const fileName = isCover ? 'cover' : `gallery_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const path = `Studios/${userData.studioID}/Events/${event.displayId || event.id}/${fileName}`;
            const url = await uploadFileToStorage(path, compressedFile);

            if (isCover) {
                await handleUpdateEvent({ couplePhotoUrl: url });
            } else {
                const newGallery = [...(event.galleryUrls || []), url];
                await handleUpdateEvent({ galleryUrls: newGallery });
            }
        } catch (e) {
            console.error(e);
            Toast.fire({ icon: 'error', title: 'Upload failed' });
        } finally {
            setUploading(false);
        }
    };

    // --- ARRAY CRUD HELPERS ---
    const removeArrayItem = async (field: keyof EventData, id: string) => {
        if (!event) return;
        const currentList = (event[field] as any[]) || [];
        await handleUpdateEvent({ [field]: currentList.filter((x: any) => x.id !== id) });
    };

    const saveContact = async (f: FormData) => {
        if (!event) return;
        const item = { id: editingContact?.id || crypto.randomUUID(), name: f.get('name') as string, role: f.get('role') as string, phone: f.get('phone') as string, note: f.get('note') as string };
        const list = editingContact ? (event.contacts || []).map(c => c.id === item.id ? item : c) : [...(event.contacts || []), item];
        await handleUpdateEvent({ contacts: list }); setIsContactOpen(false); setEditingContact(null);
    }
    const saveLocation = async (f: FormData) => {
        if (!event) return;
        const item = { id: editingLocation?.id || crypto.randomUUID(), name: f.get('name') as string, mapUrl: f.get('mapUrl') as string, date: new Date(f.get('date') as string), time: f.get('time') as string, note: f.get('note') as string };
        const list = editingLocation ? (event.locations || []).map(l => l.id === item.id ? item : l) : [...(event.locations || []), item];
        await handleUpdateEvent({ locations: list }); setIsLocationOpen(false); setEditingLocation(null);
    }
    const saveTransaction = async (f: FormData) => {
        if (!event) return;
        const item = { id: editingTransaction?.id || crypto.randomUUID(), date: new Date(f.get('date') as string), amount: Number(f.get('amount')), method: f.get('method') as string, note: f.get('note') as string, type: transactionType };
        const list = editingTransaction ? (event.transactions || []).map(t => t.id === item.id ? item : t) : [...(event.transactions || []), item];
        await handleUpdateEvent({ transactions: list }); setIsTransactionOpen(false); setEditingTransaction(null);
    }

    // --- ADDITIONALS (SERVICES) HANDLER ---
    const saveService = async (formData: FormData) => {
        if (!event) return;
        const quantity = Number(formData.get('quantity'));
        const price = Number(formData.get('price'));

        const newItem: AdditionalService = {
            id: editingService ? editingService.id : crypto.randomUUID(),
            name: serviceNameInput,
            type: isCustomService ? 'custom' : 'parameter',
            quantity: quantity,
            pricePerUnit: price,
            total: quantity * price
        };

        const currentList = event.additionalServices || [];
        const updatedList = editingService
            ? currentList.map(s => s.id === newItem.id ? newItem : s)
            : [...currentList, newItem];

        await handleUpdateEvent({ additionalServices: updatedList });
        setIsServiceOpen(false);
        setEditingService(null);
    };

    const openAddService = () => {
        setEditingService(null);
        setServiceNameInput("");
        setServicePriceInput(0);
        setIsCustomService(false);
        setIsServiceOpen(true);
    }

    const openEditService = (svc: AdditionalService) => {
        setEditingService(svc);
        setServiceNameInput(svc.name);
        setServicePriceInput(svc.pricePerUnit);
        const isPreset = serviceParams.some(p => p.name === svc.name);
        setIsCustomService(!isPreset);
        setIsServiceOpen(true);
    }

    // --- RESOURCE ASSIGNMENT LOGIC ---
    const checkAndAssignResource = async (resourceId: string, type: 'crew' | 'equipment') => {
        if (!event || !event.id || !userData?.studioID) return;

        const currentEventId = event.id;
        const studioId = userData.studioID;
        let allDaysAvailable = true;
        let conflictMsg = "";

        for (const day of event.days) {
            const check = await checkResourceAvailability(
                studioId,
                day.date,
                resourceId,
                type,
                currentEventId
            );

            if (!check.available) {
                allDaysAvailable = false;
                conflictMsg = check.message || "Resource unavailable";
                break;
            }
        }

        if (!allDaysAvailable) {
            return Swal.fire({
                title: 'Unavailable',
                text: conflictMsg,
                icon: 'error'
            });
        }

        setSaving(true);
        try {
            if (type === 'crew') {
                const current = event.assignedCrew || [];
                if (!current.includes(resourceId)) {
                    await handleUpdateEvent({ assignedCrew: [...current, resourceId] });
                    await Promise.all(event.days.map(day =>
                        assignCrewSchedule(resourceId, safeDate(day.date), currentEventId)
                    ));
                }
            } else {
                const current = event.assignedEquipment || [];
                if (!current.includes(resourceId)) {
                    await handleUpdateEvent({ assignedEquipment: [...current, resourceId] });
                    await Promise.all(event.days.map(day =>
                        assignInventorySchedule(studioId, resourceId, safeDate(day.date), currentEventId)
                    ));
                }
            }
            Toast.fire({ icon: 'success', title: 'Resource assigned successfully' });
        } catch (e) {
            console.error(e);
            Toast.fire({ icon: 'error', title: 'Assignment failed' });
        } finally {
            setSaving(false);
        }
    };

    const unassignResource = async (resourceId: string, type: 'crew' | 'equipment') => {
        if (!event || !event.id || !userData?.studioID) return;

        const currentEventId = event.id;
        const studioId = userData.studioID;

        const confirm = await Swal.fire({
            title: 'Unassign Resource?',
            text: "This will remove them from the schedule.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, remove'
        });

        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            if (type === 'crew') {
                const newCrew = (event.assignedCrew || []).filter(id => id !== resourceId);
                await handleUpdateEvent({ assignedCrew: newCrew });
                await Promise.all(event.days.map(day =>
                    removeCrewSchedule(resourceId, safeDate(day.date), currentEventId)
                ));
            } else {
                const newEq = (event.assignedEquipment || []).filter(id => id !== resourceId);
                await handleUpdateEvent({ assignedEquipment: newEq });
                await Promise.all(event.days.map(day =>
                    removeInventorySchedule(studioId, resourceId, safeDate(day.date), currentEventId)
                ));
            }
            Toast.fire({ icon: 'success', title: 'Resource unassigned' });
        } catch (e) {
            console.error(e);
            Toast.fire({ icon: 'error', title: 'Removal failed' });
        } finally {
            setSaving(false);
        }
    }

    const statusOptions = ["Quotation", "Scheduled", "In Progress", "Post Production", "Review", "Completed", "Handed Over"];
    const showGallery = event && ["Post Production", "Review", "Completed", "Handed Over"].includes(event.status || "");
    const isLocked = event?.approval?.customer_confirmed;

    if (loading || !event) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in bg-gray-50/50 min-h-screen">

            {/* HEADER NAV */}
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
                </Button>
                <div className="flex gap-2">
                    <Button disabled={saving} onClick={() => handleUpdateEvent({})} className="bg-[#1C4D8D]">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
                    <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
                    <TabsTrigger value="package_edit" className="px-6 py-2">Package & Notes</TabsTrigger>
                    {isGalleryEnabled && <TabsTrigger value="gallery" className="px-6 py-2">Gallery</TabsTrigger>}
                    <TabsTrigger value="contacts" className="px-6 py-2">Contacts</TabsTrigger>
                    <TabsTrigger value="additionals" className="px-6 py-2">Additionals</TabsTrigger>
                    <TabsTrigger value="locations" className="px-6 py-2">Locations</TabsTrigger>
                    <TabsTrigger value="resources" className="px-6 py-2">Resources</TabsTrigger>
                    <TabsTrigger value="payments" className="px-6 py-2">Payments</TabsTrigger>
                    <TabsTrigger value="expenses" className="px-6 py-2">Expenses</TabsTrigger>
                </TabsList>

                {/* --- 1. OVERVIEW TAB --- */}
                <TabsContent value="overview" className="space-y-6">

                    {/* HERO SECTION */}
                    <div className="relative w-full h-80 rounded-2xl overflow-hidden group shadow-md border border-slate-200 bg-slate-900">
                        <img src={event.couplePhotoUrl || "/api/placeholder/800/400"} alt="Event Cover" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute top-4 right-4">
                            <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Change Cover
                                <input type="file" className="hidden" accept=".jpg, .jpeg, .png" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], true)} />
                            </label>
                        </div>
                        <div className="absolute bottom-0 left-0 p-8 w-full">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 mb-1">
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 uppercase tracking-wider text-[10px]">{event.eventType}</Badge>
                                    <Badge variant="outline" className="text-white border-white/30 backdrop-blur-md">{event.status || "Planned"}</Badge>
                                    {isLocked && <Badge className="bg-green-500/80 text-white border-0 backdrop-blur-md gap-1"><Lock className="w-3 h-3" /> Confirmed</Badge>}
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{event.eventName}</h1>
                                <p className="text-slate-300 font-medium text-lg flex items-center gap-2 mt-1">
                                    <CalendarIcon className="w-5 h-5" />
                                    {event.days.length > 0 ? format(safeDate(event.days[0].date), 'MMMM do, yyyy') : 'Date TBD'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* APPROVAL STATE SECTION */}
                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-700">State of Customer Approval</h3>
                                {isLocked ? (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Approved</Badge>
                                ) : (
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">Pending Review</Badge>
                                )}
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                                <div className={`h-2.5 rounded-full ${isLocked ? 'bg-green-500 w-full' : 'bg-blue-600 w-[60%]'}`}></div>
                            </div>

                            <p className="text-sm text-slate-500">
                                {isLocked
                                    ? `Customer confirmed on ${(event.approval as any)?.confirmedAt ? format(safeDate((event.approval as any).confirmedAt), "PPP p") : "Unknown date"}`
                                    : "Waiting for customer to sign off on the Quotation."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* ACTION BARS */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <Card className="lg:col-span-3 shadow-sm border-slate-200">
                            <CardHeader className=""><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Event Management</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                                    {statusOptions.map((status, idx) => (
                                        <button key={idx} onClick={() => handleUpdateEvent({ status })} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all ${event.status === status ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>{status}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="outline" size="sm" className="gap-2" onClick={handleResetApproval}><RefreshCcw className="w-4 h-4" /> Reset Approval</Button>
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => Toast.fire({ icon: 'info', title: 'Invoice Generated' })}><FileText className="w-4 h-4" /> Generate Invoice</Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() =>
                                            window.open(
                                                `/public/event/${event.id}`,
                                                "_blank"
                                            )
                                        }
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Customer View
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className=""><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Communication</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 gap-3">
                                <a href={`tel:${event.customerMobile}`} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"><Phone className="w-4 h-4 text-blue-600" /> Call Customer</a>
                                <a href={`sms:${event.customerMobile}`} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"><MessageCircle className="w-4 h-4 text-green-600" /> Send SMS</a>
                                <a href={`https://wa.me/${event.customerMobile}`} target="_blank" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"><MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp</a>
                            </CardContent>
                        </Card>

                    </div>
                    {/* MANAGE SECTIONS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100  flex flex-row justify-between items-center"><CardTitle className="text-sm font-bold text-slate-700">Locations</CardTitle><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActiveTab('locations')}>Manage</Button></CardHeader>
                            <div className="overflow-x-auto p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Date</th><th className="px-4 py-2 text-right">Map</th></tr></thead>
                                    <tbody>
                                        {event.locations?.map((l, i) => (
                                            <tr key={i} className="border-b last:border-0"><td className="px-4 py-2 font-medium">{l.name}</td><td className="px-4 py-2 text-slate-600">{format(safeDate(l.date), 'MM/dd/yyyy')}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {l.mapUrl && <a href={l.mapUrl} target="_blank" className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"><ExternalLink size={12} /> Open Map</a>}
                                                </td></tr>
                                        ))}
                                        {(!event.locations?.length) && <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">No locations set.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 flex flex-row justify-between items-center"><CardTitle className="text-sm font-bold text-slate-700">Event Contacts</CardTitle><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActiveTab('contacts')}>Manage</Button></CardHeader>
                            <div className="overflow-x-auto p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2 text-center">Actions</th></tr></thead>
                                    <tbody>
                                        {event.contacts?.map((c, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-2 font-medium">{c.name}</td><td className="px-4 py-2"><Badge variant="outline" className="bg-white">{c.role}</Badge></td><td className="px-4 py-2 text-slate-600">{c.phone}</td>
                                                <td className="px-4 py-2 flex justify-center gap-2"><a href={`tel:${c.phone}`} className="p-1.5 text-blue-600 bg-blue-50 rounded"><Phone size={14} /></a><a href={`https://wa.me/${c.phone}`} className="p-1.5 text-green-600 bg-green-50 rounded"><MessageCircle size={14} /></a></td>
                                            </tr>
                                        ))}
                                        {(!event.contacts?.length) && <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">No contacts added.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>



                    {/* MAIN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3"><CardTitle className="text-sm font-bold text-slate-700">Customer Details</CardTitle></CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div><Label className="text-xs text-slate-400 uppercase">Full Name</Label><Input value={event.customerName} onChange={(e) => setEvent({ ...event!, customerName: e.target.value })} className="mt-1 h-9 bg-slate-50" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-xs text-slate-400 uppercase">Mobile</Label><Input value={event.customerMobile} onChange={(e) => setEvent({ ...event!, customerMobile: e.target.value })} className="mt-1 h-9 bg-slate-50" /></div>
                                        <div><Label className="text-xs text-slate-400 uppercase">Email</Label><Input value={event.customerEmail} onChange={(e) => setEvent({ ...event!, customerEmail: e.target.value })} className="mt-1 h-9 bg-slate-50" /></div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3"><CardTitle className="text-sm font-bold text-slate-700">Financial Summary</CardTitle></CardHeader>
                                <CardContent className="p-4 space-y-4 text-sm">

                                    {/* PACKAGES */}
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Packages (Days)</span>
                                        <span className="font-medium text-slate-900">
                                            {currency} {financials.baseCost.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* ADDITIONAL SERVICES */}
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Additional Services & Charges</span>
                                        <span className="font-medium text-slate-900">
                                            {currency} {financials.servicesCost.toLocaleString()}
                                        </span>
                                    </div>

                                    <Separator />

                                    {/* SUB TOTAL */}
                                    <div className="flex justify-between font-semibold">
                                        <span className="text-slate-600">Sub Total</span>
                                        <span className="text-slate-900">
                                            {currency} {financials.total.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* DISCOUNT */}
                                    {financials.discountAmount > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>
                                                Discount
                                                {event.discountType === "percentage"
                                                    ? ` (${event.discount}%)`
                                                    : ""}
                                            </span>
                                            <span>
                                                − {currency} {financials.discountAmount.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* FINAL BUDGET */}
                                    <div className="flex justify-between text-base font-bold text-[#1C4D8D]">
                                        <span>Final Budget</span>
                                        <span>
                                            {currency} {financials.finalBudget.toLocaleString()}
                                        </span>
                                    </div>

                                    <Separator />

                                    {/* PAID */}
                                    <div className="flex justify-between text-green-700">
                                        <span>Paid</span>
                                        <span>
                                            {currency} {financials.paid.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* DUE */}
                                    <div className="flex justify-between text-red-700 font-bold bg-red-50 p-2 rounded-md">
                                        <span>Due Amount</span>
                                        <span>
                                            {currency} {financials.due.toLocaleString()}
                                        </span>
                                    </div>

                                </CardContent>

                            </Card>


                        </div>

                        {/* RIGHT COLUMN - MAIN PACKAGE */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                                    <CardTitle className="text-sm font-bold text-slate-700">
                                        Event Day Itinerary & Packages
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-4 space-y-6">
                                    {event.days?.map((day, index) => {
                                        const pkg =
                                            day.type === "package" && day.packageId
                                                ? packagesList.find(p => p.id === day.packageId)
                                                : null

                                        return (
                                            <div
                                                key={index}
                                                className="border rounded-lg p-4 bg-white space-y-3"
                                            >
                                                {/* DAY HEADER */}
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800">
                                                            Day {index + 1}
                                                        </h4>
                                                        <p className="text-xs text-slate-500">
                                                            {day.date
                                                                ? format(safeDate(day.date), "PPP")
                                                                : "Date not set"}
                                                        </p>
                                                    </div>

                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            day.type === "package"
                                                                ? "border-blue-300 text-blue-700"
                                                                : "border-amber-300 text-amber-700"
                                                        }
                                                    >
                                                        {day.type === "package" ? "Package" : "Custom Plan"}
                                                    </Badge>
                                                </div>

                                                {/* PACKAGE DETAILS */}
                                                {day.type === "package" && pkg && (
                                                    <div className="bg-blue-50/40 border border-blue-100 rounded-md p-3 space-y-2">
                                                        <div className="flex justify-between text-sm font-medium text-slate-700">
                                                            <span>{pkg.name}</span>
                                                            <span>
                                                                {currency} {Number(pkg.price).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        {Array.isArray(pkg.featuresList) && pkg.featuresList.length > 0 && (
                                                            <ul className="mt-2 space-y-1 text-xs text-slate-600">
                                                                {pkg.featuresList.map((f, i) => (
                                                                    <li key={i} className="flex items-center gap-2">
                                                                        <Check className="w-3 h-3 text-green-500" />
                                                                        {f}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}

                                                    </div>
                                                )}

                                                {/* CUSTOM ITEMS */}
                                                {day.type === "custom" && (
                                                    <div className="bg-amber-50/40 border border-amber-100 rounded-md p-3 space-y-2">
                                                        {day.customItems?.length ? (
                                                            <div className="space-y-2">
                                                                {day.customItems.map((item, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex justify-between text-sm text-slate-700"
                                                                    >
                                                                        <span>
                                                                            {item.name} × {item.quantity}
                                                                        </span>
                                                                        <span>
                                                                            {currency}{" "}
                                                                            {(item.price * item.quantity).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic">
                                                                No custom items added for this day.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* DAY TOTAL */}
                                                <div className="flex justify-between pt-2 border-t text-sm font-semibold">
                                                    <span>Day {index + 1} Total</span>
                                                    <span>
                                                        {currency} {(day.cost || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* EMPTY STATE */}
                                    {(!event.days || event.days.length === 0) && (
                                        <p className="text-sm text-slate-400 italic text-center">
                                            No day configuration available.
                                        </p>
                                    )}

                                    {/* ADDITIONAL SERVICES (FROM ADDITIONALS TAB) */}
                                    {event.additionalServices && event.additionalServices.length > 0 && (
                                        <div className="border-t pt-6 space-y-4">
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <Plus className="w-4 h-4 text-blue-600" />
                                                Additional Services & Charges
                                            </h4>

                                            <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                                                {event.additionalServices.map((svc) => (
                                                    <div
                                                        key={svc.id}
                                                        className="flex justify-between text-sm text-slate-700"
                                                    >
                                                        <span>
                                                            {svc.name} × {svc.quantity}
                                                        </span>
                                                        <span className="font-medium">
                                                            {currency} {svc.total.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}

                                                <Separator />

                                                <div className="flex justify-between text-sm font-bold text-slate-900">
                                                    <span>Total Additional Services & Charges</span>
                                                    <span>
                                                        {currency} {financials.servicesCost.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* [!code highlight] NEW: Additional Notes Card */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 flex flex-row justify-between items-center">
                                    <CardTitle className="text-sm font-bold text-slate-700">Additional Notes</CardTitle>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setActiveTab('package_edit')}>
                                        <Pencil className="h-3 w-3 text-slate-500" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {event.notes ? (
                                        <p className="text-sm text-slate-600 whitespace-pre-line">{event.notes}</p>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">No additional notes added.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>


                </TabsContent>



                {/* --- 2. PACKAGE & NOTES TAB (EDITABLE) --- */}
                <TabsContent value="package_edit">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                            <div>
                                <CardTitle>Edit Package & Configuration</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Modify days, packages, custom items and notes.</p>
                            </div>
                            <Button className="bg-[#1C4D8D]" onClick={savePackageChanges} disabled={saving || isLocked}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isLocked ? "Locked" : "Update Plan"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">

                            {/* [!code ++] LOCKED STATE BANNER */}
                            {isLocked && (
                                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3 text-amber-800">
                                    <Lock className="h-5 w-5 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-sm">Quotation Approved</h4>
                                        <p className="text-xs mt-1 text-amber-700">
                                            This event is locked because the customer has approved the quotation.
                                            To make changes, go to the <b>Overview</b> tab and click <b>"Reset Approval"</b>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* SCHEDULE & PRICING */}
                            <div className={cn("space-y-4", isLocked && "opacity-60 pointer-events-none")}>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Packages & Days</h3>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs">Days</Label>
                                        <Input
                                            type="number" min="1" max="7"
                                            className="w-14 h-7 text-center bg-slate-50 text-xs"
                                            value={event.dayCount}
                                            disabled={isLocked}
                                            onChange={e => handleDayCountChange(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <Tabs defaultValue="day-0" className="w-full">
                                    <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100">
                                        {event.days?.map((_: EventDayConfig, i: number) => (
                                            <TabsTrigger key={i} value={`day-${i}`} className="px-4 py-1.5 text-xs">Day {i + 1}</TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {event.days?.map((day: EventDayConfig, i: number) => (
                                        <TabsContent key={i} value={`day-${i}`} className="border rounded-md p-4 mt-2 space-y-4 bg-white">
                                            {/* Date Picker */}
                                            <div className="space-y-1">
                                                <div className="border rounded-md p-2 bg-slate-50 flex items-center justify-between">
                                                    <Label className="text-xs text-slate-500 ml-2">Date</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild disabled={isLocked}>
                                                            <Button variant="ghost" className="h-6 text-sm font-normal">
                                                                {day.date ? format(safeDate(day.date), "PPP") : <span>Pick a date</span>}
                                                                <CalendarIcon className="ml-2 h-3 w-3 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={safeDate(day.date)}
                                                                onSelect={(d) => d && updateDayConfig(i, { date: d })}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>

                                            <Tabs defaultValue={day.type} onValueChange={(v: any) => updateDayConfig(i, { type: v })} className="w-full">
                                                <TabsList className="w-full grid grid-cols-2 h-8">
                                                    <TabsTrigger value="package" className="text-xs" disabled={isLocked}>Package</TabsTrigger>
                                                    <TabsTrigger value="custom" className="text-xs" disabled={isLocked}>Custom Plan</TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="package" className="pt-2 space-y-3">
                                                    <Select value={day.packageId} onValueChange={(v) => updateDayConfig(i, { packageId: v })} disabled={isLocked}>
                                                        <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {packagesList.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    {p.name} - {currency} {p.price.toLocaleString()}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {/* Package Features Display */}
                                                    {day.packageId && (() => {
                                                        const pkg = packagesList.find(p => p.id === day.packageId);
                                                        if (!pkg) return null;
                                                        return (
                                                            <div className="border rounded-md p-3 bg-white space-y-2 text-sm shadow-sm">
                                                                <div className="flex justify-between font-bold text-slate-800 pb-2 border-b mb-2">
                                                                    <span>Price</span>
                                                                    <span>{currency} {Number(pkg.price).toLocaleString()}</span>
                                                                </div>

                                                                {pkg.featuresList && pkg.featuresList.length > 0 ? (
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
                                                    <div className="space-y-2">
                                                        {day.customItems?.map((item: CustomItem, itemIdx: number) => (
                                                            <div key={itemIdx} className="grid grid-cols-12 gap-2 items-center">
                                                                <div className="col-span-5">
                                                                    <Input
                                                                        placeholder="Item" className="h-8 text-xs"
                                                                        value={item.name}
                                                                        disabled={isLocked}
                                                                        onChange={(e) => updateCustomItem(i, itemIdx, 'name', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <Input
                                                                        type="number" placeholder="Qty" className="h-8 text-xs text-center"
                                                                        value={item.quantity}
                                                                        disabled={isLocked}
                                                                        onChange={(e) => updateCustomItem(i, itemIdx, 'quantity', Number(e.target.value))}
                                                                    />
                                                                </div>
                                                                <div className="col-span-4">
                                                                    <Input
                                                                        type="number" placeholder="Price" className="h-8 text-xs text-right"
                                                                        value={item.price}
                                                                        disabled={isLocked}
                                                                        onChange={(e) => updateCustomItem(i, itemIdx, 'price', Number(e.target.value))}
                                                                    />
                                                                </div>
                                                                <div className="col-span-1 flex justify-center">
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeCustomItem(i, itemIdx)} disabled={isLocked}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Add Parameter via Dropdown */}
                                                        <div className="flex gap-2">
                                                            <Select disabled={isLocked} onValueChange={(val) => {
                                                                if (val === 'custom_new') {
                                                                    addCustomItem(i);
                                                                } else {
                                                                    const param = configParams.find(p => p.name === val);
                                                                    addCustomItem(i, param);
                                                                }
                                                            }}>
                                                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-dashed w-full text-left justify-start px-3 text-slate-500 hover:text-slate-800">
                                                                    <span className="flex items-center"><Plus className="h-3 w-3 mr-2" /> Add Parameter</span>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {configParams.map((p, idx) => (
                                                                        <SelectItem key={idx} value={p.name}>{p.name} {p.unit ? `(${p.unit})` : ''}</SelectItem>
                                                                    ))}
                                                                    <Separator className="my-1" />
                                                                    <SelectItem value="custom_new">Other (Custom)...</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded text-xs text-slate-700 flex justify-between px-3 border">
                                                        <span>Total Custom Cost:</span>
                                                        <span className="font-bold">{currency} {(day.cost || 0).toLocaleString()}</span>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </TabsContent>
                                    ))}
                                </Tabs>

                                {/* Budget Calculator */}
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3 border">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Total Budget (Days)</span>
                                        <span className="font-semibold">{currency} {financials.baseCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Additional Services</span>
                                        <span className="font-semibold">+ {currency} {financials.servicesCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Discount</span>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={event.discountType}
                                                disabled={isLocked}
                                                onValueChange={(v: any) => setEvent({ ...event, discountType: v })}
                                            >
                                                <SelectTrigger className="h-8 w-[70px] text-xs bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fixed">{currency}</SelectItem>
                                                    <SelectItem value="percentage">%</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                disabled={isLocked}
                                                className="h-8 w-24 text-right bg-white text-sm"
                                                placeholder="0"
                                                value={event.discount || ""}
                                                onChange={e => setEvent({ ...event, discount: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 px-1">
                                        <span></span>
                                        <span>- {currency} {financials.discountAmount.toLocaleString()}</span>
                                    </div>
                                    <Separator className="bg-slate-300" />
                                    <div className="flex justify-between text-base font-bold text-[#1C4D8D]">
                                        <span>Final Budget</span>
                                        <span>{currency} {financials.finalBudget.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn("space-y-2", isLocked && "opacity-60 pointer-events-none")}>
                                <Label>Additional Notes</Label>
                                <Textarea
                                    placeholder="Specific requirements..."
                                    value={event.notes}
                                    disabled={isLocked}
                                    onChange={e => setEvent({ ...event, notes: e.target.value })}
                                    className="bg-slate-50 min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 3. PAYMENTS TAB (REFINED) --- */}
                <TabsContent value="payments">
                    {/* FINANCIAL SUMMARY BAR */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-blue-600 uppercase">Total Event Budget</p><p className="text-2xl font-bold text-blue-900">{currency} {financials.finalBudget.toLocaleString()}</p></div><Wallet className="h-8 w-8 text-blue-200" /></CardContent></Card>
                        <Card className="bg-green-50 border-green-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-green-600 uppercase">Total Paid</p><p className="text-2xl font-bold text-green-900">{currency} {financials.paid.toLocaleString()}</p></div><CheckCircle className="h-8 w-8 text-green-200" /></CardContent></Card>
                        <Card className="bg-red-50 border-red-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-red-600 uppercase">Balance Due</p><p className="text-2xl font-bold text-red-900">{currency} {financials.due.toLocaleString()}</p></div><DollarSign className="h-8 w-8 text-red-200" /></CardContent></Card>
                    </div>
                    {/* INCOME ONLY TABLE */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Incoming Payments</CardTitle><Button size="sm" onClick={() => { setTransactionType('income'); setEditingTransaction(null); setIsTransactionOpen(true); }} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" /> Add Payment</Button></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {event.transactions?.filter(t => t.type === 'income').map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 border rounded bg-white text-sm hover:bg-slate-50 group">
                                        <div className="flex items-center gap-3"><div className="p-2 rounded-full bg-green-100 text-green-600"><DollarSign className="w-4 h-4" /></div><div><p className="font-bold text-green-700">+ {currency} {t.amount.toLocaleString()}</p><p className="text-xs text-slate-500">{format(safeDate(t.date), 'PPP')} • {t.method}</p></div></div>
                                        <div className="flex items-center gap-4">{t.note && <span className="text-xs text-slate-400 italic max-w-[200px] truncate hidden md:block">{t.note}</span>}<div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingTransaction(t); setTransactionType('income'); setIsTransactionOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeArrayItem('transactions', t.id)}><Trash2 className="w-4 h-4" /></Button></div></div>
                                    </div>
                                ))}
                                {(!event.transactions?.some(t => t.type === 'income')) && <p className="text-center py-8 text-slate-400 italic">No payments recorded.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 4. EXPENSES TAB (REFINED) --- */}
                <TabsContent value="expenses">
                    {/* EXPENSE SUMMARY BAR */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-slate-50 border-slate-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-600 uppercase">Total Revenue</p><p className="text-2xl font-bold text-slate-900">{currency} {financials.finalBudget.toLocaleString()}</p></div><Wallet className="h-8 w-8 text-slate-200" /></CardContent></Card>
                        <Card className="bg-amber-50 border-amber-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-amber-600 uppercase">Utilized (Expenses)</p><p className="text-2xl font-bold text-amber-900">{currency} {financials.totalExpenses.toLocaleString()}</p></div><TrendingUp className="h-8 w-8 text-amber-200" /></CardContent></Card>
                        <Card className="bg-emerald-50 border-emerald-100 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-emerald-600 uppercase">Rest (Profit)</p><p className="text-2xl font-bold text-emerald-900">{currency} {financials.profit.toLocaleString()}</p></div><DollarSign className="h-8 w-8 text-emerald-200" /></CardContent></Card>
                    </div>
                    {/* EXPENSE ONLY TABLE */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Event Expenses</CardTitle><Button size="sm" onClick={() => { setTransactionType('expense'); setEditingTransaction(null); setIsTransactionOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {event.transactions?.filter(t => t.type === 'expense').map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 border rounded bg-white text-sm hover:bg-slate-50 group">
                                        <div className="flex items-center gap-3"><div className="p-2 rounded-full bg-red-100 text-red-600"><DollarSign className="w-4 h-4" /></div><div><p className="font-bold text-red-700">- {currency} {t.amount.toLocaleString()}</p><p className="text-xs text-slate-500">{format(safeDate(t.date), 'PPP')} • {t.method}</p></div></div>
                                        <div className="flex items-center gap-4">{t.note && <span className="text-xs text-slate-400 italic max-w-[200px] truncate hidden md:block">{t.note}</span>}<div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingTransaction(t); setTransactionType('expense'); setIsTransactionOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeArrayItem('transactions', t.id)}><Trash2 className="w-4 h-4" /></Button></div></div>
                                    </div>
                                ))}
                                {(!event.transactions?.some(t => t.type === 'expense')) && <p className="text-center py-8 text-slate-400 italic">No expenses recorded.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 5. RESOURCES TAB (ENHANCED) --- */}
                <TabsContent value="resources">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CREW SECTION */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex flex-col">
                                    <CardTitle className="text-base">Crew</CardTitle>
                                    <span className="text-xs text-slate-500">{event.assignedCrew?.length || 0} Assigned / {crewList.length} Available</span>
                                </div>
                                <SearchableSelect
                                    placeholder="Assign Crew..."
                                    options={crewList.map(c => ({
                                        id: c.id,
                                        label: c.displayName,
                                        disabled: event.assignedCrew?.includes(c.id)
                                    }))}
                                    onSelect={(val) => checkAndAssignResource(val, 'crew')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {event.assignedCrew?.map(id => {
                                    const crew = crewList.find(c => c.id === id);
                                    return (
                                        <div key={id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span className="text-sm">{crew?.displayName || "Unknown"}</span></div>
                                            {/* UNASSIGN BUTTON */}
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => unassignResource(id, 'crew')}><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                    )
                                })}
                                {(!event.assignedCrew?.length) && <p className="text-center py-6 text-slate-400 italic text-xs">No crew assigned.</p>}
                            </CardContent>
                        </Card>

                        {/* EQUIPMENT SECTION (Categorized) */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex flex-col">
                                    <CardTitle className="text-base">Equipment</CardTitle>
                                    <span className="text-xs text-slate-500">{event.assignedEquipment?.length || 0} Assigned / {equipmentList.length} Total</span>
                                </div>
                                <SearchableSelect
                                    placeholder="Assign Equipment..."
                                    grouped={true}
                                    options={equipmentList.map(e => ({
                                        id: e.id!,
                                        label: `${e.name} (${e.quantityAvailable} Avail)`,
                                        group: e.category,
                                        disabled: event.assignedEquipment?.includes(e.id!) || e.quantityAvailable < 1
                                    }))}
                                    onSelect={(val) => checkAndAssignResource(val, 'equipment')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {event.assignedEquipment?.map(id => {
                                    const eq = equipmentList.find(e => e.id === id);
                                    return (
                                        <div key={id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /><span className="text-sm">{eq?.name || "Unknown"}</span></div>
                                            {/* UNASSIGN BUTTON */}
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => unassignResource(id, 'equipment')}><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                    )
                                })}
                                {(!event.assignedEquipment?.length) && <p className="text-center py-6 text-slate-400 italic text-xs">No equipment assigned.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- 6. CONTACTS / LOCATIONS / ADDITIONALS TABS --- */}
                <TabsContent value="contacts">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Event Contacts</CardTitle>
                            <Button size="sm" onClick={() => { setEditingContact(null); setIsContactOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Note</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                                    <tbody>
                                        {event.contacts?.map((c) => (
                                            <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                                                <td className="px-4 py-3"><Badge variant="outline" className="bg-white">{c.role}</Badge></td>
                                                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                                                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{c.note}</td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingContact(c); setIsContactOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeArrayItem('contacts', c.id)}><Trash2 className="w-4 h-4" /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!event.contacts?.length) && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No contacts yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="locations">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Event Locations</CardTitle>
                            <Button size="sm" onClick={() => { setEditingLocation(null); setIsLocationOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Location</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {event.locations?.map(loc => (
                                    <div key={loc.id} className="flex items-start gap-4 p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors group">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-blue-600" /></div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">{loc.name}</h4>
                                            <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-4"><span>{format(safeDate(loc.date), 'PPP')}</span>{loc.time && <span>@ {loc.time}</span>}</div>
                                            {loc.mapUrl && <a href={loc.mapUrl} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 block">View on Map</a>}
                                            {loc.note && <p className="text-xs text-slate-500 mt-2 bg-slate-100 p-2 rounded">{loc.note}</p>}
                                        </div>
                                        <div className="flex flex-col gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingLocation(loc); setIsLocationOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeArrayItem('locations', loc.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                {(!event.locations?.length) && <p className="text-center py-8 text-slate-400 italic">No locations added yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ADDITIONALS (SERVICES) TAB --- */}
                <TabsContent value="additionals">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Additional Services</CardTitle>
                            <Button size="sm" onClick={openAddService}>
                                <Plus className="w-4 h-4 mr-2" /> Add Service
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-4 py-3">Service Name</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3 text-right">Unit Price ({currency})</th>
                                            <th className="px-4 py-3 text-right">Total ({currency})</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {event.additionalServices?.map((svc) => (
                                            <tr key={svc.id} className="border-b last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{svc.name}</td>
                                                <td className="px-4 py-3 text-center text-slate-600">{svc.quantity}</td>
                                                <td className="px-4 py-3 text-right text-slate-600">{svc.pricePerUnit.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">{svc.total.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEditService(svc)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeArrayItem('additionalServices', svc.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!event.additionalServices?.length) && (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No additional services added.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Service/Additional Modal */}
                    <Dialog open={isServiceOpen} onOpenChange={setIsServiceOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingService ? 'Edit Service' : 'Add Additional Service'}</DialogTitle>
                            </DialogHeader>
                            <form action={saveService} className="space-y-4">
                                {/* Service Selection Dropdown */}
                                <div className="space-y-2">
                                    <Label>Service Type</Label>
                                    <Select
                                        value={isCustomService ? "custom" : (serviceNameInput || "")}
                                        onValueChange={(val) => {
                                            if (val === "custom") {
                                                setIsCustomService(true);
                                                setServiceNameInput(""); // Clear input for custom typing
                                                setServicePriceInput(0);
                                            } else {
                                                setIsCustomService(false);
                                                const p = serviceParams.find(param => param.name === val);
                                                if (p) {
                                                    setServiceNameInput(p.name);
                                                    setServicePriceInput(p.defaultPrice || 0);
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Service..." /></SelectTrigger>
                                        <SelectContent>
                                            {serviceParams.map(p => (
                                                <SelectItem key={p.name} value={p.name}>{p.name} ({currency} {p.defaultPrice})</SelectItem>
                                            ))}
                                            <SelectItem value="custom" className="font-bold text-blue-600">Custom Service / Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Service Name Input (Read-only if Preset, Editable if Custom) */}
                                <div className="space-y-2">
                                    <Label>Service Name</Label>
                                    <Input
                                        name="name"
                                        value={serviceNameInput}
                                        onChange={(e) => setServiceNameInput(e.target.value)}
                                        placeholder="Service Name (e.g. Extra Drone Hour)"
                                        required
                                        readOnly={!isCustomService}
                                        className={!isCustomService ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input
                                            name="quantity"
                                            type="number"
                                            min="1"
                                            required
                                            defaultValue={editingService?.quantity || 1}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit Price ({currency})</Label>
                                        <Input
                                            name="price"
                                            type="number"
                                            min="0"
                                            required
                                            value={servicePriceInput}
                                            onChange={(e) => setServicePriceInput(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-[#1C4D8D]">
                                    {editingService ? 'Update Service' : 'Add Service'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="gallery">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
                        <div>
                            <CardTitle>Event Gallery</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                {event.galleryUrls?.length || 0} Photos Uploaded
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <label className={`cursor-pointer bg-[#1C4D8D] hover:bg-[#163b6b] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
                                Upload Photo
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".jpg, .jpeg, .png" 
                                    disabled={uploading} 
                                    onChange={handleGalleryUpload} 
                                    multiple={false}
                                />
                            </label>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {event.galleryUrls && event.galleryUrls.length > 0 ? (
                            <div className="columns-2 md:columns-4 gap-4 space-y-4">
                                {event.galleryUrls.map((url, idx) => (
                                    <div key={idx} className="relative group break-inside-avoid rounded-lg overflow-hidden shadow-sm border bg-slate-100">
                                        <img 
                                            src={url} 
                                            alt={`Gallery ${idx}`} 
                                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                                            onClick={() => setLightboxIndex(idx)}
                                        />
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                                            <Button 
                                                variant="destructive" 
                                                size="icon" 
                                                className="h-7 w-7 rounded-full shadow-md"
                                                onClick={(e) => { e.stopPropagation(); handleGalleryDelete(url); }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed rounded-lg bg-slate-50">
                                <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                                <p>No photos uploaded yet.</p>
                                <p className="text-xs">Upload images when the event is in progress.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            </Tabs>

            {lightboxIndex !== null && event.galleryUrls && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full" onClick={() => setLightboxIndex(null)}>
                    <X className="w-6 h-6"/>
                </Button>
                
                <img 
                    src={event.galleryUrls[lightboxIndex]} 
                    className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
                    alt="Lightbox View"
                />

                {/* Navigation Buttons */}
                {lightboxIndex > 0 && (
                    <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full" onClick={() => setLightboxIndex(i => i! - 1)}>
                        <ChevronLeft className="w-8 h-8" />
                    </Button>
                )}
                {lightboxIndex < (event.galleryUrls.length - 1) && (
                    <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full" onClick={() => setLightboxIndex(i => i! + 1)}>
                        <ChevronRight className="w-8 h-8" />
                    </Button>
                )}
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                    {lightboxIndex + 1} / {event.galleryUrls.length}
                </div>
            </div>
        )}

            {/* --- GLOBAL DIALOGS --- */}
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle></DialogHeader>
                    <form action={saveContact} className="space-y-4">
                        <Input name="name" placeholder="Full Name" required defaultValue={editingContact?.name} />
                        <Input name="role" placeholder="Role (e.g. Band, Makeup)" required defaultValue={editingContact?.role} />
                        <Input name="phone" placeholder="Phone Number" defaultValue={editingContact?.phone} />
                        <Textarea name="note" placeholder="Additional Notes" defaultValue={editingContact?.note} />
                        <Button type="submit" className="w-full">{editingContact ? 'Update' : 'Add'}</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle></DialogHeader>
                    <form action={saveLocation} className="space-y-4">
                        <Input name="name" placeholder="Location Name" required defaultValue={editingLocation?.name} />
                        <Input name="mapUrl" placeholder="Google Maps Link" defaultValue={editingLocation?.mapUrl} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input name="date" type="date" required defaultValue={editingLocation ? format(safeDate(editingLocation.date), 'yyyy-MM-dd') : ''} />
                            <Input name="time" type="time" defaultValue={editingLocation?.time} />
                        </div>
                        <Textarea name="note" placeholder="Instructions..." defaultValue={editingLocation?.note} />
                        <Button type="submit" className="w-full">{editingLocation ? 'Update' : 'Add'}</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingTransaction ? 'Edit Transaction' : `Add ${transactionType === 'income' ? 'Payment' : 'Expense'}`}</DialogTitle></DialogHeader>
                    <form action={saveTransaction} className="space-y-4">
                        <Input name="amount" type="number" placeholder="Amount" required defaultValue={editingTransaction?.amount} />
                        <Input name="date" type="date" required defaultValue={editingTransaction ? format(safeDate(editingTransaction.date), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]} />
                        <Select name="method" defaultValue={editingTransaction?.method || "Cash"}>
                            <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                            <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}<SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem></SelectContent>
                        </Select>
                        <Textarea name="note" placeholder="Description / Note..." defaultValue={editingTransaction?.note} />
                        <Button type="submit" className={`w-full ${transactionType === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{editingTransaction ? 'Update' : 'Record'}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}