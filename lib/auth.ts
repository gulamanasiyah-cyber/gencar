import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-change-in-production"
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "pengurus_daerah" | "kmm_daerah" | "desa" | "kelompok" | "generus" | "peserta" | "creator" | "tim_pnkb" | "admin_romantic_room" | "admin_keuangan" | "admin_kegiatan" | "admin_pdkt" | "usia_mandiri" | "pending";
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
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function setSession(payload: JWTPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete("auth-token");
}
