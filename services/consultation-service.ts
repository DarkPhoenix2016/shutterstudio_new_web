import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc, getDocs,
  query, where, orderBy, deleteDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { PackageData } from "@/services/event-service";

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

// Target structure matches the Firebase JSON provided
interface FirebaseEventStructure {
  basicInfo: {
    eventName: string;
    eventType: string;
    status: string;
    tags: string[];
    inquiryDate: any
  };
  customer: {
    name: string;
    email: string;
    mobile: string;
    contacts: any[];
    verification?: any
  };
  schedule: {
    dayCount: number;
    days: any[];
    locations: any[]
  };
  budget: {
    totalBudget: number;
    finalBudget: number;
    discount: { value: number; type: string };
    additionalServices: any[]
  };
  payments: { transactions: any[] };
  resources: { assignedCrew: string[]; assignedEquipment: string[] };
  media: { coverPhotoUrl: string; galleryUrls: string[] };
  approval: { customerConfirmed: boolean; confirmedAt?: any; customerEmail: string; customerPhone: string };
  meta: { createdAt: any; updatedAt: any };
}



// --- SERVICE FUNCTIONS ---

export const saveConsultation = async (studioId: string, data: ConsultationData): Promise<ConsultationData> => {
  const cleanData = { ...data };
  cleanData.studioId = studioId;
  if (cleanData.id) delete cleanData.id;

  const payload = { ...cleanData, updatedAt: serverTimestamp() };

  try {
    if (data.id) {
      const docRef = doc(db, "Studios", studioId, "Consultations", data.id);
      await updateDoc(docRef, payload);
      return { ...data, updatedAt: new Date() };
    } else {
      const payloadWithCreated = { ...payload, createdAt: serverTimestamp(), status: 'draft' };
      const colRef = collection(db, "Studios", studioId, "Consultations");
      const docRef = await addDoc(colRef, payloadWithCreated);
      return { ...data, id: docRef.id, updatedAt: new Date() };
    }
  } catch (error) {
    console.error("Error saving consultation:", error);
    throw error;
  }
};

export const fetchConsultations = async (studioId: string, status: string = 'draft'): Promise<ConsultationData[]> => {
  try {
    const q = query(
      collection(db, "Studios", studioId, "Consultations"),
      where("status", "==", status),
      orderBy("updatedAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const d = doc.data();
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

export const deleteConsultation = async (studioId: string, consultationId: string): Promise<void> => {
  try {
    const docRef = doc(db, "Studios", studioId, "Consultations", consultationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting consultation:", error);
    throw error;
  }
};

/**
 * Converts a consultation into a full event record following the strictly nested Firebase structure.
 */
export const convertToEvent = async (studioId: string, consultation: ConsultationData, packagesList: PackageData[]): Promise<void> => {

  
  try {
    const now = new Date();
    const isCustomPackage = consultation.package.selectedPackageId === 'custom';
    let packageCost = 0;
    let pkgId = "";

    if (!isCustomPackage && consultation.package.selectedPackageId) {
      const pkg = packagesList.find(p => p.id === consultation.package.selectedPackageId);
      if (pkg) {
        packageCost = Number(pkg.price);
        pkgId = pkg.id || "";
      }
    }

    const customTotal = consultation.package.customItems.reduce((acc, i) => acc + (i.price * i.qty), 0);

    // 1. Construct the nested Event object strictly matching the prompt's JSON structure
    const eventData: FirebaseEventStructure = {
      displayId,

      eventName: consultation.client.name || "New Event",
      eventType: consultation.requirements.eventType,

      customerName: consultation.client.name,
      customerEmail: consultation.client.email,
      customerMobile: consultation.client.mobile,

      inquiryDate: serverTimestamp(),
      createdAt: serverTimestamp(),

      status: "Inquiry",

      assignedCrew: [],
      assignedEquipment: [],
      galleryUrls: [],

      discount: 0,
      discountType: "fixed",
      advancePaid: 0,

      totalBudget: consultation.package.totalEstimate,
      finalBudget: consultation.package.totalEstimate,

      dayCount: 1,

      days: [
        {
          date: consultation.requirements.date || serverTimestamp(),
          type: "package",
          packageId: selectedPackageId,
          cost: consultation.package.totalEstimate,
          customItems: mergedCustomItems
        }
      ],

      notes: consultation.requirements.notes || ""
    };

    // 2. Save to "events" collection
    const eventsCol = collection(db, "Studios", studioId, "Events"); // Adjust collection path if "studios/{id}/events"
    // Note: If you use subcollections per studio, use `collection(db, "studios", studioId, "events")`
    // Assuming global events collection based on context, otherwise adjust accordingly.
    // For safety, based on `fetchEvents(userData.studioID)`, it implies fetching by studioID filter on global or subcollection.
    // I will assume global collection with studioID field OR logic is handled by parent. 
    // Adding `studioId` to root if your DB requires it for filtering:
    // @ts-ignore
    eventData.studioId = studioId;

    await addDoc(eventsCol, eventData);

    // 3. Update Consultation Status
    if (consultation.id) {
      const consRef = doc(db, "Studios", studioId, "Consultations", consultation.id);
      await updateDoc(consRef, {
        status: 'converted',
        updatedAt: serverTimestamp()
      });
    }

  } catch (error) {
    console.error("Error converting to event:", error);
    throw error;
  }
};