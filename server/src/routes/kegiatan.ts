import { Hono } from "hono";
import { eq, and, sql, or, isNull } from "drizzle-orm";

import { kegiatan, desa, kelompok, kegiatanPeserta, generus, absensi } from "../../../shared/schema";

function inList(column: any, values: any[]) {
  if (values.length === 0) return sql`1 = 0`;
  return sql`${column} IN (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;
}
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

r.use("/*", requireAuth());

// Helper: determine if peserta needs approval
// Returns true if the target is outside the creator's scope
function needsApproval(session: any, targetDesaId: number | null, targetKelompokId: number | null): boolean {
  // Admin daerah: no approval needed for anyone
  if (session.role === "admin_daerah") return false;
  // Admin desa: no approval for kelompok in same desa
  if (session.role === "admin_desa") {
    if (targetKelompokId && targetDesaId === session.desaId) return false; // same desa kelompok
    if (targetDesaId === session.desaId) return false; // same desa
    return true; // different desa or kelompok from other desa
  }
  // Admin kelompok: no approval for kelompok in same desa
  if (session.role === "admin_kelompok") {
    if (targetKelompokId && targetDesaId === session.desaId) return false; // same desa kelompok
    return true; // different desa or desa level
  }
  return true; // default: needs approval
}

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const conditions: any[] = [];
  // Find kegiatan IDs where user's desa/kelompok is in peserta
  const pesertaKegiatanIds: string[] = [];
  if (session.role === "admin_desa" && session.desaId) {
    const pRows = await db.select({ kegiatanId: kegiatanPeserta.kegiatanId }).from(kegiatanPeserta).where(eq(kegiatanPeserta.desaId, session.desaId));
    pRows.forEach((r) => pesertaKegiatanIds.push(r.kegiatanId));
  } else if (session.role === "admin_kelompok" && session.kelompokId) {
    const pRows = await db.select({ kegiatanId: kegiatanPeserta.kegiatanId }).from(kegiatanPeserta).where(or(eq(kegiatanPeserta.kelompokId, session.kelompokId), eq(kegiatanPeserta.desaId, session.desaId ?? 0)));
    pRows.forEach((r) => pesertaKegiatanIds.push(r.kegiatanId));
  }
  if (session.role === "admin_desa" && session.desaId) {
    const ors = [eq(kegiatan.desaId, session.desaId), and(isNull(kegiatan.desaId), isNull(kegiatan.kelompokId))];
    if (pesertaKegiatanIds.length > 0) ors.push(inList(kegiatan.id, pesertaKegiatanIds));
    conditions.push(or(...ors));
  } else if (session.role === "admin_kelompok" && session.kelompokId && session.desaId) {
    const ors = [eq(kegiatan.kelompokId, session.kelompokId), and(eq(kegiatan.desaId, session.desaId), isNull(kegiatan.kelompokId)), and(isNull(kegiatan.desaId), isNull(kegiatan.kelompokId))];
    if (pesertaKegiatanIds.length > 0) ors.push(inList(kegiatan.id, pesertaKegiatanIds));
    conditions.push(or(...ors));
  }
  const data = await db.select({ id: kegiatan.id, judul: kegiatan.judul, deskripsi: kegiatan.deskripsi, tanggal: kegiatan.tanggal, jam: kegiatan.jam, lokasi: kegiatan.lokasi, kategoriAcara: kegiatan.kategoriAcara, kategoriCustom: kegiatan.kategoriCustom, lat: kegiatan.lat, lng: kegiatan.lng, radiusM: kegiatan.radiusM, gpsRequired: kegiatan.gpsRequired, desaNama: desa.nama, kelompokNama: kelompok.nama, desaId: kegiatan.desaId, kelompokId: kegiatan.kelompokId, createdBy: kegiatan.createdBy, createdAt: kegiatan.createdAt }).from(kegiatan).leftJoin(desa, eq(kegiatan.desaId, desa.id)).leftJoin(kelompok, eq(kegiatan.kelompokId, kelompok.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(sql`${kegiatan.tanggal} DESC`);
  // Get peserta counts per kegiatan
  const kegIds = data.map((k) => k.id);
  const pesertaCounts: Record<string, number> = {};
  const pendingCounts: Record<string, number> = {};
  if (kegIds.length > 0) {
    const pRows = await db.select({ kegiatanId: kegiatanPeserta.kegiatanId, count: sql<number>`count(*)` }).from(kegiatanPeserta).where(inList(kegiatanPeserta.kegiatanId, kegIds)).groupBy(kegiatanPeserta.kegiatanId);
    for (const r of pRows) pesertaCounts[r.kegiatanId] = Number(r.count);
    const pendRows = await db.select({ kegiatanId: kegiatanPeserta.kegiatanId, count: sql<number>`count(*)` }).from(kegiatanPeserta).where(and(inList(kegiatanPeserta.kegiatanId, kegIds), eq(kegiatanPeserta.status, "pending"))).groupBy(kegiatanPeserta.kegiatanId);
    for (const r of pendRows) pendingCounts[r.kegiatanId] = Number(r.count);
  }
  // Get ALL peserta entries per kegiatan (with desa/kelompok names)
  const allPesertaEntries: Record<string, { id: string; status: string; catatan: string | null; desaNama: string | null; kelompokNama: string | null; desaId: number | null; kelompokId: number | null }[]> = {};
  // Also get current user's own peserta entry
  const myPesertaStatus: Record<string, string> = {};
  const myPesertaId: Record<string, string> = {};
  const myPesertaCatatan: Record<string, string | null> = {};
  if (kegIds.length > 0) {
    const allRows = await db.select({
      kegiatanId: kegiatanPeserta.kegiatanId, id: kegiatanPeserta.id, status: kegiatanPeserta.status,
      catatan: kegiatanPeserta.catatan, desaId: kegiatanPeserta.desaId, kelompokId: kegiatanPeserta.kelompokId,
      desaNama: desa.nama, kelompokNama: kelompok.nama,
    }).from(kegiatanPeserta)
      .leftJoin(desa, eq(kegiatanPeserta.desaId, desa.id))
      .leftJoin(kelompok, eq(kegiatanPeserta.kelompokId, kelompok.id))
      .where(inList(kegiatanPeserta.kegiatanId, kegIds));
    for (const r of allRows) {
      if (!allPesertaEntries[r.kegiatanId]) allPesertaEntries[r.kegiatanId] = [];
      allPesertaEntries[r.kegiatanId].push({ id: r.id, status: r.status, catatan: r.catatan ?? null, desaNama: r.desaNama ?? null, kelompokNama: r.kelompokNama ?? null, desaId: r.desaId, kelompokId: r.kelompokId });
      // Check if this is current user's entry
      if (session.role === "admin_desa" && r.desaId === session.desaId) {
        myPesertaStatus[r.kegiatanId] = r.status; myPesertaId[r.kegiatanId] = r.id; myPesertaCatatan[r.kegiatanId] = r.catatan ?? null;
      } else if (session.role === "admin_kelompok" && (r.kelompokId === session.kelompokId || r.desaId === session.desaId)) {
        myPesertaStatus[r.kegiatanId] = r.status; myPesertaId[r.kegiatanId] = r.id; myPesertaCatatan[r.kegiatanId] = r.catatan ?? null;
      }
    }
  }
  const enriched = data.map((k) => ({ ...k, pesertaCount: pesertaCounts[k.id] ?? 0, pendingPesertaCount: pendingCounts[k.id] ?? 0, pesertaStatus: myPesertaStatus[k.id] || null, myPesertaId: myPesertaId[k.id] || null, pesertaCatatan: myPesertaCatatan[k.id] || null, pesertaEntries: allPesertaEntries[k.id] || [] }));
  return c.json({ data: enriched, meta: { total: enriched.length } } as unknown as typeof enriched, 200, { "Cache-Control": "no-store" } as any);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, deskripsi, tanggal, jam, lokasi, desaId, kelompokId, kategoriAcara, kategoriCustom, lat, lng, radiusM, gpsRequired } = body;
  if (!judul || !tanggal) return c.json({ error: "Judul dan tanggal wajib diisi" }, 400);
  const id = crypto.randomUUID();
  let finalDesaId = desaId ? Number(desaId) : null;
  let finalKelompokId = kelompokId ? Number(kelompokId) : null;
  if (session.role === "admin_desa" && !desaId) finalDesaId = session.desaId;
  if (session.role === "admin_kelompok") {
    if (!desaId) finalDesaId = session.desaId;
    if (!kelompokId) finalKelompokId = session.kelompokId;
  }
  const peserta = body.peserta as { generusId?: string; kelompokId?: number; desaId?: number }[] | undefined;
  const db = getDb(c.env);
  await db.insert(kegiatan).values({ id, judul, deskripsi, tanggal, jam, lokasi, desaId: finalDesaId, kelompokId: finalKelompokId, kategoriAcara: kategoriAcara || "sambung_rutin", kategoriCustom: kategoriCustom || null, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, radiusM: radiusM ? Number(radiusM) : 100, gpsRequired: gpsRequired ? 1 : 0, createdBy: session.userId } as any);
  if (peserta && peserta.length > 0) {
    await db.insert(kegiatanPeserta).values(peserta.map((p) => {
      const targetDesaId = p.desaId ? Number(p.desaId) : null;
      const targetKelompokId = p.kelompokId ? Number(p.kelompokId) : null;
      const pending = needsApproval(session, targetDesaId, targetKelompokId);
      return {
        id: crypto.randomUUID(),
        kegiatanId: id,
        generusId: p.generusId || null,
        kelompokId: targetKelompokId,
        desaId: targetDesaId,
        status: pending ? "pending" as const : "approved" as const,
        requestedBy: session.userId,
        approvedBy: pending ? null : session.userId,
      };
    }));
  }
  return c.json({ success: true, id });
});

r.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});

r.get("/:id/peserta-entries", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const rows = await db.select().from(kegiatanPeserta).where(eq(kegiatanPeserta.kegiatanId, id));
  return c.json(rows);
});

r.get("/:id/peserta", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  // Get raw peserta entries
  const rows = await db.select().from(kegiatanPeserta).where(eq(kegiatanPeserta.kegiatanId, id));
  // Expand to individual generus
  const allGenerusIds = new Set<string>();
  const desaIds = rows.filter((r) => r.desaId).map((r) => r.desaId!);
  const kelompokIds = rows.filter((r) => r.kelompokId).map((r) => r.kelompokId!);
  const directGenerusIds = rows.filter((r) => r.generusId).map((r) => r.generusId!);
  directGenerusIds.forEach((gid) => allGenerusIds.add(gid));
  // Expand desa → all generus in those desa
  if (desaIds.length > 0) {
    const genRows = await db.select({ id: generus.id }).from(generus).where(inList(generus.desaId, desaIds));
    genRows.forEach((g) => allGenerusIds.add(g.id));
  }
  // Expand kelompok → all generus in those kelompok
  if (kelompokIds.length > 0) {
    const genRows = await db.select({ id: generus.id }).from(generus).where(inList(generus.kelompokId, kelompokIds));
    genRows.forEach((g) => allGenerusIds.add(g.id));
  }
  // Get attendance for this kegiatan
  const absensiRows = await db.select({ generusId: absensi.generusId, keterangan: absensi.keterangan }).from(absensi).where(eq(absensi.kegiatanId, id));
  const hadirMap = new Map(absensiRows.map((a) => [a.generusId, a.keterangan]));
  // Get generus details
  const generusIds = [...allGenerusIds];
  let generusDetails: { id: string; nama: string; desaNama: string | null; kelompokNama: string | null }[] = [];
  if (generusIds.length > 0) {
    generusDetails = await db.select({ id: generus.id, nama: generus.nama, desaNama: desa.nama, kelompokNama: kelompok.nama }).from(generus).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).where(inList(generus.id, generusIds));
  }
  const result = generusDetails.map((g) => ({
    ...g,
    status: hadirMap.get(g.id) ?? "belum",
  }));
  return c.json({ total: result.length, hadir: result.filter((r) => r.status === "hadir").length, izin: result.filter((r) => r.status === "izin").length, alpha: result.filter((r) => r.status === "alpha").length, belum: result.filter((r) => r.status === "belum").length, peserta: result });
});

r.put("/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, deskripsi, tanggal, jam, lokasi, desaId, kelompokId, kategoriAcara, kategoriCustom, lat, lng, radiusM, gpsRequired } = body;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.update(kegiatan).set({ judul, deskripsi, tanggal, jam, lokasi, desaId: desaId !== undefined ? (desaId ? Number(desaId) : null) : undefined, kelompokId: kelompokId !== undefined ? (kelompokId ? Number(kelompokId) : null) : undefined, kategoriAcara, kategoriCustom, lat: lat !== undefined ? (lat ? Number(lat) : null) : undefined, lng: lng !== undefined ? (lng ? Number(lng) : null) : undefined, radiusM: radiusM !== undefined ? Number(radiusM) : undefined, gpsRequired: gpsRequired !== undefined ? (gpsRequired ? 1 : 0) : undefined } as any).where(eq(kegiatan.id, id));
  // Replace peserta if provided
  const peserta = body.peserta as { generusId?: string; kelompokId?: number; desaId?: number }[] | undefined;
  if (peserta !== undefined) {
    await db.delete(kegiatanPeserta).where(eq(kegiatanPeserta.kegiatanId, id));
    if (peserta.length > 0) {
      await db.insert(kegiatanPeserta).values(peserta.map((p) => {
        const targetDesaId = p.desaId ? Number(p.desaId) : null;
        const targetKelompokId = p.kelompokId ? Number(p.kelompokId) : null;
        const pending = needsApproval(session, targetDesaId, targetKelompokId);
        return {
          id: crypto.randomUUID(),
          kegiatanId: id,
          generusId: p.generusId || null,
          kelompokId: targetKelompokId,
          desaId: targetDesaId,
          status: pending ? "pending" as const : "approved" as const,
          requestedBy: session.userId,
          approvedBy: pending ? null : session.userId,
        };
      }));
    }
  }
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && session.desaId && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && session.kelompokId && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.delete(kegiatan).where(eq(kegiatan.id, id));
  return c.json({ success: true });
});

// GET /undangan-masuk — daftar undangan pending untuk admin yang login
r.get("/undangan-masuk", async (c) => {
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  // Find peserta entries where the target matches the admin's scope and status is pending
  const conditions: any[] = [eq(kegiatanPeserta.status, "pending")];
  if (session.role === "admin_desa" && session.desaId) {
    conditions.push(eq(kegiatanPeserta.desaId, session.desaId));
  } else if (session.role === "admin_kelompok" && session.kelompokId) {
    conditions.push(eq(kegiatanPeserta.kelompokId, session.kelompokId));
  } else if (session.role === "admin_kelompok" && session.desaId) {
    // Also show desa-level undangan for kelompok admin
    conditions.push(or(eq(kegiatanPeserta.kelompokId, session.kelompokId), eq(kegiatanPeserta.desaId, session.desaId)));
  }
  const rows = await db.select({
    pesertaId: kegiatanPeserta.id,
    kegiatanId: kegiatanPeserta.kegiatanId,
    desaId: kegiatanPeserta.desaId,
    kelompokId: kegiatanPeserta.kelompokId,
    requestedBy: kegiatanPeserta.requestedBy,
    createdAt: kegiatanPeserta.createdAt,
    kegiatanJudul: kegiatan.judul,
    kegiatanTanggal: kegiatan.tanggal,
    kegiatanJam: kegiatan.jam,
    kegiatanLokasi: kegiatan.lokasi,
    desaNama: desa.nama,
    kelompokNama: kelompok.nama,
  }).from(kegiatanPeserta)
    .leftJoin(kegiatan, eq(kegiatanPeserta.kegiatanId, kegiatan.id))
    .leftJoin(desa, eq(kegiatanPeserta.desaId, desa.id))
    .leftJoin(kelompok, eq(kegiatanPeserta.kelompokId, kelompok.id))
    .where(and(...conditions))
    .orderBy(sql`${kegiatanPeserta.createdAt} DESC`);
  return c.json(rows);
});

// PUT /:id/peserta/:pesertaId/approve — approve undangan
r.put("/:id/peserta/:pesertaId/approve", async (c) => {
  const pesertaId = c.req.param("pesertaId");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatanPeserta.findFirst({ where: eq(kegiatanPeserta.id, pesertaId) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.status !== "pending") return c.json({ error: "Sudah diproses" }, 400);
  // Verify the admin has authority to approve this
  if (session.role === "admin_desa" && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.update(kegiatanPeserta).set({ status: "approved", approvedBy: session.userId, updatedAt: new Date().toISOString() }).where(eq(kegiatanPeserta.id, pesertaId));
  return c.json({ success: true });
});

// PUT /:id/peserta/:pesertaId/reject — tolak undangan
r.put("/:id/peserta/:pesertaId/reject", async (c) => {
  const pesertaId = c.req.param("pesertaId");
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const catatan = body.catatan || null;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatanPeserta.findFirst({ where: eq(kegiatanPeserta.id, pesertaId) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.status !== "pending") return c.json({ error: "Sudah diproses" }, 400);
  if (session.role === "admin_desa" && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.update(kegiatanPeserta).set({ status: "rejected", approvedBy: session.userId, catatan, updatedAt: new Date().toISOString() }).where(eq(kegiatanPeserta.id, pesertaId));
  return c.json({ success: true });
});

export default r;
