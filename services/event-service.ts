import { db } from "@/lib/firebase";
import { 
  collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, 
  serverTimestamp, query, orderBy, Timestamp, runTransaction, where 
} from "firebase/firestore";

// --- TYPES ---

export interface CustomItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

export interface PackageData {
  id: string;
  name: string;
  price: number;
  disabled: boolean;
  description?: string;
  // parameters is a map in Firestore (e.g., { "Drone Cameras": 1 })
  parameters?: Record<string, string | number | boolean>; 
  // We generate this list for the UI
  featuresList?: string[]; 
}

export interface PackageConfigParameter {
  name: string;
  unit?: string;
  defaultPrice?: number;
}

// --- SUB-DATA TYPES (Tabs) ---

export interface EventContact {
  id: string;
  name: string;
  role: string; // e.g. "Band", "Makeup Artist"
  phone: string;
  note?: string;
}

export interface AdditionalService {
  id: string;
  name: string;
  type: 'parameter' | 'custom';
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface EventLocation {
  id: string;
  name: string;
  mapUrl?: string;
  date: Date;
  time?: string;
  note?: string;
}

export interface TransactionRecord {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category?: string;
  method?: string; // "Cash", "Bank Transfer"
  amount: number;
  note?: string;
}

export interface EventApproval {
  customer_confirmed: boolean;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;
  approved_date?: any;
}

export interface EventDayConfig {
  date: Date;
  type: 'package' | 'custom';
  packageId?: string; 
  customItems?: CustomItem[]; 
  cost: number;
}

// --- MAIN EVENT DATA TYPE ---

export interface EventData {
  id?: string;
  displayId?: string; // e.g. OMG00001
  
  // Customer Info
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  couplePhotoUrl?: string; // Cover
  galleryUrls?: string[]; // Gallery
  
  // Meta
  eventName: string;
  eventType: string; 
  status: string;
  inquiryDate: any;
  
  // Scheduling
  dayCount: number;
  days: EventDayConfig[]; 
  
  // Financials
  totalBudget: number; // Base Package Cost
  servicesTotal?: number; // Additional Services Cost
  discountType: 'fixed' | 'percentage';
  discount: number;
  finalBudget: number; // (Base + Services) - Discount
  advancePaid: number;
  
  // Resources
  assignedCrew: string[];
  assignedEquipment: string[];
  
  // Tab Data
  approval?: EventApproval;
  contacts?: EventContact[];
  additionalServices?: AdditionalService[];
  locations?: EventLocation[];
  transactions?: TransactionRecord[]; 

  notes?: string;
  createdAt?: any;
}

// --- FUNCTIONS ---

// 1. Fetch Dynamic Settings Lists
export const fetchStudioSettingsList = async (studioId: string, settingType: 'EVENT_TYPES' | 'EVENT_STATUS' | 'payment_methods') => {
  try {
    // Payment methods might be on the main studio doc based on some patterns
    if (settingType === 'payment_methods') {
        const studioDoc = await getDoc(doc(db, "Studios", studioId));
        if (studioDoc.exists()) return studioDoc.data().payment_methods || ["Cash", "Bank Transfer"];
    }

    const ref = doc(db, "Studios", studioId, "Settings", settingType);
    const snap = await getDoc(ref);
    if (snap.exists() && Array.isArray(snap.data().LIST)) {
      return snap.data().LIST as string[];
    }
    return [];
  } catch (e) {
    console.error(`Error fetching ${settingType}`, e);
    return [];
  }
};

// 2. Fetch Packages List (with Map to Array conversion)
export const fetchPackagesList = async (studioId: string) => {
  try {
    const listRef = doc(db, "Studios", studioId, "Packages", "package_list");
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) return [];
    
    const idList: string[] = listSnap.data().LIST || [];
    if (idList.length === 0) return [];

    const packages = await Promise.all(idList.map(async (pkgId) => {
        const pkgSnap = await getDoc(doc(db, "Studios", studioId, "Packages", pkgId));
        if (!pkgSnap.exists()) return null;
        
        const data = pkgSnap.data();
        
        // Transform 'parameters' map (Firestore) -> 'featuresList' array (UI)
        const paramsMap = data.parameters || {};
        const featuresList: string[] = Object.entries(paramsMap).map(([key, value]) => {
            if (value === true) return key; 
            if (value === false) return null; 
            return `${key}: ${value}`; 
        }).filter((f): f is string => f !== null);

        return { 
            id: pkgSnap.id, 
            ...data,
            parameters: paramsMap,
            featuresList: featuresList, 
            description: data.description || ""
        } as PackageData;
    }));
    
    return packages.filter((p): p is PackageData => p !== null);
  } catch (e) {
    console.error("Error fetching packages", e);
    return [];
  }
};

// 2.1 Fetch Package Config Parameters (for Custom Plans)
export const fetchPackageConfig = async (studioId: string) => {
    try {
        const ref = doc(db, "Studios", studioId, "Packages", "CONFIG");
        const snap = await getDoc(ref);
        if (snap.exists() && Array.isArray(snap.data().parameters)) {
            return snap.data().parameters as PackageConfigParameter[];
        }
        return [];
    } catch (e) {
        console.error("Error fetching package config:", e);
        return [];
    }
};

// 3. Create Event (Transactional ID Generation)
export const createEvent = async (studioId: string, event: EventData) => {
  try {
    await runTransaction(db, async (transaction) => {
      const studioRef = doc(db, "Studios", studioId);
      const studioDoc = await transaction.get(studioRef);
      
      if (!studioDoc.exists()) throw "Studio not found!";

      const data = studioDoc.data();
      const invoiceText = data.invoice_text || "EVT";
      const nextStr = data.invoice_next || "00001";
      const currentInt = data.invoice_current || 0;

      // Generate ID: OMG00002
      const customId = `${invoiceText}${nextStr}`; 
      const nextInt = parseInt(nextStr, 10);
      const newNextStr = String(nextInt + 1).padStart(5, '0');

      const newEventRef = doc(collection(db, "Studios", studioId, "Events"));

      transaction.set(newEventRef, {
        ...event,
        displayId: customId, 
        createdAt: serverTimestamp()
      });

      transaction.update(studioRef, {
        invoice_last: currentInt, 
        invoice_current: nextInt, 
        invoice_number: nextStr,  
        invoice_next: newNextStr  
      });
    });
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

// 4. Update Event
export const updateEvent = async (studioId: string, eventId: string, updates: Partial<EventData>) => {
  try {
    const ref = doc(db, "Studios", studioId, "Events", eventId);
    await updateDoc(ref, updates);
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

// 5. Delete Event
export const deleteEvent = async (studioId: string, eventId: string) => {
  try {
    const ref = doc(db, "Studios", studioId, "Events", eventId);
    await deleteDoc(ref);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

// 6. Fetch All Events
export const fetchEvents = async (studioId: string) => {
    const ref = collection(db, "Studios", studioId, "Events");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
        const data = d.data();
        return { 
            id: d.id, 
            ...data, 
            inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
            days: Array.isArray(data.days)
              ? data.days.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date }))
              : []
        } as unknown as EventData;
    });
};

// 7. Fetch Single Event by ID (Deep Parsing for Dates)
export const fetchEventById = async (studioId: string, eventId: string) => {
  try {
    const ref = doc(db, "Studios", studioId, "Events", eventId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
        // Map Days
        days: Array.isArray(data.days)
          ? data.days.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date }))
          : [],
        // Map Locations
        locations: Array.isArray(data.locations)
          ? data.locations.map((loc: any) => ({ ...loc, date: loc.date instanceof Timestamp ? loc.date.toDate() : loc.date }))
          : [],
        // Map Transactions
        transactions: Array.isArray(data.transactions)
          ? data.transactions.map((t: any) => ({ ...t, date: t.date instanceof Timestamp ? t.date.toDate() : t.date }))
          : []
      } as unknown as EventData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
};

// 8. Check Resource Availability
export const checkResourceAvailability = async (
    studioId: string, 
    date: Date, 
    resourceId: string, 
    type: 'crew' | 'equipment'
): Promise<boolean> => {
    try {
        const ref = collection(db, "Studios", studioId, "Events");
        // We only care about active events that might use resources
        const q = query(ref, where("status", "in", ["Scheduled", "Shooting"])); 
        const snap = await getDocs(q);
        
        let isBusy = false;
        const targetDateStr = date.toDateString();

        for (const doc of snap.docs) {
            const evt = doc.data();
            
            // Check if this event has the target date in its schedule
            const hasDate = Array.isArray(evt.days) && evt.days.some((d: any) => {
                const dDate = d.date instanceof Timestamp ? d.date.toDate() : d.date;
                return dDate.toDateString() === targetDateStr;
            });

            if (hasDate) {
                if (type === 'crew' && Array.isArray(evt.assignedCrew) && evt.assignedCrew.includes(resourceId)) {
                    isBusy = true;
                    break;
                }
                if (type === 'equipment' && Array.isArray(evt.assignedEquipment) && evt.assignedEquipment.includes(resourceId)) {
                    isBusy = true;
                    break;
                }
            }
        }

        return !isBusy;
    } catch (e) {
        console.error("Error checking availability:", e);
        return true; // Fail open (allow assignment if check fails) or handle error
    }
};