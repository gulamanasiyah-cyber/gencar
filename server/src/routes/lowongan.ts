import { Hono } from "hono";
import { eq, and, sql, desc, or, like } from "drizzle-orm";
import { lowongan, lowonganReports } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth, type JWTPayload } from "../middleware/auth";
import { lowonganCreateSchema, normalizeExpiresAtToUtc } from "../../../shared/validation";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

r.use("/*", requireAuth());

function isAdminRole(role: string): boolean {
  return ["admin_daerah", "admin_desa", "admin_kelompok"].includes(role);
}

// ── GET /api/lowongan ──
r.get("/", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  const db = getDb(c.env);
  const q = (c.req.query("q") || "").trim().toLowerCase();
  const tipe = c.req.query("tipe");
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;
  const isAdmin = isAdminRole(session.role);
  const includeHiddenParam = c.req.query("includeHidden");
  const allowHidden = isAdmin && (includeHiddenParam === "1" || includeHiddenParam === "true");

  const conds: any[] = [];

  // Filter tipe
  if (tipe && ["full_time", "part_time", "freelance", "sampingan"].includes(tipe)) {
    conds.push(eq(lowongan.tipe, tipe as any));
  }

  // Filter search
  if (q) {
    conds.push(
      or(
        like(lowongan.judul, `%${q}%`),
        like(lowongan.deskripsi, `%${q}%`),
        like(lowongan.pemberi, `%${q}%`),
        like(lowongan.lokasi, `%${q}%`)
      )
    );
  }

  // Hidden filter:
  // - Admin with includeHidden sees all
  // - Non-admin (or admin without includeHidden) sees hidden=0 OR (authorId = session.userId)
  if (!allowHidden) {
    conds.push(or(eq(lowongan.hidden, 0), eq(lowongan.authorId, session.userId)));
  }

  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(lowongan).where(where).orderBy(desc(lowongan.createdAt));

  // Temporal expiry filter: only return items where Date.parse(expiresAt) >= Date.now()
  const now = Date.now();
  const activeRows = rows.filter((item) => {
    const expTime = Date.parse(item.expiresAt);
    return !isNaN(expTime) && expTime >= now;
  });

  const total = activeRows.length;
  const paginatedRows = activeRows.slice(offset, offset + limit);

  const sanitized = paginatedRows.map((row) => {
    const isOwner = row.authorId === session.userId;
    const isOwnHidden = row.hidden === 1 && isOwner && !isAdmin;

    if (!isAdmin) {
      return {
        id: row.id,
        judul: row.judul,
        deskripsi: row.deskripsi,
        pemberi: row.pemberi,
        tipe: row.tipe,
        lokasi: row.lokasi,
        kontak: row.kontak,
        expiresAt: row.expiresAt,
        authorId: row.authorId,
        hidden: row.hidden,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isOwner,
        isOwnHidden,
      };
    }

    return {
      ...row,
      isOwner,
      isOwnHidden,
    };
  });

  return c.json({ data: sanitized, total, page, limit });
});

// ── POST /api/lowongan ──
r.post("/", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  const db = getDb(c.env);
  const body: any = await c.req.json().catch(() => ({}));

  const parsed = lowonganCreateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Data lowongan tidak valid";
    return c.json({ error: msg }, 400);
  }

  const data = parsed.data;

  // Cek batas maksimal 5 postingan aktif
  const existingActive = await db
    .select()
    .from(lowongan)
    .where(and(eq(lowongan.authorId, session.userId), eq(lowongan.hidden, 0)));

  const now = Date.now();
  const activeCount = existingActive.filter((item) => {
    const exp = Date.parse(item.expiresAt);
    return !isNaN(exp) && exp >= now;
  }).length;

  if (activeCount >= 5) {
    return c.json(
      { error: "Batas maksimal 5 postingan aktif telah tercapai. Hapus atau tunggu postingan sebelumnya berakhir." },
      429
    );
  }

  const newId = crypto.randomUUID();
  const normalizedExpiresAt = normalizeExpiresAtToUtc(data.expiresAt);

  const newRow = {
    id: newId,
    judul: data.judul,
    deskripsi: data.deskripsi,
    pemberi: data.pemberi,
    tipe: data.tipe,
    lokasi: data.lokasi,
    kontak: data.kontak,
    expiresAt: normalizedExpiresAt,
    authorId: session.userId,
    reportCount: 0,
    hidden: 0,
    hiddenReason: null,
  };

  await db.insert(lowongan).values(newRow as any);

  return c.json({ success: true, data: { ...newRow, isOwner: true, isOwnHidden: false } }, 201);
});

// ── DELETE /api/lowongan/:id ──
r.delete("/:id", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.query.lowongan.findFirst({ where: eq(lowongan.id, id) });
  if (!existing) {
    return c.json({ error: "Lowongan tidak ditemukan" }, 404);
  }

  const isOwner = existing.authorId === session.userId;
  const isAdmin = isAdminRole(session.role);

  if (!isOwner && !isAdmin) {
    return c.json({ error: "Hanya pemilik atau pengurus yang dapat menghapus postingan ini" }, 403);
  }

  await db.delete(lowongan).where(eq(lowongan.id, id));
  return c.json({ success: true, message: "Lowongan berhasil dihapus" });
});

// ── POST /api/lowongan/:id/report ──
r.post("/:id/report", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.query.lowongan.findFirst({ where: eq(lowongan.id, id) });
  if (!existing) {
    return c.json({ error: "Lowongan tidak ditemukan" }, 404);
  }

  // Cek duplikasi laporan dari user yang sama
  const alreadyReported = await db.query.lowonganReports.findFirst({
    where: and(eq(lowonganReports.lowonganId, id), eq(lowonganReports.reporterId, session.userId)),
  });

  if (alreadyReported) {
    return c.json({ error: "Anda sudah pernah melaporkan postingan ini" }, 409);
  }

  // Catat laporan
  await db.insert(lowonganReports).values({
    id: crypto.randomUUID(),
    lowonganId: id,
    reporterId: session.userId,
  });

  // Increment reportCount
  const newCount = (existing.reportCount || 0) + 1;
  const shouldAutoHide = newCount >= 3;

  if (shouldAutoHide) {
    await db
      .update(lowongan)
      .set({
        reportCount: newCount,
        hidden: 1,
        hiddenReason: "auto_report",
        updatedAt: sql`(datetime('now'))`,
      } as any)
      .where(eq(lowongan.id, id));
  } else {
    await db
      .update(lowongan)
      .set({
        reportCount: newCount,
        updatedAt: sql`(datetime('now'))`,
      } as any)
      .where(eq(lowongan.id, id));
  }

  return c.json({
    success: true,
    message: "Laporan berhasil dikirim",
    autoHidden: shouldAutoHide,
  });
});

// ── POST /api/lowongan/:id/takedown ──
r.post("/:id/takedown", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  if (!isAdminRole(session.role)) {
    return c.json({ error: "Hanya pengurus yang dapat menurunkan postingan" }, 403);
  }

  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.query.lowongan.findFirst({ where: eq(lowongan.id, id) });
  if (!existing) {
    return c.json({ error: "Lowongan tidak ditemukan" }, 404);
  }

  await db
    .update(lowongan)
    .set({
      hidden: 1,
      hiddenReason: "admin",
      updatedAt: sql`(datetime('now'))`,
    } as any)
    .where(eq(lowongan.id, id));

  return c.json({ success: true, message: "Postingan berhasil diturunkan" });
});

// ── POST /api/lowongan/:id/restore ──
r.post("/:id/restore", async (c) => {
  const session = c.get("user" as any) as JWTPayload;
  if (!isAdminRole(session.role)) {
    return c.json({ error: "Hanya pengurus yang dapat memulihkan postingan" }, 403);
  }

  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.query.lowongan.findFirst({ where: eq(lowongan.id, id) });
  if (!existing) {
    return c.json({ error: "Lowongan tidak ditemukan" }, 404);
  }

  await db
    .update(lowongan)
    .set({
      hidden: 0,
      hiddenReason: null,
      reportCount: 0,
      updatedAt: sql`(datetime('now'))`,
    } as any)
    .where(eq(lowongan.id, id));

  return c.json({ success: true, message: "Postingan berhasil dipulihkan" });
});

export default r;
