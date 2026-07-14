import crypto from "crypto";

// Mengambil kunci rahasia dari `.env`
// Secara fallback menggunakan key default agar sistem tidak crash jika Lupa Set ENV, 
// NAMUN disarankan Anda menyetel APP_ENCRYPTION_KEY (sepanjang 32 karakter) di .env server!
const ALGORITHM = "aes-256-gcm";
const rawKey = process.env.APP_ENCRYPTION_KEY || "default-secret-key-must-be-32-chars-long!".padEnd(32, "a");

// Memastikan kunci selalu 32 bytes (256 bit) untuk AES-256
const KEY = crypto.createHash("sha256").update(rawKey).digest();

/**
 * Mengenkripsi teks asli menjadi ciphertext tak terbacakan untuk database.
 */
export function encryptPasswordSymmetric(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12); // Initialization Vector unik
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    // Format penggabungan: [iv]:[authTag]:[encryptedMessage]
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption Failed:", err);
    return text;
  }
}

/**
 * Mendeskripsi ciphertext dari database menjadi teks asli untuk Dasbor Admin.
 * NOTE: Memiliki kemampuan BUKAN-ENKRIPSI-LANGKAH-LEWAT (Backward Compatible). 
 * Artinya jika ada file lama berupa rentetan kata sandi teks biasa, sistem tak akan error.
 */
export function decryptPasswordSymmetric(encryptedData: string | null): string | null {
  if (!encryptedData) return null;

  const parts = encryptedData.split(":");
  
  // Backward compatibility: Jika format data lama berupa teks biasa (Plain), lewati dan abaikan.
  if (parts.length !== 3) return encryptedData;

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(ivHex, "hex")
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("Decryption Failed:", err);
    return "ENCRYPTED_DATA_LOCKED"; // Jika salah ENV, jangan bocorkan error
  }
}
