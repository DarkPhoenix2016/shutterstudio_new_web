import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore"

export interface StudioContact {
    id?: string
    name: string
    mobile: string
    email?: string
    notes?: string
    source?: "manual"
    createdAt?: any
    updatedAt?: any
}

export const fetchStudioContacts = async (studioId: string): Promise<StudioContact[]> => {
    if (!studioId) return [];
    try {
        const contactRef = collection(db, "Studios", studioId, "Contacts");
        const q = query(contactRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioContact));
    } catch (error) {
        console.error("fetchStudioContacts Error:", error);
        return [];
    }
}

export const createStudioContact = async (studioId: string, data: Omit<StudioContact, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    const contactRef = collection(db, "Studios", studioId, "Contacts");
    const docRef = await addDoc(contactRef, {
        ...data,
        source: "manual",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export const updateStudioContact = async (studioId: string, contactId: string, data: Partial<StudioContact>): Promise<void> => {
    const contactRef = doc(db, "Studios", studioId, "Contacts", contactId);
    await updateDoc(contactRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export const deleteStudioContact = async (studioId: string, contactId: string): Promise<void> => {
    const contactRef = doc(db, "Studios", studioId, "Contacts", contactId);
    await deleteDoc(contactRef);
}
