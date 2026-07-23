import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Derive a 32-byte key from our secret helper
const SECRET_KEY = crypto.createHash("sha256").update(
  process.env.TEXT_LK_API_TOKEN || "shutterstudio-portal-default-secret-key-2026"
).digest();

/**
 * Encrypt a plain text string into a hex payload.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted hex payload back to plain text.
 * Returns null if decryption fails or signature/key is invalid.
 */
export function decrypt(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return null;
  }
}


/**
 * Generate a signed session token containing phone, studioId, and expiresAt.
 */
export function generateSessionToken(phone: string, studioId: string, expiresAt: number): string {
  const payload = [phone, studioId, expiresAt.toString()].join("|");
  return encrypt(payload);
}

/**
 * Verify a session token. Returns parsed payload metadata if valid, null otherwise.
 */
export function verifySessionToken(token: string, targetStudioId: string): { phone: string } | null {
  const decrypted = decrypt(token);
  if (!decrypted) return null;

  const [phone, studioId, expiresStr] = decrypted.split("|");
  if (!phone || !studioId || !expiresStr) return null;

  // Verify studio matches
  if (studioId !== targetStudioId) return null;

  // Verify expiration
  const expiresAt = parseInt(expiresStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return { phone };
}
