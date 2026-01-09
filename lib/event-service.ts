import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, orderBy, where, Timestamp } from "firebase/firestore";

// --- TYPES ---

export interface EventDay {
  date: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: string; // e.g., "Ceremony", "Reception"
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
  eventType: string; // Wedding, Preshoot, etc.
  status: 'Inquiry' | 'Quoted' | 'Scheduled' | 'Shooting' | 'Editing' | 'Completed' | 'Cancelled';
  inquiryDate: any;
  
  // Scheduling
  dates: EventDay[]; // Multi-day support

  // Financials & Package
  packageId: string; // 'custom' or ID from catalogue
  packageName?: string;
  budget: number;
  advancePaid: number;
  
  // Resources (IDs)
  assignedCrew: string[];
  assignedEquipment: string[];
  
  notes?: string;
  createdAt?: any;
}

// --- FUNCTIONS ---

export const fetchEvents = async (studioId: string) => {
  try {
    const ref = collection(db, "Studios", studioId, "Events");
    const q = query(ref, orderBy("inquiryDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        // Convert Firestore Timestamps to JS Dates
        inquiryDate: data.inquiryDate instanceof Timestamp ? data.inquiryDate.toDate() : data.inquiryDate,
        dates: Array.isArray(data.dates) 
          ? data.dates.map((day: any) => ({ ...day, date: day.date instanceof Timestamp ? day.date.toDate() : day.date })) 
          : []
      } as EventData;
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
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
          : []
      } as EventData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
};

export const createEvent = async (studioId: string, event: EventData) => {
  try {
    const ref = collection(db, "Studios", studioId, "Events");
    const docRef = await addDoc(ref, {
      ...event,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};