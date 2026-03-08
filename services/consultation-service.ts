import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc, getDocs,
  query, where, orderBy, deleteDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import {
  PackageData,
  EventData,
  createEvent // Imported directly
} from "@/services/event-service";
import { logAuditAction } from "@/lib/logger";

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
    budgetRange: number[];
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
    selectedPackageId?: string; 
    customItems: CustomItem[]; // Add-ons
    customBaseItems?: CustomItem[]; // Base items for custom packages
    totalEstimate: number;
  };

  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
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
 * Converts a consultation into a full event using the Event Service.
 */
export const convertToEvent = async (studioId: string, consultation: ConsultationData, packagesList: PackageData[]): Promise<void> => {
  try {
    const now = new Date();
    const isCustomPackage = consultation.package.selectedPackageId === 'custom';
    
    // 1. Calculate Costs & Items
    let dayBaseCost = 0;
    let pkgId = "";
    let dayItems: any[] = []; 

    // A. Handle Package Type
    if (!isCustomPackage && consultation.package.selectedPackageId) {
      const pkg = packagesList.find(p => p.id === consultation.package.selectedPackageId);
      if (pkg) {
        dayBaseCost = Number(pkg.price);
        pkgId = pkg.id; // Correctly referencing PackageData interface
      }
    } 
    // B. Handle Custom Base Items
    else if (isCustomPackage && consultation.package.customBaseItems) {
      dayBaseCost = consultation.package.customBaseItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
      
      dayItems = [...consultation.package.customBaseItems.map(item => ({
        name: item.name,
        quantity: item.qty, // Mapping 'qty' to 'quantity' for CustomItem interface
        price: item.price,
        unit: item.unit || ""
      }))];
    }

    // C. Handle Add-ons
    const addOns = (consultation.package.customItems || []).map(item => ({
        name: item.name,
        quantity: item.qty, // Mapping 'qty' to 'quantity'
        price: item.price,
        unit: item.unit || ""
    }));

    // Merge for flat structure
    const finalDayItems = [...dayItems, ...addOns];
    const addOnCost = addOns.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const totalDayCost = dayBaseCost + addOnCost;

    // 2. Construct EventData Object
    // We strictly use the EventData interface from event-service.ts
    const eventData: EventData = {
      // Customer Info
      customerName: consultation.client.name,
      customerMobile: consultation.client.mobile,
      customerEmail: consultation.client.email || "",
      galleryUrls: [],
      
      // Meta
      eventName: `${consultation.client.name} ${consultation.requirements.eventType}`,
      eventType: consultation.requirements.eventType,
      status: "Inquiry",
      inquiryDate: serverTimestamp(), // Will be processed by Firestore
      
      // Scheduling
      dayCount: 1,
      days: [
        {
          date: consultation.requirements.date || now,
          type: isCustomPackage ? 'custom' : 'package',
          packageId: pkgId, // Optional in EventDayConfig
          cost: totalDayCost,
          customItems: finalDayItems // Matches CustomItem[] in EventDayConfig
        }
      ],
      
      // Financials
      totalBudget: totalDayCost,
      finalBudget: totalDayCost, // No discount initially
      discount: 0,
      discountType: 'fixed',
      advancePaid: 0,
      
      // Resources
      assignedCrew: [],
      assignedEquipment: [],
      
      // Extra
      notes: `"Consutation Notes:" ${consultation.requirements.notes || ""}`
    };

    // 3. Call Event Service to Create (Handles Transaction & ID Generation)
    await createEvent(studioId, eventData);

    // 4. Update Consultation Status
    if (consultation.id) {
      const consRef = doc(db, "Studios", studioId, "Consultations", consultation.id);
      await updateDoc(consRef, {
        status: 'converted',
        updatedAt: serverTimestamp()
      });
    }

    // 5. Audit Log
    await logAuditAction(
      "CONVERT_CONSULTATION",
      `Consultation for '${consultation.client.name}' converted to event`,
      { uid: studioId, name: studioId },
      "Consultation"
    );

  } catch (error) {
    console.error("Error converting to event:", error);
    throw error;
  }
};