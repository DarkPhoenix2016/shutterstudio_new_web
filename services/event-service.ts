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

export interface EventDayConfig {
  date: Date;
  type: 'package' | 'custom';
  packageId?: string; 
  customItems?: CustomItem[]; 
  cost: number;
}

export interface EventData {
  id?: string;
  displayId?: string; // e.g. OMG00001
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

// 2. Fetch Packages
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

// 3. Create Event with Custom ID Transaction
export const createEvent = async (studioId: string, event: EventData) => {
  try {
    await runTransaction(db, async (transaction) => {
      // A. Reference to Studio Document (for Invoice Counters)
      const studioRef = doc(db, "Studios", studioId);
      const studioDoc = await transaction.get(studioRef);
      
      if (!studioDoc.exists()) throw "Studio not found!";

      const data = studioDoc.data();
      const invoiceText = data.invoice_text || "EVT";
      const nextStr = data.invoice_next || "00001";
      const currentInt = data.invoice_current || 0;

      // B. Generate New ID
      const customId = `${invoiceText}${nextStr}`; // e.g., OMG00002

      // C. Calculate Next Sequence
      const nextInt = parseInt(nextStr, 10);
      const newNextStr = String(nextInt + 1).padStart(5, '0');

      // D. Create Event Reference (Using Custom ID as Doc ID or Auto ID? Using Custom ID is cleaner for URLs)
      // Let's use Auto ID for Firestore Doc ID to prevent collisions if configs reset, but store customId as field.
      const newEventRef = doc(collection(db, "Studios", studioId, "Events"));

      // E. Write Event
      transaction.set(newEventRef, {
        ...event,
        displayId: customId, // Store the readable ID
        createdAt: serverTimestamp()
      });

      // F. Update Studio Counters
      transaction.update(studioRef, {
        invoice_last: currentInt, // Move current to last
        invoice_current: nextInt, // Set new current
        invoice_number: nextStr,  // Set string representation
        invoice_next: newNextStr  // Prepare for next
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
    const q = query(ref, orderBy("createdAt", "desc")); // Changed to createdAt for consistency
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
        const data = d.data();
        return { 
            id: d.id, 
            ...data, 
            inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
            dates: Array.isArray(data.dates) 
              ? data.dates.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date })) 
              : [],
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