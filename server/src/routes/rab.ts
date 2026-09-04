import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { rab, rabApproval } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

r.get("/", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  if (kegiatanId) return c.json(await db.select().from(rab).where(eq(rab.kegiatanId, kegiatanId)));
  return c.json([]);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, item, volume, satuan, hargaSatuan, keterangan } = body;
  if (!item || !volume || !satuan || !hargaSatuan) return c.json({ error: "Item, volume, satuan, harga satuan wajib diisi" }, 400);
  const id = crypto.randomUUID();
  const totalHarga = Number(volume) * Number(hargaSatuan);
  const db = getDb(c.env);
  await db.insert(rab).values({ id, kegiatanId: kegiatanId || null, item, volume: Number(volume), satuan, hargaSatuan: Number(hargaSatuan), totalHarga, keterangan } as any);
  return c.json({ success: true, id, totalHarga });
});

r.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const { item, volume, satuan, hargaSatuan, keterangan } = body;
  const db = getDb(c.env);
  const update: any = { updatedAt: new Date().toISOString() };
  if (item !== undefined) update.item = item;
  if (volume !== undefined) update.volume = Number(volume);
  if (satuan !== undefined) update.satuan = satuan;
  if (hargaSatuan !== undefined) update.hargaSatuan = Number(hargaSatuan);
  if (volume !== undefined || hargaSatuan !== undefined) {
    const existing: any = await db.query.rab.findFirst({ where: eq(rab.id, id) });
    const v = volume !== undefined ? Number(volume) : existing?.volume;
    const h = hargaSatuan !== undefined ? Number(hargaSatuan) : existing?.hargaSatuan;
    if (v && h) update.totalHarga = v * h;
  }
  if (keterangan !== undefined) update.keterangan = keterangan;
  await db.update(rab).set(update).where(eq(rab.id, id));
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(rab).where(eq(rab.id, id));
  return c.json({ success: true });
});

r.get("/approval", async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ error: "Missing ID" }, 400);
  const db = getDb(c.env);
  const approval: any = await db.select().from(rabApproval).where(eq(rabApproval.kegiatanId, kegiatanId)).then((r: any) => r[0]);
  return c.json(approval || { statusPengurus: "pending", statusAdmin: "pending" });
});

r.post("/approval", async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, status, catatan, isSubmitted } = body;
  if (isSubmitted === undefined && !status && !kegiatanId) return c.json({ error: "Missing fields" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.select().from(rabApproval).where(eq(rabApproval.kegiatanId, kegiatanId)).then((r: any) => r[0]);
  const data: any = { updatedAt: new Date().toISOString() };
  if (isSubmitted !== undefined) {
    if (session.role !== "admin_daerah") return c.json({ error: "Unauthorized to submit" }, 401);
    data.isSubmitted = isSubmitted ? 1 : 0;
  }
  if (status) {
    if (session.role === "admin_desa" || session.role === "admin_kelompok") { data.statusPengurus = status; data.catatanPengurus = catatan; }
    else if (session.role === "admin_daerah") { data.statusAdmin = status; data.catatanAdmin = catatan; }
  }
  if (existing) await db.update(rabApproval).set(data).where(eq(rabApproval.id, existing.id));
  else await db.insert(rabApproval).values({ id: crypto.randomUUID(), kegiatanId: kegiatanId || null, ...data } as any);
  return c.json({ success: true });
});

export default r;
