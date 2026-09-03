import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

function isProd(env: unknown): boolean {
  const e = env as Record<string, unknown> | undefined;
  return e?.["NODE_ENV"] === "production" || e?.["ENV"] === "production";
}

export function generateCsrfToken(): string {
  // double-submit token: random + timestamp
  return `${crypto.randomUUID().replace(/-/g, "")}${Date.now().toString(36)}`;
}

export function setCsrfCookie(c: Context, token?: string): string {
  const t = token ?? generateCsrfToken();
  const prod = isProd((c as unknown as { env: unknown }).env);
  setCookie(c, CSRF_COOKIE, t, {
    httpOnly: false,
    secure: prod,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return t;
}

const CSRF_SKIP_PREFIXES = [
  "/api/health",
  "/api/sholat",
  "/api/images",
  "/api/upload/direct",
  "/api/public/",
  "/api/public",
  "/api/webhook",
  "/api/fcm/register",
];

const CSRF_SKIP_EXACT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/desa",
  "/api/auth/kelompok",
  "/api/auth/me",
  "/api/auth/magic/generate",
  "/api/auth/magic/verify",
  "/api/auth/magic/set-password",
]);

function shouldSkipCsrf(path: string, method: string): boolean {
  // Safe methods never require CSRF
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (CSRF_SKIP_EXACT.has(path)) return true;
  for (const p of CSRF_SKIP_PREFIXES) if (path.startsWith(p)) return true;
  return false;
}

export function requireCsrf() {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    const path = new URL(c.req.url).pathname;

    // Ensure cookie exists on safe methods (so FE can read it)
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      const existing = getCookie(c, CSRF_COOKIE);
      if (!existing) setCsrfCookie(c);
      await next();
      return;
    }

    if (shouldSkipCsrf(path, method)) {
      await next();
      return;
    }

    const cookieToken = getCookie(c, CSRF_COOKIE);
    const headerToken = c.req.header(CSRF_HEADER) || c.req.header("X-CSRF-Token") || c.req.header("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return c.json({ error: "CSRF mismatch — refresh halaman dan coba lagi" }, 403);
    }
    await next();
  };
}
