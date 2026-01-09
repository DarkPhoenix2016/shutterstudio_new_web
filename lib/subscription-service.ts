import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";

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
 * Path: /Platform/packages/{packageId}
 */
export const getPlatformPackageLimits = async (packageId: string): Promise<PackageLimits | null> => {
  try {
    const ref = doc(db, "Platform", "packages", packageId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      return {
        packageName: data.name || "Unknown",
        events_limit: Number(data.events_limit) || 0,
        users_limit: Number(data.users_limit) || 0,
        photos_per_event: Number(data.photos_per_event) || 0,
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