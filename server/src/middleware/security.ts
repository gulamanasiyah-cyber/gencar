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
      const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
      const { success } = checkRateLimit(ip, limit, windowMs);
      if (!success) return c.json({ error: "Terlalu banyak percobaan. Coba lagi setelah 1 menit." }, 429);
    }
    await next();
  };
}

export function bodyLimit(maxBytes = 10 * 1024 * 1024) {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    // Allow up to 10MB for file upload routes, 1MB for regular JSON APIs
    const isUploadRoute = path.startsWith("/api/upload") || path.startsWith("/api/import");
    const allowedLimit = isUploadRoute ? 10 * 1024 * 1024 : 1 * 1024 * 1024;

    const len = c.req.header("content-length");
    if (len) {
      const n = parseInt(len, 10);
      if (Number.isFinite(n) && n > allowedLimit) {
        return c.json({ error: `Payload terlalu besar (maks ${isUploadRoute ? "10MB" : "1MB"})` }, 413);
      }
    }
    // Note: chunked / no content-length is enforced by Workerd runtime limit;
    // do NOT clone+arrayBuffer here — it consumes the request stream and breaks
    // downstream c.req.json()/parseBody() with "Body already used".
    await next();
  };
}

// Pesan error DB (drizzle "Failed query: ...", D1_ERROR, SQLITE_*) tidak boleh sampai ke UI.
const SQL_LEAK = /Failed query|D1_ERROR|SQLITE_|\bselect\b[\s\S]*\bfrom\b|\binsert into\b|\bupdate\b[\s\S]*\bset\b|\bdelete from\b|no such (table|column)|constraint failed/i;

export function hideDbErrors() {
  return async (c: Context, next: Next) => {
    await next();
    if (c.res.status < 400 || !c.res.headers.get("content-type")?.includes("json")) return;
    const body: any = await c.res.clone().json().catch(() => null);
    const msg = body?.error ?? body?.message;
    if (typeof msg !== "string" || !SQL_LEAK.test(msg)) return;
    console.error("[db-error]", new URL(c.req.url).pathname, msg);
    const status = c.res.status;
    c.res = undefined;
    c.res = c.json({ error: status >= 500 ? "Terjadi kesalahan pada server" : "Permintaan tidak dapat diproses" }, status as any);
  };
}
