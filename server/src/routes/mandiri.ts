import { Hono } from "hono";
import { eq, and, or, like, sql, asc, desc } from "drizzle-orm";
import { generus, mandiri, mandiriDaerah, mandiriDesa, mandiriKelompok, mandiriKegiatan, mandiriAbsensi, mandiriKomentar, mandiriPemilihan, mandiriRooms, mandiriKunjungan, mandiriKuisioner, saranMasukan, settings, desa, formPanitiaDanPengurus, timGambuh } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

// base mandiri list
r.get("/", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  const rows = kegiatanId ? await db.select().from(mandiri).where(eq(mandiri.kegiatanId, kegiatanId)) : await db.select().from(mandiri).limit(100);
  return c.json(rows);
});
r.post("/", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { generusId, kegiatanId } = body;
  if (!generusId || !kegiatanId) return c.json({ error: "generusId dan kegiatanId wajib" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  await db.insert(mandiri).values({ id, generusId, kegiatanId } as any);
  return c.json({ success: true, id });
});

// wilayah masters
r.get("/daerah", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriDaerah)); });
r.post("/daerah", async (c) => {
  const { nama } = await c.req.json().catch(() => ({} as any));
  if (!nama) return c.json({ error: "nama wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(mandiriDaerah).values({ nama } as any);
  return c.json({ success: true });
});
r.get("/desa", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriDesa)); });
r.post("/desa", async (c) => {
  const { nama, mandiriDaerahId } = await c.req.json().catch(() => ({} as any));
  if (!nama) return c.json({ error: "nama wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(mandiriDesa).values({ nama, mandiriDaerahId: mandiriDaerahId ? Number(mandiriDaerahId) : null } as any);
  return c.json({ success: true });
});
r.get("/kelompok", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriKelompok)); });
r.post("/kelompok", async (c) => {
  const { nama, mandiriDesaId } = await c.req.json().catch(() => ({} as any));
  if (!nama || !mandiriDesaId) return c.json({ error: "nama dan mandiriDesaId wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(mandiriKelompok).values({ nama, mandiriDesaId: Number(mandiriDesaId) } as any);
  return c.json({ success: true });
});

// kegiatan
r.get("/kegiatan", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal))); });
r.post("/kegiatan", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, tanggal, lokasi, kota, deskripsi } = body;
  if (!judul || !tanggal || !kota) return c.json({ error: "judul, tanggal, kota wajib" }, 400);
  const id = crypto.randomUUID();
  const db = getDb(c.env);
  await db.insert(mandiriKegiatan).values({ id, judul, tanggal, lokasi: lokasi || null, kota, deskripsi: deskripsi || null, createdBy: session.userId } as any);
  return c.json({ success: true, id });
});
r.get("/kegiatan/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.mandiriKegiatan.findFirst({ where: eq(mandiriKegiatan.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});
r.put("/kegiatan/:id", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.update(mandiriKegiatan).set({ ...body, updatedAt: new Date().toISOString() } as any).where(eq(mandiriKegiatan.id, id));
  return c.json({ success: true });
});
r.delete("/kegiatan/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(mandiriKegiatan).where(eq(mandiriKegiatan.id, id));
  return c.json({ success: true });
});

// absensi
r.get("/absensi", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  const rows = kegiatanId ? await db.select().from(mandiriAbsensi).where(eq(mandiriAbsensi.kegiatanId, kegiatanId)) : await db.select().from(mandiriAbsensi).limit(100);
  return c.json(rows);
});
r.post("/absensi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, generusId, keterangan } = body;
  if (!kegiatanId || !generusId) return c.json({ error: "kegiatanId dan generusId wajib" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  await db.insert(mandiriAbsensi).values({ id, kegiatanId, generusId, keterangan: keterangan || "hadir" } as any);
  return c.json({ success: true, id });
});
r.get("/absensi/search", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json([]);
  const db = getDb(c.env);
  const rows = await db.select().from(generus).where(or(like(generus.nama, `%${q}%`), like(generus.nomorUnik, `%${q}%`)) as any).limit(10);
  return c.json(rows);
});

// pilih / box-love / komentar / kuisioner / kunjungan / rooms / panitia / staff / pulang etc - simplified pass-through
r.post("/pilih", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { pengirimId, penerimaId, kegiatanId } = body;
  if (!pengirimId || !penerimaId) return c.json({ error: "pengirimId dan penerimaId wajib" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  await db.insert(mandiriPemilihan).values({ id, pengirimId, penerimaId, kegiatanId: kegiatanId || null } as any);
  return c.json({ success: true, id });
});
r.get("/data", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  const rows = kegiatanId ? await db.select().from(mandiri).where(eq(mandiri.kegiatanId, kegiatanId)) : await db.select().from(mandiri).limit(100);
  return c.json(rows);
});
r.post("/komentar", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { penerimaId, komentar, isAnonim } = body;
  if (!penerimaId || !komentar) return c.json({ error: "penerimaId dan komentar wajib" }, 400);
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  await db.insert(mandiriKomentar).values({ id: crypto.randomUUID(), penerimaId, pengirimId: session.userId ? null : null, komentar, isAnonim: isAnonim ? 1 : 0 } as any);
  return c.json({ success: true });
});
r.get("/komentar", async (c) => {
  const penerimaId = c.req.query("penerimaId");
  const db = getDb(c.env);
  const rows = penerimaId ? await db.select().from(mandiriKomentar).where(eq(mandiriKomentar.penerimaId, penerimaId)) : await db.select().from(mandiriKomentar).limit(50);
  return c.json(rows);
});
r.post("/kuisioner", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.insert(mandiriKuisioner).values({ id: crypto.randomUUID(), pemilihanId: body.pemilihanId || null, pengisiId: body.pengisiId || c.get("user" as any)?.userId || "unknown", namaPnkb: body.namaPnkb || null, tanggapan: body.tanggapan || null } as any);
  return c.json({ success: true });
});
r.get("/kuisioner", async (c) => {
  const db = getDb(c.env);
  return c.json(await db.select().from(mandiriKuisioner).limit(100));
});
r.post("/kunjungan", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { generusId, roomId } = body;
  if (!generusId || !roomId) return c.json({ error: "generusId dan roomId wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(mandiriKunjungan).values({ id: crypto.randomUUID(), generusId, roomId, pemilihanId: body.pemilihanId || null, kegiatanId: body.kegiatanId || null } as any);
  return c.json({ success: true });
});
r.get("/kunjungan", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriKunjungan).limit(100)); });
r.get("/kunjungan/:pemilihanId", async (c) => {
  const pemilihanId = c.req.param("pemilihanId");
  const db = getDb(c.env);
  const rows = await db.select().from(mandiriKunjungan).where(eq(mandiriKunjungan.pemilihanId, pemilihanId));
  return c.json(rows);
});
r.post("/kunjungan/manual", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.insert(mandiriKunjungan).values({ id: crypto.randomUUID(), generusId: body.generusId, roomId: body.roomId, pemilihanId: body.pemilihanId || null, kegiatanId: body.kegiatanId || null } as any);
  return c.json({ success: true });
});
r.get("/rooms", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriRooms).limit(100)); });
r.post("/rooms", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, kegiatanId } = body;
  if (!nama) return c.json({ error: "nama wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(mandiriRooms).values({ id: crypto.randomUUID(), nama, kegiatanId: kegiatanId || null } as any);
  return c.json({ success: true });
});
r.get("/rooms/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.mandiriRooms.findFirst({ where: eq(mandiriRooms.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});
r.put("/rooms/:id", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.update(mandiriRooms).set({ ...body, updatedAt: new Date().toISOString() } as any).where(eq(mandiriRooms.id, id));
  return c.json({ success: true });
});
r.delete("/rooms/:id", async (c) => { const db = getDb(c.env); await db.delete(mandiriRooms).where(eq(mandiriRooms.id, c.req.param("id"))); return c.json({ success: true }); });
r.get("/panitia", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(formPanitiaDanPengurus).limit(100)); });
r.post("/panitia", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.insert(formPanitiaDanPengurus).values({ id: crypto.randomUUID(), nama: body.nama || "", generusId: body.generusId || null, dapukan: body.dapukan || "Panitia" } as any);
  return c.json({ success: true });
});
r.get("/staff", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(timGambuh).limit(100)); });
r.post("/pulang", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.insert(mandiriAbsensi).values({ id: crypto.randomUUID(), generusId: body.generusId, kegiatanId: body.kegiatanId || "", keterangan: "pulang", alasanPulang: body.alasan || null, waktuPulang: new Date().toISOString() } as any);
  return c.json({ success: true });
});
r.get("/box-love", async (c) => c.json([]));
r.post("/box-love", async (c) => c.json({ success: true }));
r.get("/hasil-rr", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriPemilihan).limit(100)); });
r.post("/sync-participant", async (c) => c.json({ success: true }));
r.post("/fix-nomor-urut", async (c) => c.json({ success: true }));
r.get("/settings", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(settings);
  const map: Record<string,string> = {};
  for (const row of rows as any[]) map[row.key]=row.value;
  return c.json(map);
});
r.post("/settings", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  for (const [k,v] of Object.entries(body)) {
    const ex: any = await db.query.settings.findFirst({ where: eq(settings.key, k) });
    if (ex) await db.update(settings).set({ value: String(v), updatedAt: new Date().toISOString() }).where(eq(settings.key, k));
    else await db.insert(settings).values({ key: k, value: String(v) } as any);
  }
  return c.json({ success: true });
});
r.get("/saran", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(saranMasukan).limit(50)); });
r.post("/saran", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.insert(saranMasukan).values({ id: crypto.randomUUID(), untuk: body.untuk || "Mandiri", kepada: body.kepada || null, saran: body.saran || "", nama: body.nama || null } as any);
  return c.json({ success: true });
});
r.get("/stats/attendance", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  const rows = kegiatanId ? await db.select({ keterangan: mandiriAbsensi.keterangan, count: sql<number>`count(*)` }).from(mandiriAbsensi).where(eq(mandiriAbsensi.kegiatanId, kegiatanId)).groupBy(mandiriAbsensi.keterangan) : [];
  return c.json(rows);
});
r.get("/stats/whatsapp-report", async (c) => c.json({ success: true, report: [] }));

export default r;
