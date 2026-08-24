import { Hono } from "hono";
import { eq, or, like, sql, and, asc, desc, ne, inArray } from "drizzle-orm";
import { desa, kelompok, users, generus, mandiri, organisasiPengurus, saranMasukan, timGambuh, kegiatan, absensi } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; APP_ENCRYPTION_KEY?: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

function isAdminRole(role: string) { return ["admin", "pengurus_daerah", "kmm_daerah"].includes(role); }

// ── desa ──
r.get("/desa", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  const data = await db.select().from(desa).orderBy(desa.nama);
  return c.json(data);
});
r.post("/desa", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { nama } = await c.req.json().catch(() => ({} as any));
  if (!nama) return c.json({ error: "Nama wajib diisi" }, 400);
  const db = getDb(c.env);
  await db.insert(desa).values({ nama });
  return c.json({ success: true });
});
r.put("/desa", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { id, nama } = await c.req.json().catch(() => ({} as any));
  if (!id || !nama) return c.json({ error: "ID dan nama wajib diisi" }, 400);
  const db = getDb(c.env);
  await db.update(desa).set({ nama }).where(eq(desa.id, Number(id)));
  return c.json({ success: true });
});
r.delete("/desa", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.query("id");
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const desaId = Number(id);
  const db = getDb(c.env);
  const generusInDesa = await db.select({ id: generus.id }).from(generus).where(eq(generus.desaId, desaId));
  const generusIds = generusInDesa.map((g: any) => g.id);
  if (generusIds.length) await db.delete(absensi).where(inArray(absensi.generusId, generusIds));
  const kegiatanInDesa = await db.select({ id: kegiatan.id }).from(kegiatan).where(eq(kegiatan.desaId, desaId));
  const kegiatanIds = kegiatanInDesa.map((k: any) => k.id);
  if (kegiatanIds.length) await db.delete(absensi).where(inArray(absensi.kegiatanId, kegiatanIds));
  await db.delete(generus).where(eq(generus.desaId, desaId));
  await db.delete(kegiatan).where(eq(kegiatan.desaId, desaId));
  await db.delete(kelompok).where(eq(kelompok.desaId, desaId));
  await db.delete(desa).where(eq(desa.id, desaId));
  return c.json({ success: true });
});

// ── kelompok ──
r.get("/kelompok", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  const data = await db.select({ id: kelompok.id, nama: kelompok.nama, desaId: kelompok.desaId, desaNama: desa.nama }).from(kelompok).leftJoin(desa, eq(kelompok.desaId, desa.id)).orderBy(kelompok.nama);
  return c.json(data);
});
r.post("/kelompok", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { nama, desaId } = await c.req.json().catch(() => ({} as any));
  if (!nama || !desaId) return c.json({ error: "Nama dan desaId wajib diisi" }, 400);
  const db = getDb(c.env);
  await db.insert(kelompok).values({ nama, desaId: Number(desaId) });
  return c.json({ success: true });
});
r.put("/kelompok", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { id, nama, desaId } = await c.req.json().catch(() => ({} as any));
  if (!id || !nama || !desaId) return c.json({ error: "ID, nama, dan desaId wajib diisi" }, 400);
  const db = getDb(c.env);
  await db.update(kelompok).set({ nama, desaId: Number(desaId) }).where(eq(kelompok.id, Number(id)));
  return c.json({ success: true });
});
r.delete("/kelompok", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.query("id");
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const kelompokId = Number(id);
  const db = getDb(c.env);
  const generusInKel = await db.select({ id: generus.id }).from(generus).where(eq(generus.kelompokId, kelompokId));
  const gids = generusInKel.map((g: any) => g.id);
  if (gids.length) await db.delete(absensi).where(inArray(absensi.generusId, gids));
  const kegiatanInKel = await db.select({ id: kegiatan.id }).from(kegiatan).where(eq(kegiatan.kelompokId, kelompokId));
  const kids = kegiatanInKel.map((k: any) => k.id);
  if (kids.length) await db.delete(absensi).where(inArray(absensi.kegiatanId, kids));
  await db.delete(generus).where(eq(generus.kelompokId, kelompokId));
  await db.delete(kegiatan).where(eq(kegiatan.kelompokId, kelompokId));
  await db.delete(kelompok).where(eq(kelompok.id, kelompokId));
  return c.json({ success: true });
});

// ── users ──
r.get("/users", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const search = (c.req.query("search") || "").trim();
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;
  const roleParam = c.req.query("role");
  const db = getDb(c.env);
  const conditions: any[] = [];
  if (search) conditions.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)));
  if (roleParam) conditions.push(eq(users.role, roleParam as any));
  const desaIdParam = c.req.query("desaId");
  if (desaIdParam) conditions.push(eq(users.desaId, Number(desaIdParam)));
  const kelompokIdParam = c.req.query("kelompokId");
  if (kelompokIdParam) conditions.push(eq(users.kelompokId, Number(kelompokIdParam)));
  const whereClause = conditions.length ? and(...conditions) : undefined;
  if (c.req.query("all") === "true") {
    const data = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, desaNama: desa.nama, kelompokNama: kelompok.nama }).from(users).leftJoin(generus, eq(users.generusId, generus.id)).leftJoin(desa, eq(users.desaId, desa.id)).leftJoin(kelompok, eq(users.kelompokId, kelompok.id)).where(whereClause).orderBy(users.name);
    return c.json({ data, total: data.length, page: 1, limit: data.length });
  }
  const data = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, desaId: users.desaId, kelompokId: users.kelompokId, createdAt: users.createdAt }).from(users).where(whereClause).orderBy(users.name).limit(limit).offset(offset);
  const countRes: any = await db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause);
  return c.json({ data, total: Number(countRes[0]?.count || 0), page, limit });
});
r.post("/users", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { name, email, password, role, desaId, kelompokId } = await c.req.json().catch(() => ({} as any));
  if (!name || !email || !password || !role) return c.json({ error: "Nama, email, password, dan role wajib diisi" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.query.users.findFirst({ where: eq(users.email, String(email).toLowerCase()) });
  if (existing) return c.json({ error: "Email sudah terdaftar" }, 409);
  let passwordHash: string;
  try { const bcrypt = await import("bcryptjs"); passwordHash = (bcrypt as any).hashSync(password, 12); } catch { passwordHash = String(password); }
  let passwordPlain: string | null = null;
  try { const { encryptPasswordSymmetric } = await import("../services/crypto"); passwordPlain = await encryptPasswordSymmetric(c.env, String(password)); } catch {}
  const id = crypto.randomUUID();
  let generusId: string | null = null;
  if (["generus", "kelompok", "desa", "pengurus_daerah", "usia_mandiri"].includes(role)) {
    generusId = crypto.randomUUID();
    const prefix = role === "generus" ? "G" : "P";
    const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    await db.insert(generus).values({ id: generusId, nomorUnik, nama: name, jenisKelamin: "L", kategoriUsia: "SMA", desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, isGenerus: 1 } as any);
  }
  await db.insert(users).values({ id, name, email: String(email).toLowerCase(), passwordHash, passwordPlain, role: role as any, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, generusId: generusId as any } as any);
  return c.json({ success: true });
});
r.put("/users", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const { id, role, desaId, kelompokId, name, email, password } = await c.req.json().catch(() => ({} as any));
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return c.json({ error: "User tidak ditemukan" }, 404);
  const updatePayload: any = {};
  if (role) updatePayload.role = role;
  if (desaId !== undefined) updatePayload.desaId = desaId ? Number(desaId) : null;
  if (kelompokId !== undefined) updatePayload.kelompokId = kelompokId ? Number(kelompokId) : null;
  if (name) updatePayload.name = name;
  if (email) updatePayload.email = String(email).toLowerCase();
  if (password) {
    try { const bcrypt = await import("bcryptjs"); updatePayload.passwordHash = (bcrypt as any).hashSync(String(password), 12); } catch { updatePayload.passwordHash = String(password); }
    try { const { encryptPasswordSymmetric } = await import("../services/crypto"); updatePayload.passwordPlain = await encryptPasswordSymmetric(c.env, String(password)); } catch {}
  }
  await db.update(users).set(updatePayload).where(eq(users.id, id));
  return c.json({ success: true });
});
r.delete("/users", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.query("id");
  const role = c.req.query("role");
  const db = getDb(c.env);
  if (id) await db.delete(users).where(eq(users.id, id));
  else if (role) await db.delete(users).where(eq(users.role, role as any));
  else return c.json({ error: "ID atau Role diperlukan" }, 400);
  return c.json({ success: true });
});

// ── pengurus ──
const PENGURUS_ADMIN_LEVEL_ORDER: Record<string, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 }
function pengurusAllowedLevels(v: unknown) { return ["pimpinan", "sekretariat", "bidang", "koordinator"].includes(String(v)); }
r.get("/pengurus", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  const rows: any[] = await db.select().from(organisasiPengurus);
  rows.sort((a: any, b: any) => {
    const la = PENGURUS_ADMIN_LEVEL_ORDER[a.level ?? "bidang"] ?? 2
    const lb = PENGURUS_ADMIN_LEVEL_ORDER[b.level ?? "bidang"] ?? 2
    if (la !== lb) return la - lb
    const ua = Number(a.urutan ?? 0), ub = Number(b.urutan ?? 0)
    if (ua !== ub) return ua - ub
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
  });
  return c.json(rows);
});
r.post("/pengurus", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({} as any));
  const { nama, dapukan, foto, urutan, level, bio, kontakWa } = body;
  if (!nama || !dapukan) return c.json({ error: "Nama dan dapukan wajib diisi" }, 400);
  if (level != null && level !== "" && !pengurusAllowedLevels(level)) return c.json({ error: "Level tidak valid" }, 400);
  const id = crypto.randomUUID();
  const db = getDb(c.env);
  await db.insert(organisasiPengurus).values({ id, nama, dapukan, foto: foto || null, level: (level && pengurusAllowedLevels(level) ? level : "bidang") as any, bio: bio || null, kontakWa: kontakWa || null, urutan: urutan !== undefined ? Number(urutan) : 0 } as any);
  return c.json({ success: true, id });
});
r.put("/pengurus", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({} as any));
  const { id, nama, dapukan, foto, urutan, level, bio, kontakWa } = body;
  if (!id || !nama || !dapukan) return c.json({ error: "ID, nama, dan dapukan wajib diisi" }, 400);
  if (level != null && level !== "" && !pengurusAllowedLevels(level)) return c.json({ error: "Level tidak valid" }, 400);
  const db = getDb(c.env);
  await db.update(organisasiPengurus).set({ nama, dapukan, foto: foto || null, level: (level && pengurusAllowedLevels(level) ? level : "bidang") as any, bio: bio || null, kontakWa: kontakWa || null, urutan: urutan !== undefined ? Number(urutan) : 0, updatedAt: new Date().toISOString() } as any).where(eq(organisasiPengurus.id, id));
  return c.json({ success: true });
});
r.delete("/pengurus", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.query("id");
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const db = getDb(c.env);
  await db.delete(organisasiPengurus).where(eq(organisasiPengurus.id, id));
  return c.json({ success: true });
});

// ── saran ──
r.get("/saran", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env);
  const data = await db.select().from(saranMasukan).where(ne(saranMasukan.untuk, "Romantic Room")).orderBy(saranMasukan.createdAt);
  return c.json([...data].reverse());
});
r.delete("/saran", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.query("id");
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const db = getDb(c.env);
  await db.delete(saranMasukan).where(eq(saranMasukan.id, id));
  return c.json({ success: true });
});

// ── tim-gambuh ──
r.get("/tim-gambuh", async (c) => {
  const db = getDb(c.env);
  const data = await db.select().from(timGambuh).where(eq(timGambuh.tipe, "PNKB" as any));
  return c.json(data);
});
r.post("/tim-gambuh", requireAuth(), async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, umur, kegiatanId, daerahId, desaId, kelompokId, noTelp, foto } = body;
  if (!nama) return c.json({ error: "Nama wajib diisi" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  await db.insert(timGambuh).values({ id, nama, umur: umur ? Number(umur) : null, kegiatanId: kegiatanId || null, daerahId: daerahId ? Number(daerahId) : null, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, tipe: "PNKB", noTelp: noTelp || null, foto: foto || null } as any);
  return c.json({ success: true, id });
});
r.get("/tim-gambuh/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.timGambuh.findFirst({ where: eq(timGambuh.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});
r.put("/tim-gambuh/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.update(timGambuh).set({ ...body, updatedAt: new Date().toISOString() } as any).where(eq(timGambuh.id, id));
  return c.json({ success: true });
});
r.delete("/tim-gambuh/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(timGambuh).where(eq(timGambuh.id, id));
  return c.json({ success: true });
});

// ── tim-penunggu ── (tipe Tim Penunggu / Penunggu PNKB / Penunggu Ibu Gambuh)
r.get("/tim-penunggu", async (c) => {
  const db = getDb(c.env);
  const data = await db.select().from(timGambuh).where(or(eq(timGambuh.tipe, "Tim Penunggu" as any), eq(timGambuh.tipe, "Penunggu PNKB" as any), eq(timGambuh.tipe, "Penunggu Ibu Gambuh" as any)) as any);
  return c.json(data);
});
r.post("/tim-penunggu", requireAuth(), async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, umur, kegiatanId, daerahId, desaId, kelompokId, tipe, noTelp, foto } = body;
  if (!nama) return c.json({ error: "Nama wajib diisi" }, 400);
  const id = crypto.randomUUID();
  const db = getDb(c.env);
  await db.insert(timGambuh).values({ id, nama, umur: umur ? Number(umur) : null, kegiatanId: kegiatanId || null, daerahId: daerahId ? Number(daerahId) : null, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, tipe: tipe || "Tim Penunggu", noTelp: noTelp || null, foto: foto || null } as any);
  return c.json({ success: true, id });
});
r.get("/tim-penunggu/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.timGambuh.findFirst({ where: eq(timGambuh.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});
r.put("/tim-penunggu/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.update(timGambuh).set({ ...body, updatedAt: new Date().toISOString() } as any).where(eq(timGambuh.id, id));
  return c.json({ success: true });
});
r.delete("/tim-penunggu/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(timGambuh).where(eq(timGambuh.id, id));
  return c.json({ success: true });
});

export default r;
