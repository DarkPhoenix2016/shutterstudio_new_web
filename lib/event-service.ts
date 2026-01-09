import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, orderBy, Timestamp } from "firebase/firestore";

// --- TYPES ---

export interface EventDayConfig {
  date: Date;
  type: 'package' | 'custom';
  packageId?: string; // If package
  customItems?: { name: string; value: string | number }[]; // If custom
  cost: number;
}

export interface EventData {
  id?: string;
  // Customer
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  
  // Meta
  eventName: string;
  eventType: string;
  status: string;
  inquiryDate: any;
  
  // Schedule & Pricing
  dayCount: number;
  days: EventDayConfig[]; // Array of configs per day
  
  // Financials
  totalBudget: number;
  discount: number;
  finalBudget: number;
  advancePaid: number;
  
  // Resources
  assignedCrew: string[];
  assignedEquipment: string[];
  
  notes?: string;
  createdAt?: any;
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

// 2. Fetch Packages for Dropdown
export const fetchPackagesList = async (studioId: string) => {
  try {
    // A. Get List of IDs
    const listRef = doc(db, "Studios", studioId, "Packages", "package_list");
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) return [];
    
    const idList: string[] = listSnap.data().LIST || [];
    if (idList.length === 0) return [];

    // B. Fetch Details for each ID
    const packages = await Promise.all(idList.map(async (pkgId) => {
        const pkgSnap = await getDoc(doc(db, "Studios", studioId, "Packages", pkgId));
        return pkgSnap.exists() ? { id: pkgSnap.id, ...pkgSnap.data() } : null;
    }));
    
    return packages.filter(p => p !== null);
  } catch (e) {
    console.error("Error fetching packages", e);
    return [];
  }
};

// 3. Create Event
export const createEvent = async (studioId: string, event: EventData) => {
  try {
    const ref = collection(db, "Studios", studioId, "Events");
    await addDoc(ref, {
      ...event,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

// 4. Fetch Events (unchanged logic, just ensuring it matches new types)
export const fetchEvents = async (studioId: string) => {
    const ref = collection(db, "Studios", studioId, "Events");
    const q = query(ref, orderBy("inquiryDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return { 
            id: d.id, 
            ...data, 
            inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate 
        } as EventData;
    });
};