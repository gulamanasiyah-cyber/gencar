import { Hono } from "hono";
import { eq, and, sql, desc, like, or } from "drizzle-orm";
import { kegiatanPublik, galeri, settings } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";
import { slugify } from "../../../shared/validation";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

function isPublisher(role: string) {
  return ["admin", "admin_daerah", "pengurus_daerah", "kmm_daerah"].includes(role);
}
function canCreate(role: string) {
  return ["admin", "admin_daerah", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "admin_desa", "admin_kelompok", "generus", "peserta"].includes(role);
}

async function uniqueSlug(db: any, table: any, base: string, excludeId?: string) {
  let slug = base;
  let n = 2;
  while (true) {
    const existing: any = await db.query[table === kegiatanPublik ? "kegiatanPublik" : "galeriAlbum"].findFirst({ where: eq(table.slug, slug) });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    slug = `${base}-${n++}`;
  }
}

// ── kegiatan_publik ──
r.get("/kegiatan-publik", async (c) => {
  const db = getDb(c.env);
  const q = (c.req.query("q") || "").trim();
  const status = c.req.query("status");
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;
  const conds: any[] = [];
  if (q) conds.push(or(like(kegiatanPublik.judul, `%${q}%`), like(kegiatanPublik.slug, `%${q}%`)));
  if (status) conds.push(eq(kegiatanPublik.status, status as any));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(kegiatanPublik).where(where).orderBy(desc(kegiatanPublik.createdAt)).limit(limit).offset(offset);
  const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(kegiatanPublik).where(where);
  return c.json({ data: rows, total: Number(cnt[0]?.count || 0), page, limit });
});

r.post("/kegiatan-publik", async (c) => {
  const session = c.get("user" as any) as any;
  if (!canCreate(session.role)) return c.json({ error: "Role tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, excerpt, konten, coverImage, kategori, kategoriAcara, kategoriCustom, tanggal, jam, lokasi, lat, lng, status } = body;
  if (!judul || !tanggal) return c.json({ error: "Judul dan tanggal wajib" }, 400);
  const db = getDb(c.env);
  const base = slugify(body.slug || judul);
  const slug = await uniqueSlug(db, kegiatanPublik, base);
  const finalStatus = isPublisher(session.role) ? (status || "draft") : status === "published" ? "pending_review" : status || "draft";
  const publishAt = finalStatus === "published" ? new Date().toISOString() : null;
  const id = crypto.randomUUID();
  await db.insert(kegiatanPublik).values({
    id, slug, judul, excerpt: excerpt || null, konten: konten || null, coverImage: coverImage || null,
    kategori: kategori || "Sambung Rutin",
    kategoriAcara: kategoriAcara || "lainnya", kategoriCustom: kategoriCustom || null,
    tanggal, jam: jam || null, lokasi: lokasi || null,
    lat: lat != null ? Number(lat) : null, lng: lng != null ? Number(lng) : null,
    status: finalStatus as any, authorId: session.userId, publishedAt: publishAt,
  } as any);
  return c.json({ success: true, id, slug });
});

r.put("/kegiatan-publik/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatanPublik.findFirst({ where: eq(kegiatanPublik.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !isPublisher(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, excerpt, konten, coverImage, kategori, kategoriAcara, kategoriCustom, tanggal, jam, lokasi, lat, lng, status } = body;
  if (status && status !== existing.status && !isPublisher(session.role)) return c.json({ error: "Hanya publisher yang bisa ubah status" }, 403);
  const update: any = { updatedAt: new Date().toISOString() };
  if (judul !== undefined) update.judul = judul;
  if (excerpt !== undefined) update.excerpt = excerpt;
  if (konten !== undefined) update.konten = konten;
  if (coverImage !== undefined) update.coverImage = coverImage;
  if (kategori !== undefined) update.kategori = kategori;
  if (kategoriAcara !== undefined) update.kategoriAcara = kategoriAcara;
  if (kategoriCustom !== undefined) update.kategoriCustom = kategoriCustom;
  if (tanggal !== undefined) update.tanggal = tanggal;
  if (jam !== undefined) update.jam = jam;
  if (lokasi !== undefined) update.lokasi = lokasi;
  if (lat !== undefined) update.lat = lat != null ? Number(lat) : null;
  if (lng !== undefined) update.lng = lng != null ? Number(lng) : null;
  if (status !== undefined) {
    update.status = status;
    if (status === "published" && existing.status !== "published") update.publishedAt = new Date().toISOString();
  }
  if (body.slug && body.slug !== existing.slug) {
    const base = slugify(body.slug);
    update.slug = await uniqueSlug(db, kegiatanPublik, base, id);
  } else if (judul && judul !== existing.judul && !body.slug) {
    // keep slug stable unless explicitly changed
  }
  await db.update(kegiatanPublik).set(update).where(eq(kegiatanPublik.id, id));
  return c.json({ success: true });
});

r.delete("/kegiatan-publik/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.kegiatanPublik.findFirst({ where: eq(kegiatanPublik.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !isPublisher(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  await db.delete(kegiatanPublik).where(eq(kegiatanPublik.id, id));
  return c.json({ success: true });
});

// ── galeri item (1 item = 1 foto/media) ──
r.get("/galeri", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(galeri).orderBy(desc(galeri.createdAt));
  return c.json(rows);
});

r.post("/galeri", async (c) => {
  const session = c.get("user" as any) as any;
  if (!canCreate(session.role)) return c.json({ error: "Role tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, image, kategori, type, aspectRatio, deskripsi, quote, author, durasi, tanggal, lokasi, status } = body;
  if (!judul) return c.json({ error: "Judul wajib" }, 400);
  if (type !== "quote" && !image) return c.json({ error: "Foto wajib diisi" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  await db.insert(galeri).values({
    id,
    judul: judul.trim(),
    image: image || "",
    kategori: kategori || "Kegiatan",
    type: type || "photo",
    aspectRatio: aspectRatio || "portrait",
    deskripsi: deskripsi || null,
    quote: quote || null,
    author: author || null,
    durasi: durasi || null,
    tanggal: tanggal || null,
    lokasi: lokasi || null,
    status: status || "published",
    authorId: session.userId,
  } as any);
  return c.json({ success: true, id });
});

r.get("/galeri/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const item: any = await db.query.galeri.findFirst({ where: eq(galeri.id, id) });
  if (!item) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(item);
});

r.put("/galeri/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.galeri.findFirst({ where: eq(galeri.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !isPublisher(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, image, kategori, type, aspectRatio, deskripsi, quote, author, durasi, tanggal, lokasi, status } = body;
  const update: any = { updatedAt: new Date().toISOString() };
  if (judul !== undefined) update.judul = judul;
  if (image !== undefined) update.image = image;
  if (kategori !== undefined) update.kategori = kategori;
  if (type !== undefined) update.type = type;
  if (aspectRatio !== undefined) update.aspectRatio = aspectRatio;
  if (deskripsi !== undefined) update.deskripsi = deskripsi;
  if (quote !== undefined) update.quote = quote;
  if (author !== undefined) update.author = author;
  if (durasi !== undefined) update.durasi = durasi;
  if (tanggal !== undefined) update.tanggal = tanggal;
  if (lokasi !== undefined) update.lokasi = lokasi;
  if (status !== undefined) update.status = status;
  await db.update(galeri).set(update).where(eq(galeri.id, id));
  return c.json({ success: true });
});

r.delete("/galeri/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.galeri.findFirst({ where: eq(galeri.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !isPublisher(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  await db.delete(galeri).where(eq(galeri.id, id));
  return c.json({ success: true });
});

// ── tentang (settings.tentang_html + settings.tentang_json) ──
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
  return c.json({ html: rowHtml?.value || "", json: parsedJson });
});

r.put("/tentang", async (c) => {
  const session = c.get("user" as any) as any;
  if (!isPublisher(session.role)) return c.json({ error: "Hanya publisher yang bisa edit Tentang" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const now = new Date().toISOString();

  if (body.json !== undefined) {
    const jsonStr = JSON.stringify(body.json);
    if (jsonStr.length > 50000) return c.json({ error: "Konten JSON terlalu panjang" }, 400);
    const existingJson: any = await db.query.settings.findFirst({ where: eq(settings.key, "tentang_json") });
    if (existingJson) {
      await db.update(settings).set({ value: jsonStr, updatedAt: now }).where(eq(settings.key, "tentang_json"));
    } else {
      await db.insert(settings).values({ key: "tentang_json", value: jsonStr, updatedAt: now } as any);
    }
  }

  if (body.html !== undefined) {
    const html = String(body.html || "");
    if (html.length > 50000) return c.json({ error: "Konten HTML terlalu panjang" }, 400);
    const existingHtml: any = await db.query.settings.findFirst({ where: eq(settings.key, "tentang_html") });
    if (existingHtml) {
      await db.update(settings).set({ value: html, updatedAt: now }).where(eq(settings.key, "tentang_html"));
    } else {
      await db.insert(settings).values({ key: "tentang_html", value: html, updatedAt: now } as any);
    }
  }

  return c.json({ success: true });
});

export default r;
