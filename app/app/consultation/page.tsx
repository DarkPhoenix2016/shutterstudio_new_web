import { db } from "@/lib/firebase";
import { 
  collection, doc, getDoc, setDoc, updateDoc, 
  serverTimestamp, query, where, getDocs 
} from "firebase/firestore";

// --- TYPES ---

export interface ConsultationData {
  id?: string;
  studioId: string;
  status: "draft" | "completed" | "converted";
  
  client: {
    name: string;
    mobile: string;
    email?: string;
  };

  requirements: {
    eventType: string;
    date?: any; // Timestamp or Date
    guestCount?: number;
    budgetRange: [number, number]; // [min, max]
    locations: string[]; // City names
    styleTags: string[];
    notes?: string;
    deliverables: {
        photo: boolean;
        video: boolean;
        album: boolean;
        drone: boolean;
    };
  };

  inspiration: {
    matchedEventIds: string[];
    selectedEventIds: string[]; // IDs of events the client liked
  };

  package: {
    selectedPackageId?: string; // ID from Packages collection or 'custom'
    customItems: { name: string; price: number; qty: number }[];
    totalEstimate: number;
  };

  createdAt?: any;
  updatedAt?: any;
}

// --- FUNCTIONS ---

// Save or Update a Consultation Draft
export const saveConsultation = async (studioId: string, data: ConsultationData) => {
  try {
    const colRef = collection(db, "Studios", studioId, "Consultations");
    // If ID exists, update; otherwise create new ref
    const docRef = data.id ? doc(colRef, data.id) : doc(colRef); 
    
    const payload = {
      ...data,
      id: docRef.id,
      studioId,
      updatedAt: serverTimestamp(),
      createdAt: data.createdAt || serverTimestamp()
    };

    // Use setDoc with merge to handle both create and update scenarios seamlessly
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error("Error saving consultation:", error);
    throw error;
  }
};

// Fetch a specific consultation
export const getConsultation = async (studioId: string, consultationId: string) => {
  try {
    const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        // Convert Timestamps to Dates if necessary
        if (data.requirements?.date?.toDate) {
            data.requirements.date = data.requirements.date.toDate();
        }
        return data as ConsultationData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return null;
  }
};

// Mark consultation as converted
export const convertConsultationStatus = async (studioId: string, consultationId: string) => {
    try {
        await updateDoc(doc(db, "Studios", studioId, "Consultations", consultationId), {
            status: "converted",
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error converting status:", error);
    }
};