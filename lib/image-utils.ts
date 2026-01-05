// lib/image-utils.ts
import imageCompression from "browser-image-compression"

// --- 1. Helper to create HTMLImageElement ---
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })

// --- 2. Cropping Logic (Canvas Drawing) ---
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return null

  // Calculate safe area for rotation
  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
  )

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file)
    }, "image/png")
  })
}

// --- 3. Compression Logic ---
export async function compressImage(file: File | Blob): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // Max size 500KB (Excellent for web avatars)
    maxWidthOrHeight: 1024, // Resize if larger than 1024px
    useWebWorker: true, // Use multi-threading to avoid freezing UI
    fileType: "image/jpeg", // Convert to JPEG for better compression
  }

  try {
    const compressedFile = await imageCompression(file as File, options)
    console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
    return compressedFile
  } catch (error) {
    console.error("Compression failed:", error)
    // If compression fails, return the original file as a fallback
    return file as File
  }
}