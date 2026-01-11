import { db } from "@/lib/firebase";
import { 
  collection, doc, getDoc, setDoc, updateDoc, 
  serverTimestamp, query, where, getDocs, orderBy 
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

// 1. Save or Update a Consultation Draft
export const saveConsultation = async (studioId: string, data: ConsultationData) => {
  try {
    const colRef = collection(db, "Studios", studioId, "Consultations");
    // If ID exists, use it; otherwise create new doc ref
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

// 2. Fetch a specific consultation by ID
export const getConsultation = async (studioId: string, consultationId: string) => {
  try {
    const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        // Convert Timestamps to Dates safely
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

// 3. Fetch List of Consultations (Drafts or Converted)
export const fetchConsultations = async (studioId: string, status: "draft" | "converted" | "all" = "draft") => {
    try {
        const colRef = collection(db, "Studios", studioId, "Consultations");
        let q = query(colRef, orderBy("updatedAt", "desc"));
        
        if (status !== 'all') {
            q = query(colRef, where("status", "==", status), orderBy("updatedAt", "desc"));
        }

        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            // Safe date conversion for list view
            if (data.requirements?.date?.toDate) {
                data.requirements.date = data.requirements.date.toDate();
            }
            if (data.updatedAt?.toDate) {
                data.updatedAt = data.updatedAt.toDate();
            }
            return { id: d.id, ...data } as ConsultationData;
        });
    } catch (error) {
        console.error("Error fetching consultation list:", error);
        return [];
    }
};

// 4. Mark consultation as converted
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