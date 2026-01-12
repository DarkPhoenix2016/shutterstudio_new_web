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
    customItems: CustomItem[]; // Add-ons
    customBaseItems?: CustomItem[]; // Base items for custom packages
    totalEstimate: number;
  };

  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

// Flat structure matching your Firebase record
interface FirebaseEventStructure {
  advancePaid: number;
  assignedCrew: any[];
  assignedEquipment: any[];
  createdAt: any;
  customerEmail: string;
  customerMobile: string;
  customerName: string;
  dayCount: number;
  days: Array<{
    cost: number;
    customItems: any[];
    date: any;
    packageId?: string;
    type: 'package' | 'custom';
  }>;
  discount: number;
  discountType: string;
  // displayId is typically generated server-side or via trigger, omitting from creation payload if optional
  displayId?: string; 
  eventName: string;
  eventType: string;
  finalBudget: number;
  galleryUrls: string[];
  inquiryDate: any;
  notes: string;
  status: string;
  totalBudget: number;
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
 * Converts a consultation into a full event record following the strictly flat Firebase structure.
 */
export const convertToEvent = async (studioId: string, consultation: ConsultationData, packagesList: PackageData[]): Promise<void> => {
  try {
    const now = new Date();
    const isCustomPackage = consultation.package.selectedPackageId === 'custom';
    
    // 1. Calculate Costs & Items
    let dayBaseCost = 0;
    let pkgId = "";
    let dayItems: any[] = []; // Standard items array

    // A. Handle Package Type
    if (!isCustomPackage && consultation.package.selectedPackageId) {
      const pkg = packagesList.find(p => p.id === consultation.package.selectedPackageId);
      if (pkg) {
        dayBaseCost = Number(pkg.price);
        pkgId = pkg.id || "";
      }
    } 
    // B. Handle Custom Base Items
    else if (isCustomPackage && consultation.package.customBaseItems) {
      // Sum base items
      dayBaseCost = consultation.package.customBaseItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
      // Add base items to list
      dayItems = [...consultation.package.customBaseItems.map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
        unit: item.unit || ""
      }))];
    }

    // C. Handle Add-ons (Merge into dayItems)
    // In the flat structure, add-ons usually live inside the day's customItems or simply increase the day's cost.
    // We will append them to the day's item list so they are tracked.
    const addOns = (consultation.package.customItems || []).map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
        unit: item.unit || "" // Default to empty string if undefined
    }));

    // Merge Add-ons into Day Items
    const finalDayItems = [...dayItems, ...addOns];

    // Calculate total add-on cost
    const addOnCost = addOns.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    // Final Day Cost = Base Package Cost + Add-ons Cost
    const totalDayCost = dayBaseCost + addOnCost;

    // 2. Construct the Flat Event Object
    const eventData: FirebaseEventStructure = {
      advancePaid: 0,
      assignedCrew: [],
      assignedEquipment: [],
      createdAt: serverTimestamp(),
      customerEmail: consultation.client.email || "",
      customerMobile: consultation.client.mobile || "",
      customerName: consultation.client.name,
      dayCount: 1,
      days: [
        {
          cost: totalDayCost,
          customItems: finalDayItems,
          date: consultation.requirements.date || serverTimestamp(),
          packageId: pkgId, // Empty string if custom
          type: isCustomPackage ? "custom" : "package"
        }
      ],
      discount: 0,
      discountType: "fixed",
      // displayId is omitted; assumed generated by backend trigger or function
      eventName: `${consultation.requirements.eventType} - ${consultation.client.name}`,
      eventType: consultation.requirements.eventType,
      finalBudget: totalDayCost, // No discount applied initially
      galleryUrls: [],
      inquiryDate: serverTimestamp(),
      notes: consultation.requirements.notes || "",
      status: "Inquiry",
      totalBudget: totalDayCost
    };

    // 3. Save to "Events" collection under the Studio
    const eventsCol = collection(db, "Studios", studioId, "Events");
    await addDoc(eventsCol, eventData);

    // 4. Update Consultation Status
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