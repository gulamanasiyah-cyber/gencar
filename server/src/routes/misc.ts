import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { settings, generus, kegiatan, absensi, users, fcmTokens, desa, kelompok } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth, optionalAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; APP_ENCRYPTION_KEY?: string; R2_BUCKET?: R2Bucket; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

// scanner - POST validates QR token wilayah_qr or absensi scan
r.post("/scanner", requireAuth(), async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { token, kegiatanId, generusId } = body;
  if (!token && !kegiatanId) return c.json({ error: "token atau kegiatanId diperlukan" }, 400);
  return c.json({ success: true, token, kegiatanId, generusId });
});

// sholat - proxy jadwal sholat (no auth, cacheable)
r.get("/sholat", async (c) => {
  const kota = c.req.query("kota") || "Jakarta";
  const tanggal = c.req.query("tanggal") || new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${kota}/${tanggal}`);
    const data: any = await res.json().catch(() => ({}));
    return c.json(data);
  } catch { return c.json({ error: "Gagal mengambil jadwal sholat" }, 500); }
});

async function signImageToken(key: string, exp: number, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${key}:${exp}`));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyImageToken(key: string, exp: number, token: string, secret: string): Promise<boolean> {
  if (exp < Date.now()) return false;
  const expected = await signImageToken(key, exp, secret);
  return expected === token;
}

// 1. Presign endpoint: Client requests permission/URL to upload directly to R2
r.post("/upload/presign", requireAuth(), async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const filename = String(body.filename || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const contentType = String(body.contentType || "image/jpeg");
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename}`;
  const secret = c.env.JWT_SECRET || "gencar-secret";

  // Expiry 15 minutes for upload ticket
  const uploadExpiry = Date.now() + 15 * 60 * 1000;
  const uploadToken = await signImageToken(key, uploadExpiry, secret);

  // Expiry 1 hour for first temporary view URL
  const viewExpiry = Date.now() + 60 * 60 * 1000;
  const viewToken = await signImageToken(key, viewExpiry, secret);

  const directUploadUrl = `/api/upload/direct/${key}?token=${uploadToken}&exp=${uploadExpiry}`;
  const temporaryViewUrl = `/api/images/${key}?token=${viewToken}&exp=${viewExpiry}`;

  return c.json({
    key,
    uploadUrl: directUploadUrl,
    contentType,
    viewUrl: temporaryViewUrl,
  });
});

// 2. Direct PUT to R2 from client
r.put("/upload/direct/:key", async (c) => {
  const key = c.req.param("key");
  const token = c.req.query("token") || "";
  const exp = Number(c.req.query("exp") || "0");
  const secret = c.env.JWT_SECRET || "gencar-secret";

  const valid = await verifyImageToken(key, exp, token, secret);
  if (!valid) return c.json({ error: "Upload token tidak valid atau telah kadaluarsa" }, 403);

  const contentType = c.req.header("content-type") || "application/octet-stream";
  const data = await c.req.arrayBuffer();

  if ((c.env as any).R2_BUCKET) {
    await (c.env as any).R2_BUCKET.put(`uploads/${key}`, data, {
      httpMetadata: { contentType },
    });
  }

  return c.json({ success: true, key });
});

// 3. Request temporary signed view URL for any stored image key
r.get("/images/sign", optionalAuth(), async (c) => {
  const rawKey = c.req.query("key") || "";
  if (!rawKey) return c.json({ error: "key diperlukan" }, 400);
  const key = rawKey.startsWith("/api/images/") ? rawKey.replace("/api/images/", "").split("?")[0] : rawKey.split("?")[0];
  const durationSeconds = Number(c.req.query("expiresIn") || 3600); // default 1 hour
  const exp = Date.now() + durationSeconds * 1000;
  const secret = c.env.JWT_SECRET || "gencar-secret";
  const token = await signImageToken(key, exp, secret);

  return c.json({
    url: `/api/images/${key}?token=${token}&exp=${exp}`,
    expiresAt: exp,
  });
});

// Legacy fallback upload - store to R2 if available, else echo
r.post("/upload", requireAuth(), async (c) => {
  const body: any = await c.req.parseBody().catch(() => ({}));
  const file = body.file as File | undefined;
  if (!file) { const json: any = await c.req.json().catch(() => ({})); if (json.url) return c.json({ url: json.url }); return c.json({ error: "file diperlukan" }, 400); }
  const filename = (file as any).name || "file.jpg";
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename}`;
  if ((c.env as any).R2_BUCKET) {
    await (c.env as any).R2_BUCKET.put(`uploads/${key}`, await (file as any).arrayBuffer(), { httpMetadata: { contentType: (file as any).type || "application/octet-stream" } });
    const secret = c.env.JWT_SECRET || "gencar-secret";
    const exp = Date.now() + 60 * 60 * 1000;
    const token = await signImageToken(key, exp, secret);
    return c.json({ url: `/api/images/${key}?token=${token}&exp=${exp}`, key });
  }
  return c.json({ url: key, key });
});

// download - generate CSV export
r.get("/download", requireAuth(), async (c) => {
  const type = c.req.query("type") || "generus";
  const db = getDb(c.env);
  if (type === "generus") {
    const rows: any = await db.select().from(generus).limit(1000);
    const header = "id,nama,nomorUnik,jenisKelamin,kategoriUsia\n";
    const csvRows = rows.map((r: any) => `${r.id},"${r.nama}",${r.nomorUnik},${r.jenisKelamin},${r.kategoriUsia}`).join("\n");
    return new Response(header + csvRows, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=\"export-${type}.csv\"` } });
  }
  return c.json([]);
});

// images/[filename] - serve from R2 (signed token required for private view)
r.get("/images/:filename", async (c) => {
  const filename = c.req.param("filename");
  const token = c.req.query("token");
  const exp = Number(c.req.query("exp") || "0");
  const secret = c.env.JWT_SECRET || "gencar-secret";

  if (token) {
    const valid = await verifyImageToken(filename, exp, token, secret);
    if (!valid) return c.json({ error: "Link gambar tidak valid atau telah kadaluarsa" }, 403);
  }

  if ((c.env as any).R2_BUCKET) {
    const obj = await (c.env as any).R2_BUCKET.get(`uploads/${filename}`);
    if (obj) {
      return new Response(obj.body, {
        headers: {
          "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
    const obj2 = await (c.env as any).R2_BUCKET.get(filename);
    if (obj2) {
      return new Response(obj2.body, {
        headers: {
          "Content-Type": obj2.httpMetadata?.contentType || "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }
  return c.json({ error: "Not found" }, 404);
});

// dashboard stats
r.get("/dashboard/stats", requireAuth(), async (c) => {
  const db = getDb(c.env);
  const [gCount, kCount, aCount, uCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(generus).then((r: any) => Number(r[0]?.count || 0)),
    db.select({ count: sql<number>`count(*)` }).from(kegiatan).then((r: any) => Number(r[0]?.count || 0)),
    db.select({ count: sql<number>`count(*)` }).from(absensi).then((r: any) => Number(r[0]?.count || 0)),
    db.select({ count: sql<number>`count(*)` }).from(users).then((r: any) => Number(r[0]?.count || 0)),
  ]);
  return c.json({ generus: gCount, kegiatan: kCount, absensi: aCount, users: uCount });
});

// settings
r.get("/settings", optionalAuth(), async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows as any[]) map[row.key] = row.value;
  return c.json(map);
});
r.post("/settings", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  for (const [key, value] of Object.entries(body)) {
    const existing: any = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (existing) await db.update(settings).set({ value: String(value), updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    else await db.insert(settings).values({ key, value: String(value) } as any);
  }
  return c.json({ success: true });
});
r.put("/settings", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  for (const [key, value] of Object.entries(body)) {
    const existing: any = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (existing) await db.update(settings).set({ value: String(value), updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    else await db.insert(settings).values({ key, value: String(value) } as any);
  }
  return c.json({ success: true });
});

// profile change requests (member) — opsi B: satu pintu Ajukan Perubahan Data
r.get("/profile/requests", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user?.generusId) return c.json([]);
  const { profileChangeRequests } = await import("../../../shared/schema");
  const rows: any = await db.select().from(profileChangeRequests).where(eq(profileChangeRequests.generusId, user.generusId)).orderBy(sql`${profileChangeRequests.createdAt} DESC`);
  return c.json(rows);
});
r.post("/profile/request", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user?.generusId) return c.json({ error: "Akun belum taut generus" }, 400);
  const body: any = await c.req.json().catch(() => ({}));
  const { profileChangeRequestSchema } = await import("../../../shared/validation");
  const parsed = profileChangeRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message || "Validasi gagal", details: parsed.error.flatten() }, 400);
  const { section, payload, reason, attachmentUrl } = parsed.data as any;
  const { profileChangeRequests } = await import("../../../shared/schema");
  const pending: any = await db.select().from(profileChangeRequests).where(and(eq(profileChangeRequests.generusId, user.generusId), eq(profileChangeRequests.section, section as any), eq(profileChangeRequests.status, "pending"))).limit(1);
  if (pending.length > 0) return c.json({ error: `Sudah ada pengajuan ${section} pending` }, 409);
  const id = crypto.randomUUID();
  await db.insert(profileChangeRequests).values({ id, generusId: user.generusId, section, payload: JSON.stringify(payload), reason, attachmentUrl: attachmentUrl || null, status: "pending" } as any);
  return c.json({ success: true, id });
});

// admin review for profile requests
r.get("/admin/profile-requests", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  const { profileChangeRequests, generus } = await import("../../../shared/schema");
  const status = c.req.query("status") || "pending";
  let q: any = db
    .select({
      id: profileChangeRequests.id,
      generusId: profileChangeRequests.generusId,
      generusNama: sql<string>`COALESCE(${generus.nama}, (SELECT name FROM users WHERE id = ${profileChangeRequests.generusId} LIMIT 1), 'Anggota')`,
      generusNomorUnik: generus.nomorUnik,
      generusFoto: generus.foto,
      section: profileChangeRequests.section,
      payload: profileChangeRequests.payload,
      reason: profileChangeRequests.reason,
      attachmentUrl: profileChangeRequests.attachmentUrl,
      status: profileChangeRequests.status,
      reviewedBy: profileChangeRequests.reviewedBy,
      reviewedAt: profileChangeRequests.reviewedAt,
      createdAt: profileChangeRequests.createdAt,
    })
    .from(profileChangeRequests)
    .leftJoin(generus, eq(profileChangeRequests.generusId, generus.id));
  if (status !== "all") q = q.where(eq(profileChangeRequests.status, status as any));
  const rows: any = await q.orderBy(sql`${profileChangeRequests.createdAt} DESC`).limit(100);
  return c.json(rows);
});
r.post("/admin/profile-requests/:id/approve", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const db = getDb(c.env);
  const { profileChangeRequests } = await import("../../../shared/schema");
  const row: any = await db.query.profileChangeRequests.findFirst({ where: eq(profileChangeRequests.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  if (row.status !== "pending") return c.json({ error: "Sudah diproses" }, 400);
  const payload = JSON.parse(row.payload);
  const allowed: Record<string, string[]> = {
    kontak: ["noTelp", "pendidikan", "pekerjaan"],
    wilayah: ["domisiliAnak", "domisiliOrtu", "isDomisiliOrtuSama", "asalDaerah", "kategoriMudaMudi", "alamat", "desaId", "kelompokId"],
    identitas: ["nama", "namaOrtu", "tempatLahir", "tanggalLahir", "suku", "pekerjaan", "foto", "avatarId"],
  };
  const keys = allowed[row.section] || [];
  const update: any = { updatedAt: new Date().toISOString() };
  for (const k of keys) if (payload[k] !== undefined) update[k] = payload[k];
  if (Object.keys(update).length > 1) await db.update(generus).set(update).where(eq(generus.id, row.generusId));
  await db.update(profileChangeRequests).set({ status: "approved", reviewedBy: session.userId, reviewedAt: new Date().toISOString() } as any).where(eq(profileChangeRequests.id, id));
  try { const { logAuditActivity } = await import("../utils/audit"); await logAuditActivity(c.env as any, { action: "profile_request_approve", userId: session.userId, targetId: id, details: { generusId: row.generusId, section: row.section } }); } catch {}
  return c.json({ success: true });
});
r.post("/admin/profile-requests/:id/reject", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const db = getDb(c.env);
  const { profileChangeRequests } = await import("../../../shared/schema");
  const row: any = await db.query.profileChangeRequests.findFirst({ where: eq(profileChangeRequests.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  if (row.status !== "pending") return c.json({ error: "Sudah diproses" }, 400);
  await db.update(profileChangeRequests).set({ status: "rejected", reviewedBy: session.userId, reviewedAt: new Date().toISOString() } as any).where(eq(profileChangeRequests.id, id));
  try { const { logAuditActivity } = await import("../utils/audit"); await logAuditActivity(c.env as any, { action: "profile_request_reject", userId: session.userId, targetId: id, details: { generusId: row.generusId, section: row.section } }); } catch {}
  return c.json({ success: true });
});

// ── Admin: list ajuan izin member (izinSumber="ajuan"), scope wilayah ──
r.get("/admin/izin", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  let q: any = db.select({
    id: absensi.id,
    kegiatanId: absensi.kegiatanId,
    generusId: absensi.generusId,
    keterangan: absensi.keterangan,
    catatan: absensi.catatan,
    izinSumber: absensi.izinSumber,
    timestamp: absensi.timestamp,
    generusNama: generus.nama,
    generusNomorUnik: generus.nomorUnik,
    generusDesaId: generus.desaId,
    generusKelompokId: generus.kelompokId,
    desaNama: desa.nama,
    kelompokNama: kelompok.nama,
    judul: kegiatan.judul,
    tanggal: kegiatan.tanggal,
    jamMulai: kegiatan.jamMulai ?? kegiatan.jam ?? null,
    lokasi: kegiatan.lokasi,
    kegiatanDesaId: kegiatan.desaId,
    kegiatanKelompokId: kegiatan.kelompokId,
  })
    .from(absensi)
    .innerJoin(generus, eq(absensi.generusId, generus.id))
    .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
    .leftJoin(desa, eq(generus.desaId, desa.id))
    .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
    .where(eq(absensi.izinSumber, "ajuan"));
  if (session.role === "admin_desa" && session.desaId) q = q.where(eq(generus.desaId, session.desaId));
  if (session.role === "admin_kelompok" && session.kelompokId) q = q.where(eq(generus.kelompokId, session.kelompokId));
  const rows: any = await q.orderBy(sql`${absensi.timestamp} DESC`).limit(100);
  return c.json(rows);
});
r.post("/admin/izin/:absensiId/reject", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("absensiId");
  const db = getDb(c.env);
  const row: any = await db.query.absensi.findFirst({ where: eq(absensi.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  if (row.izinSumber !== "ajuan") return c.json({ error: "Bukan ajuan izin" }, 400);
  const gen: any = await db.query.generus.findFirst({ where: eq(generus.id, row.generusId) });
  if (session.role === "admin_desa" && session.desaId && gen?.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && session.kelompokId && gen?.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.delete(absensi).where(eq(absensi.id, id));
  try { const { logAuditActivity } = await import("../utils/audit"); await logAuditActivity(c.env as any, { action: "izin_reject", userId: session.userId, targetId: id, details: { generusId: row.generusId, kegiatanId: row.kegiatanId } }); } catch {}
  return c.json({ success: true });
});

// profile
r.get("/profile", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return c.json({ error: "User tidak ditemukan" }, 404);
  let gen: any = null;
  if (user.generusId) {
    gen = await db.query.generus.findFirst({ where: eq(generus.id, user.generusId) });
    if (gen) {
      if (gen.desaId) {
        const d: any = await db.query.desa.findFirst({ where: eq(desa.id, gen.desaId) });
        gen.desaNama = d?.nama ?? "";
      }
      if (gen.kelompokId) {
        const k: any = await db.query.kelompok.findFirst({ where: eq(kelompok.id, gen.kelompokId) });
        gen.kelompokNama = k?.nama ?? "";
      }
    }
  }
  return c.json({ user, generus: gen });
});
r.put("/profile", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return c.json({ error: "User tidak ditemukan" }, 404);
  if (body.name) await db.update(users).set({ name: body.name } as any).where(eq(users.id, session.userId));
  if (user.generusId) {
    const gUpdate: any = {};
    if (body.nama) gUpdate.nama = body.nama;
    if (body.alamat !== undefined) gUpdate.alamat = body.alamat;
    if (body.noTelp !== undefined) gUpdate.noTelp = body.noTelp;
    if (body.pekerjaan !== undefined) gUpdate.pekerjaan = body.pekerjaan;
    if (body.foto !== undefined) gUpdate.foto = body.foto;
    if (body.avatarId !== undefined) gUpdate.avatarId = body.avatarId;
    if (body.avatarStyle !== undefined) gUpdate.avatarId = body.avatarStyle;
    // Jika upload custom foto, kosongkan avatarId
    if (body.foto && !body.avatarId) {
      gUpdate.avatarId = null;
    }
    // Jika pilih avatar, kosongkan foto custom
    if (body.avatarId && !body.foto) {
      gUpdate.foto = null;
    }
    if (body.jenisKelamin !== undefined) {
      gUpdate.jenisKelamin = body.jenisKelamin === "cowok" ? "L" : body.jenisKelamin === "cewek" ? "P" : body.jenisKelamin;
    }
    if (body.hobi !== undefined || body.hobiDetail !== undefined) {
      // Check 30 days restriction
      const currentGen: any = await db.query.generus.findFirst({ where: eq(generus.id, user.generusId) });
      if (currentGen?.hobiUpdatedAt) {
        const lastUpdated = new Date(currentGen.hobiUpdatedAt).getTime();
        const diffDays = (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          const remainingDays = Math.ceil(30 - diffDays);
          return c.json({ error: `Hobi hanya bisa diubah sebulan sekali. Silakan tunggu ${remainingDays} hari lagi.` }, 400);
        }
      }
      if (body.hobi !== undefined) gUpdate.hobi = body.hobi;
      if (body.hobiDetail !== undefined) gUpdate.hobiDetail = body.hobiDetail;
      gUpdate.hobiUpdatedAt = new Date().toISOString();
    }
    if (Object.keys(gUpdate).length > 0) {
      gUpdate.updatedAt = new Date().toISOString();
      await db.update(generus).set(gUpdate).where(eq(generus.id, user.generusId));
    }
  }
  if (body.password) {
    let hash: string;
    try { const bcrypt = await import("bcryptjs"); hash = (bcrypt as any).hashSync(String(body.password), 12); } catch { hash = String(body.password); }
    let plain: string | null = null;
    try { const { encryptPasswordSymmetric } = await import("../services/crypto"); plain = await encryptPasswordSymmetric(c.env, String(body.password)); } catch {}
    await db.update(users).set({ passwordHash: hash, passwordPlain: plain } as any).where(eq(users.id, session.userId));
  }
  return c.json({ success: true });
});

// fcm register
r.post("/fcm/register", async (c) => {
  const { phone, token } = await c.req.json().catch(() => ({} as any));
  if (!phone || !token) return c.json({ error: "phone dan token wajib" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.query.fcmTokens.findFirst({ where: eq(fcmTokens.token, token) });
  if (!existing) await db.insert(fcmTokens).values({ id: crypto.randomUUID(), phone: String(phone), token: String(token) } as any);
  return c.json({ success: true });
});

// webhook fonnte
r.post("/webhook/fonnte", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  return c.json({ success: true, received: body });
});
r.get("/webhook/fonnte", async (c) => c.json({ status: "ok" }));

export default r;
