import { SignJWT, jwtVerify } from "jose";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { isTokenRevoked, revokeToken } from "../utils/cache";

export type JWTPayload = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "pengurus_daerah" | "kmm_daerah" | "desa" | "kelompok" | "generus" | "peserta" | "creator" | "tim_pnkb" | "admin_romantic_room" | "admin_keuangan" | "admin_kegiatan" | "admin_pdkt" | "usia_mandiri" | "pending" | "tim_pnkb_gambuh" | "admin_daerah" | "admin_desa" | "admin_kelompok";
  desaId: number | null;
  kelompokId: number | null;
  mandiriDesaId?: number | null;
  mandiriKelompokId?: number | null;
  generusId?: string | null;
};

function getSecretKey(env: any): Uint8Array {
  const raw = env?.JWT_SECRET || "";
  if (!raw || raw.length < 32) {
    // dev fallback — NEVER deploy without 32+ char secret
    return new TextEncoder().encode("dev-only-fallback-secret-DO-NOT-DEPLOY-THIS-1234");
  }
  return new TextEncoder().encode(raw);
}

export async function createToken(payload: JWTPayload, env: any): Promise<string> {
  return await new SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey(env));
}

export async function verifyToken(token: string, env: any): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(env));
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/** Extract token from cookie `auth-token` or Authorization: Bearer */
export function extractToken(c: Context): string | null {
  const cookieToken = getCookie(c, "auth-token");
  if (cookieToken) return cookieToken;
  const auth = c.req.header("authorization") || c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export async function setSessionCookie(c: Context, payload: JWTPayload, env: any) {
  const token = await createToken(payload, env);
  const isProd = env?.NODE_ENV === "production" || env?.ENV === "production";
  setCookie(c, "auth-token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return token;
}

export async function clearSessionCookie(c: Context) {
  const token = getCookie(c, "auth-token");
  if (token) revokeToken(token);
  deleteCookie(c, "auth-token", { path: "/" });
}

/** Hono middleware: require valid session, set c.set("user", payload) */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);
    if (!token || isTokenRevoked(token)) {
      return c.json({ error: "Unauthorized — sesi tidak valid" }, 401);
    }
    const payload = await verifyToken(token, c.env);
    if (!payload) return c.json({ error: "Unauthorized — token tidak valid" }, 401);
    if (isTokenRevoked(token)) return c.json({ error: "Sesi telah dicabut" }, 401);
    c.set("user", payload);
    c.set("token", token);
    await next();
  };
}

/** Allow if role ∈ allowedRoles, else 403 */
export function requireRole(allowed: JWTPayload["role"][]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    // if requireAuth not run yet, try to load
    if (!user) {
      const token = extractToken(c);
      if (!token || isTokenRevoked(token)) return c.json({ error: "Unauthorized" }, 401);
      const payload = await verifyToken(token, c.env);
      if (!payload) return c.json({ error: "Unauthorized" }, 401);
      c.set("user", payload);
      if (!allowed.includes(payload.role)) return c.json({ error: "Forbidden" }, 403);
      await next();
      return;
    }
    if (!allowed.includes(user.role)) return c.json({ error: "Forbidden — role tidak diizinkan" }, 403);
    await next();
  };
}

/** Optional auth: set user if present, never block */
export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);
    if (token && !isTokenRevoked(token)) {
      const payload = await verifyToken(token, c.env);
      if (payload) c.set("user", payload);
    }
    await next();
  };
}
