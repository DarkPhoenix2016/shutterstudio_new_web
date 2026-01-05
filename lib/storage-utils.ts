// lib/storage-utils.ts
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

/**
 * Uploads a file to Firebase Storage and returns the Download URL.
 * * @param path - The full path in storage (e.g., "Admin/profile/123/avatar.png")
 * @param file - The Blob or File object to upload
 * @param metadata - Optional metadata (content type, etc.)
 */
export async function uploadFileToStorage(
  path: string, 
  file: Blob | File,
  metadata?: { contentType: string }
): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file, metadata)
    
    // Get the URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  } catch (error) {
    console.error("Error uploading file to storage:", error)
    throw new Error("Failed to upload image. Please check your connection.")
  }
}