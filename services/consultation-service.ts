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
    date?: Date;
    guestCount?: number;
    budgetRange: [number, number]; // [min, max]
    locations: string[]; // City names
    styleTags: string[];
    notes?: string;
  };

  inspiration: {
    matchedEventIds: string[];
    selectedImageUrls: string[]; // For visual reference in review
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

export const saveConsultation = async (studioId: string, data: ConsultationData) => {
  try {
    const colRef = collection(db, "Studios", studioId, "Consultations");
    const docRef = data.id ? doc(colRef, data.id) : doc(colRef); // New or Update
    
    const payload = {
      ...data,
      id: docRef.id,
      studioId,
      updatedAt: serverTimestamp(),
      createdAt: data.createdAt || serverTimestamp()
    };

    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error("Error saving consultation:", error);
    throw error;
  }
};

export const getConsultation = async (studioId: string, consultationId: string) => {
  try {
    const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as ConsultationData) : null;
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return null;
  }
};

export const convertConsultationStatus = async (studioId: string, consultationId: string) => {
    await updateDoc(doc(db, "Studios", studioId, "Consultations", consultationId), {
        status: "converted",
        updatedAt: serverTimestamp()
    });
};