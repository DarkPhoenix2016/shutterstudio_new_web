import { db } from "@/lib/firebase";
import { 
  collection, doc, getDocs, addDoc, updateDoc, 
  query, orderBy, serverTimestamp, arrayUnion, limit, startAfter 
} from "firebase/firestore";
import { deleteDoc } from "firebase/firestore";

import { fetchCrewMembers, Member } from "@/services/crew-service"; 

// --- TYPES ---

export interface TaskActivity {
  type: "created" | "assigned" | "status_changed" | "comment" | "update";
  message: string;
  userId: string;
  userName: string;
  timestamp: any; // Firestore Timestamp
}

export interface WorkNote {
  id: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: any;
}

export interface TaskUser {
  uid: string;
  name: string;
  role?: string;
  email?: string;
  photoURL?: string; 
}

export interface StudioTask {
  id?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  
  createdBy: TaskUser;
  assignedTo: TaskUser[]; // Array of users
  
  linkedEventId?: string; // Optional Event Link
  linkedEventName?: string;

  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  workNotes: WorkNote[]; // Timeline
  activityLog: TaskActivity[];
}

// --- FUNCTIONS ---

export const getStudioMembersForTasks = async (studioId: string): Promise<TaskUser[]> => {
    try {
        const members: Member[] = await fetchCrewMembers(studioId);
        return members.map(m => ({
            uid: m.id, // crew-service returns 'id' as the doc ID (uid)
            name: m.displayName,
            role: m.role || 'Member',
            email: m.email,
            photoURL: m.photoURL
        }));
    } catch (e) {
        console.error("Error getting task members:", e);
        return [];
    }
};

export const fetchStudioTasks = async (studioId: string, pageSize = 50, lastDoc = null) => {
  try {
    let q = query(
      collection(db, "Studios", studioId, "tasks"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        workNotes: data.workNotes?.map((n: any) => ({...n, timestamp: n.timestamp?.toDate()})) || [],
        activityLog: data.activityLog?.map((log: any) => ({
            ...log,
            timestamp: log.timestamp?.toDate()
        }))
      } as StudioTask;
    });
    
    return { tasks, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { tasks: [], lastDoc: null };
  }
};

export const createTask = async (studioId: string, task: any, currentUser: TaskUser) => {
  try {
    if (!currentUser.uid || !currentUser.name) throw new Error("Invalid User Data");

    const newTask = {
      ...task,
      createdBy: {
        uid: currentUser.uid,
        name: currentUser.name,
        role: currentUser.role || 'Member',
        photoURL: currentUser.photoURL || ""
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      workNotes: [],
      activityLog: [{
        type: "created",
        message: `Task created by ${currentUser.name}`,
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: new Date()
      }]
    };
    
    await addDoc(collection(db, "Studios", studioId, "tasks"), newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const updateTaskStatus = async (studioId: string, taskId: string, newStatus: string, currentUser: TaskUser) => {
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

export const addWorkNote = async (studioId: string, taskId: string, message: string, currentUser: TaskUser) => {
    try {
        const taskRef = doc(db, "Studios", studioId, "tasks", taskId);
        const newNote: WorkNote = {
            id: crypto.randomUUID(),
            message,
            userId: currentUser.uid,
            userName: currentUser.name,
            timestamp: new Date()
        };

        await updateDoc(taskRef, {
            workNotes: arrayUnion(newNote),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
};

export const deleteTask = async (studioId: string, taskId: string) => {
    try {
        const taskRef = doc(db, "Studios", studioId, "tasks", taskId);
        await deleteDoc(taskRef);
    } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
    }
};