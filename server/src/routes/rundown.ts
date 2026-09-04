import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { rundown, rundownApproval } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

r.get("/", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  if (kegiatanId) return c.json(await db.select().from(rundown).where(eq(rundown.kegiatanId, kegiatanId)).orderBy(asc(rundown.waktu)));
  return c.json([]);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role)) return c.json({ error: "Unauthorized" }, 401);
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, waktu, agenda, pic, keterangan } = body;
  if (!waktu || !agenda) return c.json({ error: "Waktu dan agenda wajib diisi" }, 400);
  const id = crypto.randomUUID();
  const db = getDb(c.env);
  await db.insert(rundown).values({ id, kegiatanId: kegiatanId || null, waktu, agenda, pic, keterangan } as any);
  return c.json({ success: true, id });
});

r.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const { waktu, agenda, pic, keterangan } = body;
  const update: any = { updatedAt: new Date().toISOString() };
  if (waktu !== undefined) update.waktu = waktu;
  if (agenda !== undefined) update.agenda = agenda;
  if (pic !== undefined) update.pic = pic;
  if (keterangan !== undefined) update.keterangan = keterangan;
  const db = getDb(c.env);
  await db.update(rundown).set(update).where(eq(rundown.id, id));
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(rundown).where(eq(rundown.id, id));
  return c.json({ success: true });
});

r.get("/approval", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ error: "Missing ID" }, 400);
  const db = getDb(c.env);
  const approval: any = await db.select().from(rundownApproval).where(eq(rundownApproval.kegiatanId, kegiatanId)).then((r: any) => r[0]);
  return c.json(approval || { statusPengurus: "pending", isSubmitted: 0 });
});

r.post("/approval", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, status, catatan, isSubmitted } = body;
  const db = getDb(c.env);
  const existing: any = await db.select().from(rundownApproval).where(eq(rundownApproval.kegiatanId, kegiatanId)).then((r: any) => r[0]);
  const data: any = { updatedAt: new Date().toISOString() };
  if (isSubmitted !== undefined) data.isSubmitted = isSubmitted ? 1 : 0;
  if (status) { data.statusPengurus = status; data.catatanPengurus = catatan; }
  if (existing) await db.update(rundownApproval).set(data).where(eq(rundownApproval.id, existing.id));
  else await db.insert(rundownApproval).values({ id: crypto.randomUUID(), kegiatanId: kegiatanId || null, ...data } as any);
  return c.json({ success: true });
});

export default r;
