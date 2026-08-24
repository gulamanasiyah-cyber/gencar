import type { Context, Next } from "hono";
import { checkRateLimit } from "../utils/cache";

const BLOCKED_UA = /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|hydra|acunetix|nessus|openvas|nuclei/i;

export function uaBlock() {
  return async (c: Context, next: Next) => {
    const ua = c.req.header("user-agent") || "";
    if (BLOCKED_UA.test(ua)) return c.text("Forbidden", 403);
    await next();
  };
}

export function rateLimitAuth(limit = 10, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
      const { success } = checkRateLimit(ip, limit, windowMs);
      if (!success) return c.json({ error: "Terlalu banyak percobaan. Coba lagi setelah 1 menit." }, 429);
    }
    await next();
  };
}

export function bodyLimit(maxBytes = 1 * 1024 * 1024) {
  return async (c: Context, next: Next) => {
    const len = c.req.header("content-length");
    if (c.req.method === "POST" && len && parseInt(len) > maxBytes) {
      return c.json({ error: "Payload terlalu besar (maks 1MB)" }, 413);
    }
    await next();
  };
}
