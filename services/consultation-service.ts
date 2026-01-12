import { db } from "@/lib/firebase"; // Adjust path to your firebase config
import { 
    collection, addDoc, updateDoc, doc, getDocs, 
    query, where, orderBy, deleteDoc, serverTimestamp, Timestamp 
} from "firebase/firestore";

// --- INTERFACES ---

export interface CustomItem {
    name: string;
    qty: number;
    price: number;
    unit?: string;
}

export interface ConsultationData {
    id?: string;
    studioId: string;
    status: 'draft' | 'converted' | 'archived';
    
    client: {
        name: string;
        mobile: string;
        email: string;
    };

    requirements: {
        eventType: string;
        budgetRange: number[]; // [min, max]
        date?: Date;
        locations: string[];
        styleTags: string[];
        deliverables: {
            photo: boolean;
            video: boolean;
            album: boolean;
            drone: boolean;
        };
        notes: string;
    };

    inspiration: {
        matchedEventIds: string[];
        selectedEventIds: string[];
    };

    package: {
        selectedPackageId?: string; // 'custom' or UUID
        customItems: CustomItem[];
        totalEstimate: number;
    };

    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

// --- SERVICE FUNCTIONS ---

/**
 * Saves a consultation draft. 
 * If the data has an ID, it updates the existing document.
 * If not, it creates a new document.
 */
export const saveConsultation = async (studioId: string, data: ConsultationData): Promise<ConsultationData> => {
    const cleanData = { ...data };
    
    // Ensure studioId is set
    cleanData.studioId = studioId;
    
    // Remove undefined fields that Firestore might reject
    if (cleanData.id) delete cleanData.id;

    const payload = {
        ...cleanData,
        updatedAt: serverTimestamp()
    };

    try {
        if (data.id) {
            // Update existing
            const docRef = doc(db, "Studios", studioId, "Consultations", data.id);
            await updateDoc(docRef, payload);
            return { ...data, updatedAt: new Date() }; // Return with client-side date for immediate UI update
        } else {
            // Create new
            const payloadWithCreated = {
                ...payload,
                createdAt: serverTimestamp(),
                status: 'draft' // Ensure it starts as draft
            };
            const colRef = collection(db, "Studios", studioId, "Consultations");
            const docRef = await addDoc(colRef, payloadWithCreated);
            return { ...data, id: docRef.id, updatedAt: new Date() };
        }
    } catch (error) {
        console.error("Error saving consultation:", error);
        throw error;
    }
};

/**
 * Fetches consultations for a specific studio, filtered by status.
 * Results are ordered by last updated.
 */
export const fetchConsultations = async (studioId: string, status: string = 'draft'): Promise<ConsultationData[]> => {
    try {
        const q = query(
            collection(db, "Studios", studioId, "Consultations"),
            where("studioId", "==", studioId),
            where("status", "==", status),
            orderBy("updatedAt", "desc")
        );

        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const d = doc.data();
            // Convert Firestore timestamps to JS Dates
            return {
                id: doc.id,
                ...d,
                requirements: {
                    ...d.requirements,
                    date: d.requirements?.date instanceof Timestamp ? d.requirements.date.toDate() : d.requirements?.date
                },
                createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : d.createdAt,
                updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : d.updatedAt,
            } as ConsultationData;
        });
    } catch (error) {
        console.error("Error fetching consultations:", error);
        throw error;
    }
};

/**
 * Marks a consultation as 'converted' (e.g., after creating an Event from it).
 */
export const convertConsultationStatus = async (studioId: string, consultationId: string): Promise<void> => {
    try {
        const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
        await updateDoc(docRef, {
            status: 'converted',
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error converting consultation:", error);
        throw error;
    }
};

/**
 * Permanently deletes a consultation draft.
 */
export const deleteConsultation = async (studioId: string, consultationId: string): Promise<void> => {
    try {
        // Optional: Verify studioId matches doc ownership if strict security rules aren't enough
        const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting consultation:", error);
        throw error;
    }
};