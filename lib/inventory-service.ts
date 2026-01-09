import { db } from "@/lib/firebase";
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, runTransaction 
} from "firebase/firestore";

// --- TYPES ---

export type ItemType = 'owned' | 'rented';

export interface RentalRates {
  hourly?: number;
  daily?: number;
  weekly?: number;
  biWeekly?: number;
  monthly?: number;
}

export interface InventoryCategory {
  id?: string;
  name: string;
  color: string; // Hex code
}

export interface InventoryItem {
  id?: string;
  name: string;
  category: string; // Mapped to InventoryCategory.name
  categoryId?: string; // Mapped to InventoryCategory.id
  type: ItemType;
  color?: string; // Inherited from category or custom
  
  // Stock Logic
  quantityTotal: number;
  quantityAvailable: number;
  
  // Financials
  costPerEvent?: number; 
  rentalRates?: RentalRates; 
  
  // Metadata
  description?: string;
  imageUrl?: string;
  serialNumber?: string;
  
  // Status
  status: 'active' | 'maintenance' | 'retired';
  createdAt?: any;
}

export interface StockTransaction {
  id?: string;
  itemId: string;
  type: 'add' | 'remove' | 'assign_event' | 'return_event' | 'maintenance_in' | 'maintenance_out';
  quantity: number;
  comment: string;
  performedBy: string; 
  date: any;
  eventId?: string; 
  userId?: string; 
}

// --- FUNCTIONS ---

// 1. Fetch All Items
export const fetchInventory = async (studioId: string) => {
  try {
    const ref = collection(db, "Studios", studioId, "Inventory");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

// 2. Add New Item
export const addInventoryItem = async (studioId: string, item: Omit<InventoryItem, 'id'>) => {
  try {
    const ref = collection(db, "Studios", studioId, "Inventory");
    const docRef = await addDoc(ref, {
      ...item,
      quantityAvailable: item.quantityTotal, 
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding item:", error);
    throw error;
  }
};

// 2.1 Update Item
export const updateInventoryItem = async (studioId: string, itemId: string, updates: Partial<InventoryItem>) => {
  try {
    const ref = doc(db, "Studios", studioId, "Inventory", itemId);
    await updateDoc(ref, updates);
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

// 2.2 Delete Item
export const deleteInventoryItem = async (studioId: string, itemId: string) => {
  try {
    const ref = doc(db, "Studios", studioId, "Inventory", itemId);
    await deleteDoc(ref);
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};

// 3. Category Management
// [!code highlight] UPDATED PATH: Studios/{id}/Settings/Inventory/Categories
export const fetchCategories = async (studioId: string) => {
  try {
    const ref = collection(db, "Studios", studioId, "Settings", "Inventory", "Categories");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryCategory));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const addCategory = async (studioId: string, category: InventoryCategory) => {
  try {
    const ref = collection(db, "Studios", studioId, "Settings", "Inventory", "Categories");
    await addDoc(ref, category);
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const updateCategory = async (studioId: string, categoryId: string, updates: Partial<InventoryCategory>) => {
  try {
    const ref = doc(db, "Studios", studioId, "Settings", "Inventory", "Categories", categoryId);
    await updateDoc(ref, updates);
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (studioId: string, categoryId: string) => {
  try {
    await deleteDoc(doc(db, "Studios", studioId, "Settings", "Inventory", "Categories", categoryId));
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// 4. Adjust Stock (Transaction)
export const adjustStock = async (
  studioId: string, 
  itemId: string, 
  change: number, 
  type: StockTransaction['type'], 
  comment: string, 
  user: { uid: string, name: string },
  context?: { eventId?: string }
) => {
  try {
    const itemRef = doc(db, "Studios", studioId, "Inventory", itemId);
    const transRef = collection(db, "Studios", studioId, "Inventory", itemId, "Transactions");

    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) throw "Item does not exist!";

      const currentTotal = itemDoc.data().quantityTotal || 0;
      const currentAvail = itemDoc.data().quantityAvailable || 0;

      let newTotal = currentTotal;
      let newAvail = currentAvail;

      if (type === 'add') {
        newTotal += change;
        newAvail += change;
      } else if (type === 'remove') {
        // VALIDATION: Cannot reduce total below what is currently assigned (total - avail)
        const assignedCount = currentTotal - currentAvail;
        if ((newTotal - change) < assignedCount) {
            throw `Cannot remove items currently assigned. ${assignedCount} items are in use.`;
        }
        newTotal -= change;
        newAvail -= change;
      } else if (type === 'assign_event' || type === 'maintenance_in') {
        newAvail -= change; 
      } else if (type === 'return_event' || type === 'maintenance_out') {
        newAvail += change;
      }

      if (newAvail < 0) throw "Insufficient stock available!";
      if (newTotal < 0) throw "Total quantity cannot be negative!";

      transaction.update(itemRef, { 
        quantityTotal: newTotal,
        quantityAvailable: newAvail 
      });

      const newTransDoc = doc(transRef);
      transaction.set(newTransDoc, {
        itemId,
        type,
        quantity: change,
        comment,
        performedBy: user.name,
        performedById: user.uid,
        date: serverTimestamp(),
        eventId: context?.eventId || null
      });
    });
  } catch (error) {
    console.error("Stock adjustment failed:", error);
    throw error;
  }
};

// 5. Fetch Item History
export const fetchItemHistory = async (studioId: string, itemId: string) => {
  const ref = collection(db, "Studios", studioId, "Inventory", itemId, "Transactions");
  const q = query(ref, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction));
};

// 6. Stats
export const calculateInventoryStats = (items: InventoryItem[]) => {
  const totalItems = items.length;
  const totalValue = items.reduce((acc, item) => acc + (item.quantityTotal * (item.costPerEvent || 0)), 0); 
  const lowStock = items.filter(i => i.quantityAvailable < 2).length;
  const rentedCount = items.filter(i => i.type === 'rented').length;
  return { totalItems, totalValue, lowStock, rentedCount };
};