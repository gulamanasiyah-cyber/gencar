import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { artikel, users } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth, optionalAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

r.get("/", optionalAuth(), async (c) => {
  const status = c.req.query("status");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  let whereClause: any;
  const isTypeMatch = eq(artikel.tipe, "artikel");
  const isStatusMatch = status ? eq(artikel.status, status as any) : undefined;
  if (status === "published") whereClause = and(eq(artikel.status, "published"), isTypeMatch);
  else if (session && ["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) whereClause = and(isStatusMatch, isTypeMatch);
  else if (session) whereClause = and(eq(artikel.authorId, session.userId), isTypeMatch);
  else whereClause = and(eq(artikel.status, "published"), isTypeMatch);
  const data = await db.select({ id: artikel.id, judul: artikel.judul, ringkasan: artikel.ringkasan, kategori: artikel.kategori, tipe: artikel.tipe, status: artikel.status, authorId: artikel.authorId, authorName: users.name, coverImage: artikel.coverImage, publishedAt: artikel.publishedAt, createdAt: artikel.createdAt }).from(artikel).leftJoin(users, eq(artikel.authorId, users.id)).where(whereClause).orderBy(sql`${artikel.createdAt} DESC`);
  return c.json(data);
});

r.post("/", requireAuth(), async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin", "pengurus_daerah", "kmm_daerah", "creator", "desa", "kelompok"].includes(session.role)) return c.json({ error: "Role tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, konten, ringkasan, coverImage, kategori } = body;
  if (!judul || !konten) return c.json({ error: "Judul dan konten wajib diisi" }, 400);
  const id = crypto.randomUUID();
  const db = getDb(c.env);
  await db.insert(artikel).values({ id, judul, konten, ringkasan, coverImage, kategori: kategori || "Tuntunan Ibadah", tipe: "artikel", status: "pending", authorId: session.userId } as any);
  return c.json({ success: true, id });
});

r.get("/:id", optionalAuth(), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const data: any = await db.query.artikel.findFirst({ where: and(eq(artikel.id, id), eq(artikel.tipe, "artikel")) });
  if (!data) return c.json({ error: "Tidak ditemukan" }, 404);
  if (data.status !== "published") {
    const session = c.get("user" as any) as any;
    if (!session || (session.userId !== data.authorId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role))) return c.json({ error: "Tidak diizinkan" }, 403);
  }
  return c.json(data);
});

r.put("/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.artikel.findFirst({ where: and(eq(artikel.id, id), eq(artikel.tipe, "artikel")) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  const body: any = await c.req.json().catch(() => ({}));
  const { judul, konten, ringkasan, status, coverImage, kategori } = body;
  if (status && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) return c.json({ error: "Tidak diizinkan ubah status" }, 403);
  const updateData: any = { updatedAt: new Date().toISOString() };
  if (judul !== undefined) updateData.judul = judul;
  if (konten !== undefined) updateData.konten = konten;
  if (ringkasan !== undefined) updateData.ringkasan = ringkasan;
  if (coverImage !== undefined) updateData.coverImage = coverImage;
  if (kategori !== undefined) updateData.kategori = kategori;
  if (session.role === "creator") updateData.status = "pending";
  if (status !== undefined && ["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
    updateData.status = status;
    if (status === "published") updateData.publishedAt = new Date().toISOString();
  }
  await db.update(artikel).set(updateData).where(and(eq(artikel.id, id), eq(artikel.tipe, "artikel")));
  return c.json({ success: true });
});

r.delete("/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.artikel.findFirst({ where: and(eq(artikel.id, id), eq(artikel.tipe, "artikel")) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (existing.authorId !== session.userId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) return c.json({ error: "Tidak diizinkan" }, 403);
  await db.delete(artikel).where(and(eq(artikel.id, id), eq(artikel.tipe, "artikel")));
  return c.json({ success: true });
});

r.post("/:id/rate", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const rating = Number(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) return c.json({ error: "Invalid rating" }, 400);
  const db = getDb(c.env);
  const updated: any = await db.update(artikel).set({ ratingSum: sql`${artikel.ratingSum} + ${rating}`, ratingCount: sql`${artikel.ratingCount} + 1` } as any).where(eq(artikel.id, id)).returning({ ratingSum: artikel.ratingSum, ratingCount: artikel.ratingCount });
  if (!updated.length) return c.json({ error: "Article not found" }, 404);
  return c.json({ success: true, ratingSum: updated[0].ratingSum, ratingCount: updated[0].ratingCount });
});

export default r;
