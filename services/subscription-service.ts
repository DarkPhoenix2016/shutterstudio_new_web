import { db } from "@/lib/firebase";
import { 
  doc, getDoc, collection, getDocs, getCountFromServer, 
  query, orderBy, limit, Timestamp 
} from "firebase/firestore";
import { addMonths, addYears, isAfter, parseISO } from "date-fns";
// --- TYPES ---

export interface PackageLimits {
  packageName: string;
  events_limit: number;     // e.g. 50
  users_limit: number;      // e.g. 5
  photos_per_event: number; // e.g. 500
}

export interface UsageStats {
  eventsUsed: number;
  usersUsed: number;
}

export interface SubscriptionDetails {
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  amount: number;
  interval: 'monthly' | 'yearly';
  nextRenewalDate: Date;
  regDate: Date;
  lastInvoiceAmount?: number;
  lastInvoiceDate?: Date;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  issueDate: Date;
  dueDate: Date;
  pdfUrl?: string;
}

// --- HELPER: CALCULATE NEXT RENEWAL ---
const calculateNextRenewal = (regDate: Date, cycle: string): Date => {
  const now = new Date();
  let nextDate = new Date(regDate);

  // Safety: Prevent infinite loops if dates are invalid
  let loops = 0;
  while (!isAfter(nextDate, now) && loops < 1000) {
    if (cycle === 'yearly') {
      nextDate = addYears(nextDate, 1);
    } else {
      nextDate = addMonths(nextDate, 1);
    }
    loops++;
  }
  return nextDate;
};

// --- FUNCTIONS ---

/**
 * 1. Get the Studio's Subscription Configuration
 * Path: /Studios/{id}/Subscription/config
 */
export const getStudioPackageConfig = async (studioId: string) => {
  try {
    const ref = doc(db, "Studios", studioId, "Subscription", "config");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { 
        packageId: snap.data().packageId as string,
        packageName: snap.data().packageName as string
      };
    }
    return null; 
  } catch (error) {
    console.error("Error fetching studio subscription:", error);
    return null;
  }
};

/**
 * 2. Get Limits from Platform Packages
 * Path: /Platform/packages (Document) -> Field: [packageId]
 */
export const getPlatformPackageLimits = async (packageId: string): Promise<PackageLimits | null> => {
  try {
    // [!code highlight] Fixed: Fetch the single document 'packages' in 'Platform' collection
    // This creates a valid 2-segment reference: Collection(Platform) -> Document(packages)
    const ref = doc(db, "Platform", "packages");
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      
      // [!code highlight] Fixed: Access the specific package map from the document fields
      const pkgData = data[packageId];

      if (!pkgData) {
          console.warn(`Package '${packageId}' not found inside Platform/packages document.`);
          return null;
      }

      return {
        packageName: pkgData.name || "Unknown",
        events_limit: Number(pkgData.events_limit) || 0,
        users_limit: Number(pkgData.users_limit) || 0,
        photos_per_event: Number(pkgData.photos_per_event) || 0,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching platform package limits:", error);
    return null;
  }
};

/**
 * 3. Calculate Current Usage (Events & Users)
 */
export const getCurrentUsage = async (studioId: string): Promise<UsageStats> => {
  try {
    // A. Count Events
    const eventsColl = collection(db, "Studios", studioId, "Events");
    const eventsSnapshot = await getCountFromServer(eventsColl);
    const eventsUsed = eventsSnapshot.data().count;

    // B. Count Active Users
    // Assuming user list is stored in Members/MEM_LIST or similar
    const memRef = doc(db, "Studios", studioId, "Members", "MEM_LIST");
    const memSnap = await getDoc(memRef);
    let usersUsed = 0;
    
    if (memSnap.exists()) {
        const list = memSnap.data().ID_LIST || [];
        usersUsed = list.length;
    }

    return { eventsUsed, usersUsed };
  } catch (error) {
    console.error("Error calculating usage:", error);
    return { eventsUsed: 0, usersUsed: 0 };
  }
};

/**
 * 4. Main Validator Function
 * Returns { allowed: boolean, message: string }
 */
export const validateSubscriptionAction = async (
  studioId: string, 
  action: 'create_event' | 'add_user' | 'check_photo_limit',
  payload?: number // e.g., number of photos trying to upload/assign
): Promise<{ allowed: boolean; message?: string }> => {
  
  // 1. Get Config
  const config = await getStudioPackageConfig(studioId);
  if (!config) return { allowed: false, message: "Subscription configuration missing." };

  // 2. Get Limits
  const limits = await getPlatformPackageLimits(config.packageId);
  if (!limits) return { allowed: false, message: "Invalid subscription package." };

  // 3. Get Usage
  const usage = await getCurrentUsage(studioId);

  // 4. Validate based on Action
  switch (action) {
    case 'create_event':
      if (usage.eventsUsed >= limits.events_limit) {
        return { 
          allowed: false, 
          message: `Event limit reached (${usage.eventsUsed}/${limits.events_limit}). Upgrade to ${config.packageName} Pro?` 
        };
      }
      break;

    case 'add_user':
      if (usage.usersUsed >= limits.users_limit) {
        return { 
          allowed: false, 
          message: `User limit reached (${usage.usersUsed}/${limits.users_limit}).` 
        };
      }
      break;

    case 'check_photo_limit':
      if (payload && payload > limits.photos_per_event) {
        return {
          allowed: false,
          message: `This package only allows ${limits.photos_per_event} photos per event.`
        };
      }
      break;
  }

  return { allowed: true };
};

// --- READ FUNCTIONS ---

/**
 * 1. Fetch Subscription Configuration
 * Path: /Studios/{id}/Subscription/config
 */
export const fetchSubscriptionDetails = async (studioId: string): Promise<SubscriptionDetails | null> => {
  try {
    const ref = doc(db, "Studios", studioId, "Subscription", "config");
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      
      // Parse Dates (Handle Firestore Timestamp or ISO String)
      const regDate = data.regDate instanceof Timestamp 
        ? data.regDate.toDate() 
        : new Date(data.regDate || Date.now());

      const lastInvDate = data.last_invoice_date instanceof Timestamp 
        ? data.last_invoice_date.toDate() 
        : data.last_invoice_date ? new Date(data.last_invoice_date) : undefined;

      const cycle = data.cycle || 'monthly';

      return {
        planId: data.packageId,
        planName: data.packageName || "Basic Plan",
        status: data.status || "active", // Default to active if not explicit
        amount: data.price || 0,
        interval: cycle,
        regDate: regDate,
        nextRenewalDate: calculateNextRenewal(regDate, cycle),
        lastInvoiceAmount: data.last_invoice_amount,
        lastInvoiceDate: lastInvDate
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return null;
  }
};

/**
 * 4. Fetch Invoices (Subcollection)
 */
export const fetchSubscriptionInvoices = async (studioId: string): Promise<SubscriptionInvoice[]> => {
  try {
    const invoicesRef = collection(db, "Studios", studioId, "Subscription", "invoices", "list");
    const q = query(invoicesRef, orderBy("issueDate", "desc"), limit(12));
    const snap = await getDocs(q);

    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            invoiceNumber: data.invoiceNumber || d.id,
            amount: data.amount || 0,
            status: data.status || 'pending',
            issueDate: data.issueDate instanceof Timestamp ? data.issueDate.toDate() : new Date(),
            dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(),
            pdfUrl: data.pdfUrl
        } as SubscriptionInvoice;
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
};