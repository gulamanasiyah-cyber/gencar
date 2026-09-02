import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../shared/schema";
import { haversineM } from "../../shared/validation";
import authRoutes from "./routes/auth";
import generusRoutes from "./routes/generus";
import kegiatanRoutes from "./routes/kegiatan";
import absensiRoutes from "./routes/absensi";
import artikelRoutes from "./routes/artikel";
import beritaRoutes from "./routes/berita";
import statistikRoutes from "./routes/statistik";
import adminRoutes from "./routes/admin";
import rabRoutes from "./routes/rab";
import rundownRoutes from "./routes/rundown";
import miscRoutes from "./routes/misc";
import publicRoutes from "./routes/public";
import cmsRoutes from "./routes/cms";
import { uaBlock, rateLimitAuth, bodyLimit } from "./middleware/security";
import { requireCsrf } from "./middleware/csrf";

type Env = { DB: D1Database; KV?: KVNamespace; R2_BUCKET?: R2Bucket; JWT_SECRET: string; DAERAH_NAMA?: string } & Record<string, unknown>;

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin: string) => (origin ? origin : "*"),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use("/*", uaBlock());
app.use("/*", rateLimitAuth());
app.use("/*", bodyLimit());
app.use("/*", requireCsrf());

app.onError((err, c) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  console.error("[onError]", msg);
  // Return JSON even for DELETE — ensure 500 body is readable
  try {
    return c.json({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined }, 500);
  } catch {
    return c.text(`onError: ${msg}`, 500);
  }
});

app.get("/api/health", (c) => c.json({ ok: true, daerah: (c.env.DAERAH_NAMA as string) || "Cengkareng" }));

function db(c: any) { return drizzle(c.env.DB, { schema }); }

// ── Auth (no prefix auth needed — mounted at /api/auth) ──
app.route("/api/auth", authRoutes);

// ── Core domain routes ──
app.route("/api/generus", generusRoutes);
app.route("/api/kegiatan", kegiatanRoutes);
app.route("/api/absensi", absensiRoutes);
app.route("/api/artikel", artikelRoutes);
app.route("/api/berita", beritaRoutes);
app.route("/api/statistik", statistikRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/rab", rabRoutes);
app.route("/api/rundown", rundownRoutes);
app.route("/api/public", publicRoutes);
app.route("/api/cms", cmsRoutes);
// misc hosts /api/scanner, /api/sholat, /api/upload, /api/download, /api/images, /api/dashboard/stats, /api/settings, /api/profile, /api/fcm, /api/webhook
app.route("/api", miscRoutes);

// ── Magic link (Buka Akses Login) — 15 menit, sekali pakai ──
app.post("/api/auth/magic/generate", async (c) => {
  // Admin-only: require valid session
  const { extractToken, verifyToken } = await import("./middleware/auth");
  const token = extractToken(c);
  const payload: any = token ? await verifyToken(token, c.env) : null;
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  const role = String(payload.role ?? "").toLowerCase();
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(role)) return c.json({ error: "Hanya admin dapat membuat magic link" }, 403);

  const { generusId } = await c.req.json().catch(() => ({} as any));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  // Pastikan generus ada
  const exists: any = await (c.env.DB as any).prepare("SELECT id FROM generus WHERE id = ?").bind(String(generusId)).first();
  if (!exists) return c.json({ error: "Generus tidak ditemukan" }, 404);
  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const d = db(c);
  await d.insert(schema.magicTokens).values({ id: crypto.randomUUID(), generusId: String(generusId), email: String(generusId), tokenHash: hash, expiresAt } as any);
  return c.json({ token: rawToken, expiresAt });
});

app.get("/api/auth/magic/verify", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "token wajib" }, 400);
  const hash = await sha256(token);
  const found: any = await (c.env.DB as any).prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);
  // Verify only — do not consume yet; consumption happens on set-password
  return c.json({ ok: true, generusId: found.generus_id, expiresAt: found.expires_at });
});

app.post("/api/auth/magic/set-password", async (c) => {
  const { token, password } = await c.req.json().catch(() => ({} as any));
  if (!token || !password) return c.json({ error: "Token dan password wajib" }, 400);
  if (String(password).length < 8) return c.json({ error: "Password minimal 8 karakter" }, 400);
  const hash = await sha256(String(token));
  const found: any = await (c.env.DB as any).prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);
  const generusId = String(found.generus_id);
  const dbInst = db(c);
  const { users } = schema;
  const { eq } = await import("drizzle-orm");
  const user: any = await dbInst.query.users.findFirst({ where: eq(users.generusId, generusId) });
  if (!user) return c.json({ error: "User untuk generus ini tidak ditemukan. Hubungi admin." }, 404);
  let passwordHash: string;
  try {
    const bcrypt: any = await import("bcryptjs");
    passwordHash = bcrypt.hashSync(String(password), 12);
  } catch { passwordHash = String(password); }
  let passwordPlain: string | null = null;
  try {
    const { encryptPasswordSymmetric } = await import("./services/crypto");
    passwordPlain = await encryptPasswordSymmetric(c.env as any, String(password));
  } catch {}
  await dbInst.update(users).set({ passwordHash, passwordPlain } as any).where(eq(users.id, user.id));
  await (c.env.DB as any).prepare("UPDATE magic_tokens SET consumed_at = datetime('now') WHERE token_hash = ?").bind(hash).run();
  // Auto-login: create session cookie
  const { setSessionCookie } = await import("./middleware/auth");
  const { setCsrfCookie } = await import("./middleware/csrf");
  const bearer = await setSessionCookie(c, { userId: user.id, email: user.email, name: user.name, role: user.role, desaId: user.desaId, kelompokId: user.kelompokId, generusId: user.generusId } as any, c.env);
  setCsrfCookie(c);
  return c.json({ success: true, token: bearer });
});

app.post("/api/absensi/scan", async (c) => {
  const { qrToken, lat, lng, accuracy, generusId } = await c.req.json().catch(() => ({} as any));
  if (!qrToken || !generusId) return c.json({ error: "qrToken & generusId wajib" }, 400);
  const qr: any = await (c.env.DB as any).prepare("SELECT * FROM wilayah_qr WHERE qr_token = ?").bind(qrToken).first();
  if (!qr) return c.json({ error: "QR tidak dikenal" }, 404);
  const today = new Date().toISOString().slice(0, 10);
  let kegs: any[] = [];
  if (qr.level === "daerah") kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id IS NULL AND kelompok_id IS NULL").bind(today).all().then((r: any) => r.results || []);
  else if (qr.level === "desa") kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id = ? AND kelompok_id IS NULL").bind(today, qr.desa_id).all().then((r: any) => r.results || []);
  else kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND kelompok_id = ?").bind(today, qr.kelompok_id).all().then((r: any) => r.results || []);
  if (kegs.length === 0) return c.json({ error: "Tidak ada kegiatan aktif di wilayah ini", kegiatan: [] }, 404);
  if (kegs.length === 1) {
    const k = kegs[0];
    const gps = gpsCheck(k, lat, lng, accuracy);
    if (!gps.ok && k.gps_required) return c.json({ error: gps.reason, kegiatanId: k.id }, 403);
    return c.json({ ok: true, kegiatanId: k.id, gps, needPick: false });
  }
  const filtered = kegs.filter((k: any) => {
    if (k.lat == null || k.lng == null || lat == null || lng == null) return true;
    const d = haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng));
    return d <= (Number(k.radius_m) || 100) + 10;
  });
  if (filtered.length === 0) return c.json({ error: "Tidak ada kegiatan dalam radius GPS", kegiatan: kegs }, 404);
  if (filtered.length === 1) {
    const k = filtered[0];
    const gps = gpsCheck(k, lat, lng, accuracy);
    if (!gps.ok && k.gps_required) return c.json({ error: gps.reason, kegiatanId: k.id }, 403);
    return c.json({ ok: true, kegiatanId: k.id, gps, needPick: false });
  }
  const withGps = filtered.map((k: any) => ({ ...k, _gps: gpsCheck(k, lat, lng, accuracy), _distanceM: k.lat != null && lat != null ? Math.round(haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng))) : null }));
  return c.json({ needPick: true, kegiatan: withGps });
});

function gpsCheck(k: any, lat: any, lng: any, accuracy: any) {
  if (k.lat == null || k.lng == null) return { ok: true, reason: null };
  if (lat == null || lng == null) return { ok: true, reason: "GPS tidak tersedia — advisory" };
  if (accuracy != null && Number(accuracy) > 100) return { ok: false, reason: "Akurasi GPS buruk (>100m)" };
  const d = haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng));
  const radius = Number(k.radius_m) || 100;
  if (d > radius + 10) return { ok: false, reason: `Di luar radius (${Math.round(d)}m > ${radius}m)` };
  return { ok: true, reason: null, distanceM: Math.round(d) };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default app;
