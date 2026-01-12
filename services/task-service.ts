import { db } from "@/lib/firebase";
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, arrayUnion 
} from "firebase/firestore";

// --- TYPES ---

export interface TaskActivity {
  type: "created" | "assigned" | "status_changed" | "comment";
  message: string;
  userId: string;
  userName: string;
  timestamp: Timestamp | Date;
}

export interface StudioTask {
  id?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  
  createdBy: {
    uid: string;
    name: string;
    role: string;
  };
  
  assignedTo: {
    uid: string;
    name: string;
  };
  
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  activityLog: TaskActivity[];
}

// --- FUNCTIONS ---

export const fetchStudioTasks = async (studioId: string) => {
  try {
    const q = query(
      collection(db, "Studios", studioId, "tasks"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        activityLog: data.activityLog?.map((log: any) => ({
            ...log,
            timestamp: log.timestamp?.toDate()
        }))
      } as StudioTask;
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export const createTask = async (studioId: string, task: Omit<StudioTask, 'id' | 'createdAt' | 'updatedAt' | 'activityLog'>, currentUser: { uid: string, name: string, role: string }) => {
  try {
    const newTask = {
      ...task,
      createdBy: {
        uid: currentUser.uid,
        name: currentUser.name,
        role: currentUser.role
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      activityLog: [{
        type: "created",
        message: `Task created by ${currentUser.name}`,
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: new Date() // Client side optmistic, server will overwrite
      }]
    };
    
    await addDoc(collection(db, "Studios", studioId, "tasks"), newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const updateTaskStatus = async (studioId: string, taskId: string, newStatus: string, currentUser: { uid: string, name: string }) => {
  try {
    const taskRef = doc(db, "Studios", studioId, "tasks", taskId);
    
    await updateDoc(taskRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      activityLog: arrayUnion({
        type: "status_changed",
        message: `Status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: new Date()
      })
    });
  } catch (error) {
    console.error("Error updating status:", error);
    throw error;
  }
};

export const updateTaskDetails = async (studioId: string, taskId: string, updates: Partial<StudioTask>) => {
    try {
        const taskRef = doc(db, "Studios", studioId, "tasks", taskId);
        await updateDoc(taskRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating task:", error);
        throw error;
    }
};