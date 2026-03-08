import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// --- TYPES ---
export interface Member {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL?: string;
  role?: string;
  designation?: string;
  disabled?: boolean;
  accountDisabled?: boolean; 
  status?: string; 
  studioID?: string;
  schedules?: Record<string, string[]>; // Date (YYYY-MM-DD) -> EventIDs[]
  [key: string]: any;
}

export interface PackageLimits {
  maxUsers: number;
  packageName: string;
}

export interface NewMemberData {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  designation: string;
  studioID: string;
}

// --- API CONFIG ---
const API_URLS = {
  REGISTER: process.env.NEXT_PUBLIC_CF_REGISTER_USER ?? "https://registeruser-g33n26zifq-uc.a.run.app",
  ENABLE:   process.env.NEXT_PUBLIC_CF_ENABLE_USER   ?? "https://enableuser-g33n26zifq-uc.a.run.app",
  DISABLE:  process.env.NEXT_PUBLIC_CF_DISABLE_USER  ?? "https://disableuser-g33n26zifq-uc.a.run.app",
};

// --- READ OPERATIONS ---

export const fetchCrewMembers = async (studioId: string): Promise<Member[]> => {
  try {
    const memListRef = doc(db, "Studios", studioId, "Members", "MEM_LIST");
    const memListSnap = await getDoc(memListRef);

    if (!memListSnap.exists()) return [];

    const idList: string[] = memListSnap.data().ID_LIST || [];
    
    const userPromises = idList.map((uid) => getDoc(doc(db, "Users", uid)));
    const userSnaps = await Promise.all(userPromises);

    return userSnaps
      .map((snap) => ({ id: snap.id, ...snap.data() } as Member))
      .filter((u) => u.id); 
  } catch (error) {
    console.error("Error fetching crew members:", error);
    throw error;
  }
};

export const fetchRoles = async (): Promise<string[]> => {
  try {
    const platformRef = doc(db, "Platform", "ROLE_PERMISSIONS");
    const platformSnap = await getDoc(platformRef);
    if (platformSnap.exists()) {
      const allRoles = Object.keys(platformSnap.data());
      return allRoles.filter((r) => r.toLowerCase().startsWith("studio"));
    }
    return [];
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
};

export const fetchDesignations = async (studioId: string): Promise<string[]> => {
  try {
    const studioDocSnap = await getDoc(doc(db, "Studios", studioId));
    if (studioDocSnap.exists()) {
      return studioDocSnap.data().designations || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching designations:", error);
    return [];
  }
};

export const fetchSubscriptionLimits = async (studioId: string): Promise<PackageLimits> => {
  try {
    const subConfigRef = doc(db, "Studios", studioId, "Subscription", "config");
    const subConfigSnap = await getDoc(subConfigRef);

    let maxUsers = 5;
    let packageName = "Basic";

    if (subConfigSnap.exists()) {
      const { packageId, packageName: name } = subConfigSnap.data();
      packageName = name || "Basic";

      if (packageId) {
        const packageSnap = await getDoc(doc(db, "Platform", "packages"));
        if (packageSnap.exists()) {
          const pkgData = packageSnap.data()[packageId];
          if (pkgData) {
            maxUsers = pkgData.users_limit || pkgData.maxUsers || 5;
          }
        }
      }
    }
    return { maxUsers, packageName };
  } catch (error) {
    console.error("Error fetching limits:", error);
    return { maxUsers: 5, packageName: "Error" };
  }
};

// --- WRITE OPERATIONS ---

export const createCrewMember = async (data: NewMemberData) => {
  try {
    const response = await fetch(API_URLS.REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          email: data.email,
          password: data.password,
          displayName: data.displayName,
          phoneNumber: data.phone,
          role: data.role,
          studioID: data.studioID,
          photoURL: "",
          coverURL: "",
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Registration failed");

    if (result.userID && data.designation) {
      await updateDoc(doc(db, "Users", result.userID), {
        designation: data.designation,
      });
    }

    return result;
  } catch (error) {
    console.error("Error creating member:", error);
    throw error;
  }
};

export const updateCrewMember = async (uid: string, updates: Partial<Member>) => {
  try {
    const userRef = doc(db, "Users", uid);
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error("Error updating member:", error);
    throw error;
  }
};

export const toggleCrewMemberStatus = async (uid: string, shouldDisable: boolean) => {
  const url = shouldDisable ? API_URLS.DISABLE : API_URLS.ENABLE;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { uid } }),
    });

    if (!response.ok) throw new Error("Status update failed");
    return true;
  } catch (error) {
    console.error("Error toggling status:", error);
    throw error;
  }
};

// --- SCHEDULE MANAGEMENT ---

export const assignCrewSchedule = async (userId: string, date: Date, eventId: string) => {
  try {
    const dateKey = date.toISOString().split('T')[0];
    const userRef = doc(db, "Users", userId);
    
    // Add eventId to the specific date array in the 'schedules' map
    await updateDoc(userRef, {
      [`schedules.${dateKey}`]: arrayUnion(eventId)
    });
  } catch (error) {
    console.error("Error assigning crew schedule:", error);
    throw error;
  }
};

export const removeCrewSchedule = async (userId: string, date: Date, eventId: string) => {
  try {
    const dateKey = date.toISOString().split('T')[0];
    const userRef = doc(db, "Users", userId);
    
    // Remove eventId from the specific date array
    await updateDoc(userRef, {
      [`schedules.${dateKey}`]: arrayRemove(eventId)
    });
  } catch (error) {
    console.error("Error removing crew schedule:", error);
    throw error;
  }
};