import { Hono } from "hono";
import { eq, or, like, sql, and, asc, desc, ne } from "drizzle-orm";
import { desa, kelompok, users, generus, organisasiPengurus, saranMasukan, kegiatan } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; APP_ENCRYPTION_KEY?: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

function isAdminRole(role: string) { return ["admin_daerah", "admin_desa", "admin_kelompok"].includes(role); }

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
  try {
    const session = c.get("user" as any) as any;
    if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.query("id");
    if (!id) return c.json({ error: "ID diperlukan" }, 400);
    const desaId = Number(id);
    if (!Number.isFinite(desaId) || desaId <= 0) return c.json({ error: "ID tidak valid" }, 400);
    const envDb = (c.env as any).DB as D1Database;
    // Guard: desa harus kosong dari kelompok
    try {
      const r: any = await envDb.prepare("SELECT COUNT(*) as cnt FROM kelompok WHERE desa_id = ?").bind(desaId).first();
      const kelCount = Number(r?.cnt ?? 0);
      if (kelCount > 0) return c.json({ error: `Desa masih memiliki ${kelCount} kelompok — hapus semua kelompok terlebih dahulu` }, 409);
    } catch {}

    const logs: string[] = [];
    const runStep = async (label: string, sql: string) => {
      try {
        const r = await envDb.prepare(sql).bind(desaId).run();
        const ch = (r as any)?.meta?.changes ?? 0;
        logs.push(`${label}: ok (${ch})`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logs.push(`${label}: FAIL - ${msg}`);
        throw new Error(`Step "${label}" gagal: ${msg}`);
      }
    };

    await runStep("del-absensi-by-generus", "DELETE FROM absensi WHERE generus_id IN (SELECT id FROM generus WHERE desa_id = ?)");
    await runStep("del-absensi-by-kegiatan", "DELETE FROM absensi WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE desa_id = ?)");
    await runStep("del-rab", "DELETE FROM rab WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE desa_id = ?)");
    await runStep("del-rab-approval", "DELETE FROM rab_approval WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE desa_id = ?)");
    await runStep("del-rundown", "DELETE FROM rundown WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE desa_id = ?)");
    await runStep("del-rundown-approval", "DELETE FROM rundown_approval WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE desa_id = ?)");
    await runStep("del-kegiatan", "DELETE FROM kegiatan WHERE desa_id = ?");
    await runStep("null-generus", "UPDATE generus SET desa_id = NULL WHERE desa_id = ?");
    await runStep("null-users", "UPDATE users SET desa_id = NULL WHERE desa_id = ?");
    await runStep("del-wilayah-qr", "DELETE FROM wilayah_qr WHERE desa_id = ?");
    await runStep("del-desa", "DELETE FROM desa WHERE id = ?");

    return c.json({ success: true, logs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? String((e as any)?.message ?? e) : String(e);
    return c.json({ error: `Gagal hapus desa: ${msg}` }, 500);
  }
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
  try {
    const session = c.get("user" as any) as any;
    if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.query("id");
    if (!id) return c.json({ error: "ID diperlukan" }, 400);
    const kelompokId = Number(id);
    if (!Number.isFinite(kelompokId) || kelompokId <= 0) return c.json({ error: "ID tidak valid" }, 400);
    const DB = (c.env as any).DB as D1Database;
    if (!DB) return c.json({ error: "DB binding hilang" }, 500);

    const logs: string[] = [];
    const runStep = async (label: string, sql: string) => {
      try {
        const r = await DB.prepare(sql).bind(kelompokId).run();
        const ch = (r as any)?.meta?.changes ?? 0;
        logs.push(`${label}: ok (${ch})`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logs.push(`${label}: FAIL - ${msg}`);
        throw new Error(`Step "${label}" gagal: ${msg}`);
      }
    };

    // 1. Hapus absensi yang referensi generus di kelompok ini
    await runStep("del-absensi-by-generus", "DELETE FROM absensi WHERE generus_id IN (SELECT id FROM generus WHERE kelompok_id = ?)");
    // 2. Hapus absensi dari kegiatan di kelompok ini
    await runStep("del-absensi-by-kegiatan", "DELETE FROM absensi WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE kelompok_id = ?)");
    // 3. Hapus rab/rundown/kegiatan
    await runStep("del-rab", "DELETE FROM rab WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE kelompok_id = ?)");
    await runStep("del-rab-approval", "DELETE FROM rab_approval WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE kelompok_id = ?)");
    await runStep("del-rundown", "DELETE FROM rundown WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE kelompok_id = ?)");
    await runStep("del-rundown-approval", "DELETE FROM rundown_approval WHERE kegiatan_id IN (SELECT id FROM kegiatan WHERE kelompok_id = ?)");
    await runStep("del-kegiatan", "DELETE FROM kegiatan WHERE kelompok_id = ?");
    // 4. Hapus child generus (profile_change_requests, magic_tokens)
    await runStep("del-pcr", "DELETE FROM profile_change_requests WHERE generus_id IN (SELECT id FROM generus WHERE kelompok_id = ?)");
    await runStep("del-magic", "DELETE FROM magic_tokens WHERE generus_id IN (SELECT id FROM generus WHERE kelompok_id = ?)");
    // 5. NULLIFY generus & users — CRITICAL: harus sebelum DELETE kelompok agar CASCADE tidak trigger
    await runStep("null-generus", "UPDATE generus SET kelompok_id = NULL WHERE kelompok_id = ?");
    await runStep("null-users", "UPDATE users SET kelompok_id = NULL WHERE kelompok_id = ?");
    // 6. Hapus wilayah_qr & kelompok
    await runStep("del-wilayah-qr", "DELETE FROM wilayah_qr WHERE kelompok_id = ?");
    await runStep("del-kelompok", "DELETE FROM kelompok WHERE id = ?");

    return c.json({ success: true, logs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? String((e as any)?.message ?? e) : String(e);
    return c.json({ error: `Gagal hapus kelompok: ${msg}` }, 500);
  }
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
  else conditions.push(ne(users.role, "generus"));
  const desaIdParam = c.req.query("desaId");
  if (desaIdParam) conditions.push(eq(users.desaId, Number(desaIdParam)));
  const kelompokIdParam = c.req.query("kelompokId");
  if (kelompokIdParam) conditions.push(eq(users.kelompokId, Number(kelompokIdParam)));
  // Scope enforcement: admin_desa sees own + admin_kelompok in their desa; admin_kelompok sees admin_kelompok in their kelompok
  if (session.role === "admin_desa" && session.desaId) {
    conditions.push(or(
      and(eq(users.role, "admin_desa"), eq(users.desaId, session.desaId)),
      and(eq(users.role, "admin_kelompok"), eq(users.desaId, session.desaId)),
    ));
  } else if (session.role === "admin_kelompok" && session.kelompokId) {
    conditions.push(eq(users.role, "admin_kelompok"));
    conditions.push(eq(users.kelompokId, session.kelompokId));
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  if (c.req.query("all") === "true") {
    const data = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, desaId: users.desaId, kelompokId: users.kelompokId, desaNama: desa.nama, kelompokNama: kelompok.nama }).from(users).leftJoin(generus, eq(users.generusId, generus.id)).leftJoin(desa, eq(users.desaId, desa.id)).leftJoin(kelompok, eq(users.kelompokId, kelompok.id)).where(whereClause).orderBy(users.name);
    return c.json({ data, total: data.length, page: 1, limit: data.length });
  }
  const data = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, desaId: users.desaId, kelompokId: users.kelompokId, createdAt: users.createdAt }).from(users).where(whereClause).orderBy(users.name).limit(limit).offset(offset);
  const countRes: any = await db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause);
  return c.json({ data, total: Number(countRes[0]?.count || 0), page, limit });
});
r.post("/users", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isAdminRole(session.role)) return c.json({ error: "Unauthorized" }, 401);
  let { name, email, password, role, desaId, kelompokId } = await c.req.json().catch(() => ({} as any));
  if (!name || !email || !password || !role) return c.json({ error: "Nama, email, password, dan role wajib diisi" }, 400);
  // Scope enforcement for role assignment
  if (session.role === "admin_desa") {
    if (role !== "admin_kelompok" && role !== "admin_desa") return c.json({ error: "Hanya bisa membuat admin desa atau admin kelompok" }, 403);
    desaId = session.desaId;
    if (role === "admin_kelompok") kelompokId = kelompokId ? Number(kelompokId) : null;
  } else if (session.role === "admin_kelompok") {
    if (role !== "admin_kelompok") return c.json({ error: "Hanya bisa membuat admin kelompok" }, 403);
    kelompokId = session.kelompokId;
    desaId = session.desaId;
  }
  const db = getDb(c.env);
  const existing: any = await db.query.users.findFirst({ where: eq(users.email, String(email).toLowerCase()) });
  if (existing) return c.json({ error: "Email sudah terdaftar" }, 409);
  let passwordHash: string;
  try { const bcrypt = await import("bcryptjs"); passwordHash = (bcrypt as any).hashSync(password, 12); } catch { passwordHash = String(password); }
  let passwordPlain: string | null = null;
  try { const { encryptPasswordSymmetric } = await import("../services/crypto"); passwordPlain = await encryptPasswordSymmetric(c.env, String(password)); } catch {}
  const id = crypto.randomUUID();
  let generusId: string | null = null;
  if (role === "generus") {
    generusId = crypto.randomUUID();
    const nomorUnik = `G-${Math.floor(100000 + Math.random() * 900000)}`;
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
  // Scope enforcement
  if (session.role === "admin_desa") {
    const allowed = (user.role === "admin_desa" && user.desaId === session.desaId)
      || (user.role === "admin_kelompok" && user.desaId === session.desaId);
    if (!allowed) return c.json({ error: "Tidak diizinkan" }, 403);
    if (role && role !== "admin_kelompok" && role !== "admin_desa") return c.json({ error: "Tidak bisa mengubah role" }, 403);
  } else if (session.role === "admin_kelompok") {
    if (user.role !== "admin_kelompok" || user.kelompokId !== session.kelompokId) {
      return c.json({ error: "Tidak diizinkan" }, 403);
    }
    if (role && role !== "admin_kelompok") return c.json({ error: "Tidak bisa mengubah role" }, 403);
  }
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
  if (!id) return c.json({ error: "ID diperlukan" }, 400);
  const db = getDb(c.env);
  const target: any = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return c.json({ error: "User tidak ditemukan" }, 404);
  // Self-delete prevention
  if (id === session.id) return c.json({ error: "Tidak bisa hapus akun sendiri" }, 400);
  // Scope enforcement
  if (session.role === "admin_desa") {
    const allowed = (target.role === "admin_desa" && target.desaId === session.desaId)
      || (target.role === "admin_kelompok" && target.desaId === session.desaId);
    if (!allowed) return c.json({ error: "Tidak diizinkan" }, 403);
  } else if (session.role === "admin_kelompok") {
    if (target.role !== "admin_kelompok" || target.kelompokId !== session.kelompokId) {
      return c.json({ error: "Tidak diizinkan" }, 403);
    }
  }
  // Min 1 enforcement
  if (target.role === "admin_desa" && target.desaId) {
    const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(and(eq(users.role, "admin_desa"), eq(users.desaId, target.desaId)));
    if (Number(cnt[0]?.count || 0) <= 1) return c.json({ error: "Minimal harus ada 1 admin desa" }, 400);
  } else if (target.role === "admin_kelompok" && target.kelompokId) {
    const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(and(eq(users.role, "admin_kelompok"), eq(users.kelompokId, target.kelompokId)));
    if (Number(cnt[0]?.count || 0) <= 1) return c.json({ error: "Minimal harus ada 1 admin kelompok" }, 400);
  }
  await db.delete(users).where(eq(users.id, id));
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
  const data = await db.select().from(saranMasukan).orderBy(saranMasukan.createdAt);
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

export default r;
