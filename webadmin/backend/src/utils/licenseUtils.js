import crypto from "crypto";

function requireSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be set to a unique value of at least 32 characters`);
  }
  return value;
}

// A fallback committed to Git is public and cannot be used as a secret.
const ENCRYPTION_KEY = requireSecret("LICENSE_SECRET_KEY");
const LOOKUP_PEPPER = requireSecret("LICENSE_LOOKUP_PEPPER");
const ALGORITHM = "aes-256-cbc";


/**
 * Normalize key to uppercase alphanumeric only
 */
export function normalizeKeyCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Generate a random 12-character license key (Formatted as XXXX-XXXX-XXXX)
 */
export function generateLicenseKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 12; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    raw += chars[index];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/**
 * Format key string to 12-character XXXX-XXXX-XXXX standard format
 */
export function ensureKeyFormat(value) {
  const normalized = normalizeKeyCode(value);
  if (!normalized) return "";

  const chunks = normalized.match(/.{1,4}/g) || [];
  return chunks.join("-");
}

/**
 * Encrypt plain text key using AES-256-CBC for database storage
 */
export function encryptKey(plainTextKey) {
  if (!plainTextKey) return "";
  const cleanKey = ensureKeyFormat(plainTextKey) || String(plainTextKey).trim().toUpperCase();
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(cleanKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `enc:${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt database cipher text key back to normal plain text key for UI display
 */
export function decryptKey(cipherText) {
  if (!cipherText) return "";
  const str = String(cipherText).trim();
  if (!str.startsWith("enc:")) {
    return str;
  }
  try {
    const parts = str.split(":");
    if (parts.length < 3 || !parts[1] || parts[1].length !== 32) {
      return str;
    }
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2] || "";
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return str;
  }
}

/**
 * Build a deterministic, server-peppered lookup hash from a plain-text key.
 * Used to replace O(n) decrypt-each-row scans with a single indexed lookup.
 * Output is always a 64-char lowercase hex string (SHA-256 digest).
 */
export function hashKeyForLookup(plainKey) {
  const norm = normalizeKeyCode(plainKey);
  if (!norm) return "";
  const payload = `${LOOKUP_PEPPER}:${norm}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
