import { SignJWT, jwtVerify } from "jose";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { isTokenRevoked, revokeToken } from "../utils/cache";

export type JWTPayload = {
  userId: string;
  email: string;
  name: string;
  role: "admin_daerah" | "admin_desa" | "admin_kelompok" | "generus";
  desaId: number | null;
  kelompokId: number | null;
  generusId?: string | null;
};

function getSecretKey(env: any): Uint8Array {
  // Prefer JWT_SECRET; if absent locally (wrangler dev), derive stable dev key from DB id / DAERAH so
  // signing and verification use the same fallback. Never rely on empty — it would vary per worker reload.
  const raw = String(env?.JWT_SECRET ?? env?.DAERAH_NAMA ?? "").trim();
  const fallback = `dev-gencar-fallback-${String(env?.DAERAH_NAMA ?? "Cengkareng")}-DO-NOT-DEPLOY-`;
  const prod = env?.NODE_ENV === "production" || env?.ENV === "production";
  if (!raw || raw.length < 16) {
    if (prod) throw new Error("JWT_SECRET wajib 16+ karakter di production");
    return new TextEncoder().encode(fallback);
  }
  if (raw.length < 32 && prod) throw new Error("JWT_SECRET wajib 32+ karakter di production");
  return new TextEncoder().encode(raw.length >= 16 ? raw : fallback);
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
