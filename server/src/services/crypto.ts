/** Workers-safe AES-GCM via SubtleCrypto — replaces lib/crypto.ts (Node crypto). */
async function getKey(rawKey: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptPasswordSymmetric(env: any, text: string): Promise<string> {
  if (!text) return text;
  try {
    const rawKey = env.APP_ENCRYPTION_KEY || "default-secret-key-must-be-32-chars-long!";
    const key = await getKey(rawKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    const bytes = new Uint8Array(buf);
    const authTag = bytes.slice(bytes.length - 16);
    const encrypted = bytes.slice(0, bytes.length - 16);
    const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${toHex(iv)}:${toHex(authTag)}:${toHex(encrypted)}`;
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
}

export async function decryptPasswordSymmetric(env: any, encryptedData: string | null): Promise<string | null> {
  if (!encryptedData) return null;
  const parts = encryptedData.split(":");
  if (parts.length !== 3) return encryptedData; // backward compat plain
  try {
    const rawKey = env.APP_ENCRYPTION_KEY || "default-secret-key-must-be-32-chars-long!";
    const key = await getKey(rawKey);
    const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
    const iv = fromHex(parts[0]);
    const authTag = fromHex(parts[1]);
    const encrypted = fromHex(parts[2]);
    const combined = new Uint8Array(encrypted.length + authTag.length);
    combined.set(encrypted, 0);
    combined.set(authTag, encrypted.length);
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
    return new TextDecoder().decode(buf);
  } catch (e) {
    console.error("Decryption failed", e);
    return "ENCRYPTED_DATA_LOCKED";
  }
}
