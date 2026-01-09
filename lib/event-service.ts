import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, orderBy, Timestamp } from "firebase/firestore";

// --- TYPES ---

export interface CustomItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
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
  // Customer Info
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  couplePhotoUrl?: string;

  // Event Meta
  eventName: string;
  eventType: string; 
  status: string;
  inquiryDate: any;
  
  // Scheduling
  dayCount: number;
  days: EventDayConfig[]; 
  
  // Financials
  totalBudget: number;
  discountType: 'fixed' | 'percentage';
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

// 1. Fetch Dynamic Settings Lists (Event Types / Statuses)
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

// 2. Fetch Packages List for Dropdown
export const fetchPackagesList = async (studioId: string) => {
  try {
    const listRef = doc(db, "Studios", studioId, "Packages", "package_list");
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) return [];
    
    const idList: string[] = listSnap.data().LIST || [];
    if (idList.length === 0) return [];

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

// 4. Fetch All Events
export const fetchEvents = async (studioId: string) => {
    const ref = collection(db, "Studios", studioId, "Events");
    const q = query(ref, orderBy("inquiryDate", "desc"));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
        const data = d.data();
        
        // Convert Firestore Timestamps to JS Dates and cast to EventData
        return { 
            id: d.id, 
            ...data, 
            inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
            dates: Array.isArray(data.dates) 
              ? data.dates.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date })) 
              : [],
            // Map legacy 'dates' to new 'days' structure if needed, or handle mapping in UI
            days: Array.isArray(data.days)
              ? data.days.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date }))
              : []
        } as unknown as EventData;
    });
};

// 5. Fetch Single Event by ID
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
        dates: Array.isArray(data.dates) 
          ? data.dates.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date })) 
          : [],
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