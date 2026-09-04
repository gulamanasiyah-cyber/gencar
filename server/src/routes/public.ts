import { Hono } from "hono";
import { eq, and, sql, like, or, desc } from "drizzle-orm";
import { absensi, kegiatan, generus, desa, kelompok, saranMasukan, settings } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { isDiundang } from "../utils/undangan";
import { optionalAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

// public/absensi - record absensi without session (QR public)
r.post("/absensi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, generusId, keterangan } = body;
  if (!kegiatanId || !generusId) return c.json({ error: "kegiatanId dan generusId diperlukan" }, 400);
  const db = getDb(c.env);
  const keg: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, kegiatanId) });
  if (!keg) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);
  const gen: any = await db.query.generus.findFirst({ where: eq(generus.id, generusId) });
  if (!gen) return c.json({ error: "Generus tidak ditemukan" }, 404);
  // Gate sama dengan jalur utama: scope pemilik ATAU undangan approved (acara gabungan)
  let allowed = true;
  if (keg.kelompokId && gen.kelompokId != keg.kelompokId) allowed = false;
  else if (keg.desaId && !keg.kelompokId && gen.desaId != keg.desaId) allowed = false;
  if (!allowed) {
    const diundang = await isDiundang(db, kegiatanId, gen);
    if (!diundang) return c.json({ error: "Generus bukan bagian dari kegiatan ini" }, 403);
  }
  const existing: any = await db.query.absensi.findFirst({ where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, generusId)) });
  if (existing) return c.json({ error: "Sudah diabsen" }, 409);
  const id = crypto.randomUUID();
  await db.insert(absensi).values({ id, kegiatanId, generusId, keterangan: keterangan || "hadir", timestamp: new Date().toISOString() } as any);
  return c.json({ success: true, id });
});

// public/saran
r.post("/saran", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { untuk, kepada, saran, nama, isAnonim } = body;
  if (!untuk || !saran) return c.json({ error: "untuk dan saran wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(saranMasukan).values({ id: crypto.randomUUID(), untuk, kepada: kepada || null, saran, nama: nama || null, isAnonim: isAnonim ? 1 : 0 } as any);
  return c.json({ success: true });
});
r.get("/saran", async (c) => {
  const db = getDb(c.env);
  const data = await db.select().from(saranMasukan).limit(50);
  return c.json(data);
});

r.get("/kegiatan-publik/kategori", async (c) => {
  const db = getDb(c.env);
  const { kegiatanPublik } = await import("../../../shared/schema");
  const rows: any[] = await db
    .select({
      kategori: kegiatanPublik.kategori,
      kategoriAcara: kegiatanPublik.kategoriAcara,
      count: sql<number>`count(*)`,
    })
    .from(kegiatanPublik)
    .where(eq(kegiatanPublik.status, "published"))
    .groupBy(kegiatanPublik.kategori, kegiatanPublik.kategoriAcara)
    .orderBy(desc(sql`count(*)`));

  const list: { label: string; value: string; count: number }[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const rawLabel = (r.kategori || r.kategoriAcara || "").trim();
    if (!rawLabel) continue;
    const value = r.kategoriAcara || rawLabel.toLowerCase().replace(/\s+/g, "_");
    if (seen.has(value)) continue;
    seen.add(value);
    list.push({
      label: rawLabel,
      value,
      count: Number(r.count || 0),
    });
  }

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(list);
});

r.get("/kegiatan-publik", async (c) => {
  const db = getDb(c.env);
  const { kegiatanPublik } = await import("../../../shared/schema");
  const q = (c.req.query("q") || "").trim().toLowerCase();
  const kategori = c.req.query("kategoriAcara") || c.req.query("kategori") || "";
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.min(24, Math.max(1, Number(c.req.query("limit") || "12")));
  const offset = (page - 1) * limit;
  const conds: any[] = [eq(kegiatanPublik.status, "published")];
  if (q) conds.push(or(like(kegiatanPublik.judul, `%${q}%`), like(kegiatanPublik.excerpt, `%${q}%`)));
  if (kategori) conds.push(eq(kegiatanPublik.kategoriAcara, kategori as any));
  const where = and(...conds);
  const rows: any[] = await db.select().from(kegiatanPublik).where(where).orderBy(desc(kegiatanPublik.tanggal)).limit(limit).offset(offset);
  const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(kegiatanPublik).where(where);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json({ data: rows, total: Number(cnt[0]?.count || 0), page, limit });
});

r.get("/kegiatan-publik/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env);
  const { kegiatanPublik } = await import("../../../shared/schema");
  let row: any = await db.query.kegiatanPublik.findFirst({ where: and(eq(kegiatanPublik.slug, slug), eq(kegiatanPublik.status, "published")) });
  if (!row) row = await db.query.kegiatanPublik.findFirst({ where: and(eq(kegiatanPublik.id, slug), eq(kegiatanPublik.status, "published")) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(row);
});

r.get("/galeri", async (c) => {
  const db = getDb(c.env);
  const { galeri } = await import("../../../shared/schema");
  const items: any[] = await db.select().from(galeri).where(eq(galeri.status, "published")).orderBy(desc(galeri.createdAt));
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(items);
});

r.get("/galeri/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const { galeri } = await import("../../../shared/schema");
  const item: any = await db.query.galeri.findFirst({ where: and(eq(galeri.id, id), eq(galeri.status, "published")) });
  if (!item) return c.json({ error: "Tidak ditemukan" }, 404);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(item);
});

r.get("/tentang", async (c) => {
  const db = getDb(c.env);
  const [rowHtml, rowJson] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, "tentang_html") }),
    db.query.settings.findFirst({ where: eq(settings.key, "tentang_json") }),
  ]);
  let parsedJson = null;
  if (rowJson?.value) {
    try {
      parsedJson = JSON.parse(rowJson.value);
    } catch {}
  }
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json({ html: rowHtml?.value || "", json: parsedJson });
});

// public/pengurus — anon, grouped by level, ordered by level priority then urutan
const PENGURUS_LEVEL_ORDER: Record<string, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 }
r.get("/pengurus", async (c) => {
  const db = getDb(c.env)
  const { organisasiPengurus } = await import("../../../shared/schema")
  const rows: any[] = await db.select().from(organisasiPengurus)
  rows.sort((a: any, b: any) => {
    const la = PENGURUS_LEVEL_ORDER[a.level ?? "bidang"] ?? 2
    const lb = PENGURUS_LEVEL_ORDER[b.level ?? "bidang"] ?? 2
    if (la !== lb) return la - lb
    const ua = Number(a.urutan ?? 0)
    const ub = Number(b.urutan ?? 0)
    if (ua !== ub) return ua - ub
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
  })
  const sanitized = rows.map((r: any) => ({
    id: r.id, nama: r.nama, dapukan: r.dapukan, foto: r.foto,
    level: r.level ?? "bidang", bio: r.bio ?? null, kontakWa: r.kontakWa ?? null, urutan: r.urutan ?? 0,
  }))
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
  return c.json(sanitized)
})

// public/kegiatan/:id
r.get("/kegiatan/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});

// public/generus/* - registrasi lookup & list
r.post("/generus/registrasi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, jenisKelamin, kategoriUsia, desaId, kelompokId } = body;
  if (!nama || !jenisKelamin || !kategoriUsia) return c.json({ error: "Data tidak lengkap" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  const nomorUnik = `G-${Math.floor(100000 + Math.random() * 900000)}`;
  await db.insert(generus).values({ id, nomorUnik, nama, jenisKelamin, kategoriUsia, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, isGenerus: 1 } as any);
  return c.json({ success: true, id, nomorUnik });
});
r.get("/generus/desa", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(desa);
  return c.json(rows);
});
r.get("/generus/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  const db = getDb(c.env);
  const rows = desaId ? await db.select().from(kelompok).where(eq(kelompok.desaId, Number(desaId))) : await db.select().from(kelompok);
  return c.json(rows);
});

// mandiri/* removed — legacy (PRD: only ujian mandiri mini kept via /api/kegiatan? No, full mandiri family deleted)
// Frontend no longer calls /api/public/mandiri/* (Wilayah now uses /api/auth/desa|kelompok only).

export default r;
