import { Hono } from "hono";
import { eq, and, sql, or, isNull } from "drizzle-orm";
import { kegiatan, desa, kelompok } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

r.use("/*", requireAuth());

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const conditions: any[] = [];
  if (session.role === "admin_desa" && session.desaId) conditions.push(eq(kegiatan.desaId, session.desaId));
  else if (session.role === "admin_kelompok" && session.kelompokId && session.desaId) {
    conditions.push(or(eq(kegiatan.kelompokId, session.kelompokId), and(eq(kegiatan.desaId, session.desaId), isNull(kegiatan.kelompokId))));
  }
  const db = getDb(c.env);
  const data = await db.select({ id: kegiatan.id, judul: kegiatan.judul, deskripsi: kegiatan.deskripsi, tanggal: kegiatan.tanggal, jam: kegiatan.jam, lokasi: kegiatan.lokasi, desaNama: desa.nama, kelompokNama: kelompok.nama, desaId: kegiatan.desaId, kelompokId: kegiatan.kelompokId, createdAt: kegiatan.createdAt }).from(kegiatan).leftJoin(desa, eq(kegiatan.desaId, desa.id)).leftJoin(kelompok, eq(kegiatan.kelompokId, kelompok.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(sql`${kegiatan.tanggal} DESC`);
  // Additive envelope: {data, meta} + keep array compat via meta
  return c.json({ data, meta: { total: data.length } } as unknown as typeof data, 200, { "Cache-Control": "no-store" } as any);
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
  const db = getDb(c.env);
  await db.insert(kegiatan).values({ id, judul, deskripsi, tanggal, jam, lokasi, desaId: finalDesaId, kelompokId: finalKelompokId, kategoriAcara: kategoriAcara || "sambung_rutin", kategoriCustom: kategoriCustom || null, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, radiusM: radiusM ? Number(radiusM) : 100, gpsRequired: gpsRequired ? 1 : 0, createdBy: session.userId } as any);
  return c.json({ success: true, id });
});

r.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
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
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(kegiatan).where(eq(kegiatan.id, id));
  return c.json({ success: true });
});

export default r;
