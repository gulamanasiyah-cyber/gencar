import { Hono } from "hono";
import { eq, and, like, or } from "drizzle-orm";
import { absensi, generus, kegiatan, desa, kelompok } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ error: "kegiatanId diperlukan" }, 400);
  const db = getDb(c.env);
  const targetKegiatan: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, kegiatanId) });
  if (!targetKegiatan) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && targetKegiatan.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  if (session.role === "admin_kelompok") {
    if (targetKegiatan.kelompokId !== null && targetKegiatan.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (targetKegiatan.desaId !== null && targetKegiatan.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  }
  const data = await db.select({ id: absensi.id, kegiatanId: absensi.kegiatanId, generusId: absensi.generusId, timestamp: absensi.timestamp, keterangan: absensi.keterangan, generusNama: generus.nama, generusNomorUnik: generus.nomorUnik, generusKategori: generus.kategori, generusJenisKelamin: generus.jenisKelamin, desaId: generus.desaId, desaNama: desa.nama, kelompokId: generus.kelompokId, kelompokNama: kelompok.nama }).from(absensi).leftJoin(generus, eq(absensi.generusId, generus.id)).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).where(eq(absensi.kegiatanId, kegiatanId));
  return c.json(data, 200, { "Cache-Control": "no-store" } as any);
});

// search generus for QR - matches original absensi/search
r.get("/search", async (c) => {
  const session = c.get("user" as any) as any;
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json([]);
  const conditions: any[] = [or(like(generus.nama, `%${q}%`), like(generus.nomorUnik, `%${q}%`))];
  if (session.role === "admin_desa" && session.desaId) conditions.push(eq(generus.desaId, session.desaId));
  else if (session.role === "admin_kelompok" && session.kelompokId) conditions.push(eq(generus.kelompokId, session.kelompokId));
  const db = getDb(c.env);
  const data = await db.select().from(generus).where(and(...conditions)).limit(10);
  return c.json(data);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, generusId: rawGenerusId, keterangan, lat, lng, accuracy, qrWilayahLevel } = body;
  if (!kegiatanId || !rawGenerusId) return c.json({ error: "kegiatanId dan generusId diperlukan" }, 400);
  const db = getDb(c.env);
  const kegiatanExists: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, kegiatanId) });
  if (!kegiatanExists) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  if (session.role === "admin_kelompok") {
    if (kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (kegiatanExists.kelompokId && kegiatanExists.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
  }
  let resolvedGenerus: any = await db.query.generus.findFirst({ where: eq(generus.id, rawGenerusId) });
  if (!resolvedGenerus) resolvedGenerus = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, rawGenerusId) });
  if (!resolvedGenerus) return c.json({ error: "Generus tidak ditemukan" }, 404);
  if (kegiatanExists.kelompokId && resolvedGenerus.kelompokId != kegiatanExists.kelompokId) return c.json({ error: "Generus bukan bagian dari kelompok ini" }, 403);
  else if (kegiatanExists.desaId && !kegiatanExists.kelompokId && resolvedGenerus.desaId != kegiatanExists.desaId) return c.json({ error: "Generus bukan bagian dari desa ini" }, 403);
  const resolvedGenerusId = resolvedGenerus.id;
  const existing: any = await db.query.absensi.findFirst({ where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, resolvedGenerusId)) });
  if (existing) return c.json({ error: "Sudah diabsen", existing }, 409);
  const id = crypto.randomUUID();
  await db.insert(absensi).values({ id, kegiatanId, generusId: resolvedGenerusId, keterangan: keterangan || "hadir", timestamp: new Date().toISOString(), lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, accuracy: accuracy ? Number(accuracy) : null, qrWilayahLevel: qrWilayahLevel || null } as any);
  return c.json({ success: true, id, generusNama: resolvedGenerus.nama });
});

r.delete("/", async (c) => {
  const session = c.get("user" as any) as any;
  const id = c.req.query("id");
  if (!id) return c.json({ error: "id absensi diperlukan" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.query.absensi.findFirst({ where: eq(absensi.id, id) });
  if (!existing) return c.json({ error: "Absensi tidak ditemukan" }, 404);
  if (session.role === "admin_desa" || session.role === "admin_kelompok") {
    const relatedKegiatan: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, existing.kegiatanId) });
    if (session.role === "admin_desa" && relatedKegiatan?.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (session.role === "admin_kelompok") {
      if (relatedKegiatan?.kelompokId !== null && relatedKegiatan?.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
      if (relatedKegiatan?.desaId !== null && relatedKegiatan?.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    }
  }
  await db.delete(absensi).where(eq(absensi.id, id));
  return c.json({ success: true });
});

export default r;
