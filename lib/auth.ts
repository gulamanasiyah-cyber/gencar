import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET_RAW = process.env.JWT_SECRET;

// ── Fail loudly if secret is missing or too weak ──
if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[FATAL] JWT_SECRET must be set and at least 32 characters in production. " +
      "Generate one with: openssl rand -base64 48"
    );
  } else {
    console.warn(
      "[AUTH] WARNING: JWT_SECRET is missing or weak. " +
      "Using dev fallback. NEVER deploy this to production!"
    );
  }
}

const SECRET_KEY = new TextEncoder().encode(
  JWT_SECRET_RAW || "dev-only-fallback-secret-DO-NOT-DEPLOY-THIS-1234"
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "pengurus_daerah" | "kmm_daerah" | "desa" | "kelompok" | "generus" | "peserta" | "creator" | "tim_pnkb" | "admin_romantic_room" | "admin_keuangan" | "admin_kegiatan" | "admin_pdkt" | "usia_mandiri" | "pending" | "tim_pnkb_gambuh";
  desaId: number | null;
  kelompokId: number | null;
  mandiriDesaId?: number | null;
  mandiriKelompokId?: number | null;
  generusId?: string | null;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ["HS256"] });
    // Token tujuan khusus (mis. reset password) tidak boleh dipakai sebagai sesi login
    if ((payload as any).purpose) return null;
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

async function fingerprint(passwordHash: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passwordHash));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token reset password: berlaku 30 menit, sekali pakai (terikat ke hash password saat ini). */
export async function createResetToken(userId: string, passwordHash: string): Promise<string> {
  return await new SignJWT({ purpose: "pwd-reset", uid: userId, pv: await fingerprint(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(SECRET_KEY);
}

export async function verifyResetToken(token: string): Promise<{ userId: string; pv: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ["HS256"] });
    if (payload.purpose !== "pwd-reset" || typeof payload.uid !== "string" || typeof payload.pv !== "string") return null;
    return { userId: payload.uid, pv: payload.pv };
  } catch {
    return null;
  }
}

export async function resetTokenMatches(pv: string, passwordHash: string): Promise<boolean> {
  return pv === (await fingerprint(passwordHash));
}

export const getSession =async (): Promise<JWTPayload | null> => {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return await verifyToken(token);
};

export async function setSession(payload: JWTPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 1 hari (selaras dengan masa berlaku JWT)
    path: "/",
  });
}

import { revokeToken } from "./cache";

export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (token) {
    revokeToken(token);
  }
  cookieStore.delete("auth-token");
}
