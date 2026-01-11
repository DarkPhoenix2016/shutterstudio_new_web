import { db } from "@/lib/firebase";
import { 
  collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, 
  serverTimestamp, query, orderBy, Timestamp, runTransaction, where, arrayRemove 
} from "firebase/firestore";
import { startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval } from "date-fns";

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
  parameters?: Record<string, string | number | boolean>; 
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
  role: string;
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
  method?: string; 
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
  displayId?: string; 
  
  // Customer Info
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  couplePhotoUrl?: string; 
  galleryUrls?: string[]; 
  tags?: string[];
  
  // Meta
  eventName: string;
  eventType: string; 
  status: string;
  inquiryDate: any;
  
  // Scheduling
  dayCount: number;
  days: EventDayConfig[]; 
  
  // Financials
  totalBudget: number; 
  servicesTotal?: number; 
  discountType: 'fixed' | 'percentage';
  discount: number;
  finalBudget: number; 
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

// 2.1 Fetch Package Config Parameters
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

// 5. Delete Event (With Resource Cleanup)
export const deleteEvent = async (studioId: string, eventId: string) => {
  try {
    const eventRef = doc(db, "Studios", studioId, "Events", eventId);
    
    // 1. Fetch event first to find assignments
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return;

    const data = eventSnap.data();
    const assignedCrew: string[] = data.assignedCrew || [];
    const assignedEquipment: string[] = data.assignedEquipment || [];
    const days: any[] = data.days || [];

    // 2. Prepare Cleanup Promises
    const cleanupPromises = [];

    // Cleanup Users (Crew)
    if (assignedCrew.length > 0 && days.length > 0) {
        for (const uid of assignedCrew) {
            const userRef = doc(db, "Users", uid);
            // Remove eventID from every day in the schedule
            for (const day of days) {
                const dateKey = day.date instanceof Timestamp 
                    ? day.date.toDate().toISOString().split('T')[0] 
                    : new Date(day.date).toISOString().split('T')[0];
                
                cleanupPromises.push(
                    updateDoc(userRef, {
                        [`schedules.${dateKey}`]: arrayRemove(eventId)
                    }).catch(e => console.warn(`Failed to cleanup user ${uid} schedule`, e))
                );
            }
        }
    }

    // Cleanup Inventory (Equipment)
    if (assignedEquipment.length > 0 && days.length > 0) {
        for (const eqId of assignedEquipment) {
            const itemRef = doc(db, "Studios", studioId, "Inventory", eqId);
            for (const day of days) {
                const dateKey = day.date instanceof Timestamp 
                    ? day.date.toDate().toISOString().split('T')[0] 
                    : new Date(day.date).toISOString().split('T')[0];

                cleanupPromises.push(
                    updateDoc(itemRef, {
                        [`schedules.${dateKey}`]: arrayRemove(eventId)
                    }).catch(e => console.warn(`Failed to cleanup inventory ${eqId} schedule`, e))
                );
            }
        }
    }

    // Wait for cleanup (best effort)
    await Promise.all(cleanupPromises);

    // 3. Delete the actual event document
    await deleteDoc(eventRef);

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

// 7. Fetch Single Event by ID
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
          : [],
        locations: Array.isArray(data.locations)
          ? data.locations.map((loc: any) => ({ ...loc, date: loc.date instanceof Timestamp ? loc.date.toDate() : loc.date }))
          : [],
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

// 8. Check Resource Availability (Updated for Schedule Limits)
export const checkResourceAvailability = async (
    studioId: string, 
    date: Date, 
    resourceId: string, 
    type: 'crew' | 'equipment',
    eventId?: string // The ID of the current event (to exclude self)
): Promise<{ available: boolean; message?: string }> => {
    try {
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // 1. Get Limits from Studio Config
        const studioSnap = await getDoc(doc(db, "Studios", studioId));
        const studioData = studioSnap.exists() ? studioSnap.data() : {};
        
        // Default to 4 if not set in DB
        const limit = type === 'crew' 
            ? (studioData.max_event_perday_peruser || 4) 
            : (studioData.time_slots_perday || 4);

        // 2. Fetch Resource Document (User or Inventory)
        let resourceRef;
        if (type === 'crew') {
            resourceRef = doc(db, "Users", resourceId);
        } else {
            resourceRef = doc(db, "Studios", studioId, "Inventory", resourceId);
        }

        const resSnap = await getDoc(resourceRef);
        if (!resSnap.exists()) return { available: false, message: "Resource not found" };

        const data = resSnap.data();
        
        // 3. Check Schedule Map
        // Expected structure: schedules: { "2025-10-20": ["evtId1", "evtId2"] }
        const schedules = data.schedules || {};
        const dayEvents: string[] = schedules[dateKey] || [];

        // Filter out current event ID if we are editing/checking existing assignment
        const activeCount = dayEvents.filter((id) => id !== eventId).length;

        if (activeCount >= limit) {
            return { 
                available: false, 
                message: `${type === 'crew' ? 'Crew Member' : 'Item'} is fully booked on this day (Limit: ${limit}).` 
            };
        }

        return { available: true };
    } catch (e) {
        console.error("Error checking availability:", e);
        // Fail safe: if error, assume not available to prevent double booking bugs, or return error message
        return { available: false, message: "Error checking schedule availability." };
    }
};

export const fetchEventsForDateRange = async (studioId: string, centerDate: Date) => {
    try {
        // Calculate range: Start of Previous Month to End of Next Month
        const startDate = startOfMonth(subMonths(centerDate, 1));
        const endDate = endOfMonth(addMonths(centerDate, 1));

        // 1. Fetch All Events (Optimized: In a real production app with thousands of events, 
        // you would add a root-level 'searchDate' field to Firestore to enable .where('searchDate', '>=', startDate) querying)
        const allEvents = await fetchEvents(studioId);

        // 2. Filter in Memory
        const filtered = allEvents.filter(event => {
            if (!event.days || event.days.length === 0) return false;
            
            // Check if ANY day of the event falls within our 3-month window
            return event.days.some(day => {
                const d = day.date instanceof Timestamp ? day.date.toDate() : new Date(day.date);
                return isWithinInterval(d, { start: startDate, end: endDate });
            });
        });

        return filtered;
    } catch (e) {
        console.error("Error fetching events range:", e);
        return [];
    }
};