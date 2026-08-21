import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../shared/schema";
import { haversineM } from "../shared/validation";

type Env = { DB: D1Database; KV?: KVNamespace; JWT_SECRET: string; DAERAH_NAMA?: string } & Record<string, unknown>;

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({ origin: (o) => o || "*", credentials: true, allowHeaders: ["Content-Type", "Authorization"] }));

app.get("/api/health", (c) => c.json({ ok: true, daerah: c.env.DAERAH_NAMA || "Cengkareng" }));

// ── Helpers ──
function db(c: any) { return drizzle(c.env.DB, { schema }); }

// POST /api/auth/magic/generate — admin generate link 30m
app.post("/api/auth/magic/generate", async (c) => {
  const { generusId } = await c.req.json().catch(() => ({}));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const d = db(c);
  await d.insert(schema.magicTokens).values({ id: crypto.randomUUID(), generusId, email: generusId, tokenHash: hash, expiresAt });
  // caller should send link via WA/email: /auth/magic?token=TOKEN
  return c.json({ token, expiresAt });
});

app.get("/api/auth/magic/verify", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "token wajib" }, 400);
  const hash = await sha256(token);
  const d = db(c);
  const row = await d.select().from(schema.magicTokens).where((eq: any) => eq).then((r: any) => r[0]).catch(() => null);
  // Simplified check — full verify via D1 query by tokenHash
  const found = await c.env.DB.prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first<any>();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);
  await c.env.DB.prepare("UPDATE magic_tokens SET consumed_at = datetime('now') WHERE token_hash = ?").bind(hash).run();
  // TODO: issue JWT cookie via jose (reuse lib/auth logic di worker)
  return c.json({ ok: true, generusId: found.generus_id });
});

// POST /api/absensi/scan — QR wilayah statis + GPS + modal multi-kegiatan
app.post("/api/absensi/scan", async (c) => {
  const { qrToken, lat, lng, accuracy, generusId } = await c.req.json().catch(() => ({}));
  if (!qrToken || !generusId) return c.json({ error: "qrToken & generusId wajib" }, 400);
  const qr = await c.env.DB.prepare("SELECT * FROM wilayah_qr WHERE qr_token = ?").bind(qrToken).first<any>();
  if (!qr) return c.json({ error: "QR tidak dikenal" }, 404);

  // Cari kegiatan aktif pada level QR (hari ini)
  const today = new Date().toISOString().slice(0, 10);
  let kegs: any[] = [];
  if (qr.level === "daerah") {
    kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id IS NULL AND kelompok_id IS NULL").bind(today).all().then((r: any) => r.results || []);
  } else if (qr.level === "desa") {
    kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id = ? AND kelompok_id IS NULL").bind(today, qr.desa_id).all().then((r: any) => r.results || []);
  } else {
    kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND kelompok_id = ?").bind(today, qr.kelompok_id).all().then((r: any) => r.results || []);
  }
  if (kegs.length === 0) return c.json({ error: "Tidak ada kegiatan aktif di wilayah ini", kegiatan: [] }, 404);
  if (kegs.length === 1) {
    const k = kegs[0];
    const gps = gpsCheck(k, lat, lng, accuracy);
    if (!gps.ok && k.gps_required) return c.json({ error: gps.reason, kegiatanId: k.id }, 403);
    return c.json({ ok: true, kegiatanId: k.id, gps, needPick: false });
  }
  // 2+ → filter GPS dulu, yang jauh dibuang
  const filtered = kegs.filter((k) => {
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
  // 2+ setelah filter → modal pilih
  const withGps = filtered.map((k) => ({
    ...k,
    _gps: gpsCheck(k, lat, lng, accuracy),
    _distanceM: k.lat != null && lat != null ? Math.round(haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng))) : null,
  }));
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
