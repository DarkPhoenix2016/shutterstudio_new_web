import { db } from "@/lib/firebase";
import { 
  collection, getDocs, doc, getDoc, addDoc, setDoc, deleteDoc, updateDoc, 
  serverTimestamp, query, orderBy, Timestamp, runTransaction 
} from "firebase/firestore";

// --- TYPES ---

export interface CustomItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

// [!code highlight] Updated Interface to match your Firestore Data
export interface PackageData {
  id: string;
  name: string;
  price: number;
  disabled: boolean;
  discounted: boolean;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  description?: string;
  // parameters is a map in Firestore (e.g., { "Drone Cameras": 1, "Preshoot": true })
  parameters?: Record<string, string | number | boolean>; 
  // We will generate this array for the UI
  featuresList?: string[]; 
}

export interface EventDayConfig {
  date: Date;
  type: 'package' | 'custom';
  packageId?: string; 
  customItems?: CustomItem[]; 
  cost: number;
}

export interface EventData {
  id?: string;
  displayId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  couplePhotoUrl?: string;
  eventName: string;
  eventType: string; 
  status: string;
  inquiryDate: any;
  dayCount: number;
  days: EventDayConfig[]; 
  totalBudget: number;
  discountType: 'fixed' | 'percentage';
  discount: number;
  finalBudget: number;
  advancePaid: number;
  assignedCrew: string[];
  assignedEquipment: string[];
  notes?: string;
  createdAt?: any;
}

// Interface for the Global Config (Studio/Settings/Packages/CONFIG)
export interface PackageConfigParameter {
  name: string;
  unit?: string;
  defaultPrice?: number;
}

// --- FUNCTIONS ---

// 1. Fetch Dynamic Settings Lists
export const fetchStudioSettingsList = async (studioId: string, settingType: 'EVENT_TYPES' | 'EVENT_STATUS') => {
  try {
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

// 2. Fetch Packages List
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
        
        // [!code highlight] Logic to transform 'parameters' map into a readable string array
        const paramsMap = data.parameters || {};
        const featuresList: string[] = Object.entries(paramsMap).map(([key, value]) => {
            if (value === true) return key; // e.g. "Preshoot"
            if (value === false) return null; // Skip false items
            return `${key}: ${value}`; // e.g. "Drone Cameras: 1"
        }).filter((f): f is string => f !== null);

        return { 
            id: pkgSnap.id, 
            ...data,
            parameters: paramsMap,
            featuresList: featuresList, // Use this property in your UI to display tags
            description: data.description || ""
        } as PackageData;
    }));
    
    return packages.filter((p): p is PackageData => p !== null);
  } catch (e) {
    console.error("Error fetching packages", e);
    return [];
  }
};

// 2.1 Fetch Package Configuration Parameters (For Custom Plans)
// This fetches from /Studios/{id}/Packages/CONFIG (if that's where you store available params)
export const fetchPackageConfig = async (studioId: string) => {
    try {
        const ref = doc(db, "Studios", studioId, "Packages", "CONFIG");
        const snap = await getDoc(ref);
        
        // Assuming the CONFIG doc has a 'parameters' array defining what CAN be added
        if (snap.exists() && Array.isArray(snap.data().parameters)) {
            return snap.data().parameters as PackageConfigParameter[];
        }
        return [];
    } catch (e) {
        console.error("Error fetching package config:", e);
        return [];
    }
};

// 3. Create Event with Custom ID Transaction
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
        days: Array.isArray(data.days)
          ? data.days.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date }))
          : []
      } as unknown as EventData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
};