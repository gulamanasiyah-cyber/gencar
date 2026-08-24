import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users, generus } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { createToken, setSessionCookie, clearSessionCookie, extractToken, verifyToken } from "../middleware/auth";
import { isTokenRevoked } from "../utils/cache";
import { sanitizeString, detectPromptInjection } from "../utils/sanitize";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase().max(255),
  password: z.string().min(1).max(128),
});
const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  desaId: z.preprocess((v) => (typeof v === "string" && v ? Number(v) : v), z.number().positive()),
  kelompokId: z.preprocess((v) => (typeof v === "string" && v ? Number(v) : v), z.number().positive()),
  jenisKelamin: z.string().min(1),
  kategoriUsia: z.string().min(1),
  kategori: z.enum(["Generus", "Usia Mandiri"]),
  namaOrtu: z.string().min(2),
  tempatLahir: z.string().min(2),
  tanggalLahir: z.string().min(1),
  noTelp: z.string().min(10).regex(/^\d+$/).trim(),
  noTelpOrtu: z.string().min(10).regex(/^\d+$/).trim(),
  alamat: z.string().min(3),
  foto: z.string().url().min(1),
});

type Env = { DB: D1Database; JWT_SECRET: string; APP_ENCRYPTION_KEY?: string; [k: string]: unknown };

const auth = new Hono<{ Bindings: Env }>();

auth.post("/login", async (c) => {
  const raw = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const first = (parsed.error as any).issues?.[0]?.message || "Input tidak valid";
    return c.json({ error: first }, 400);
  }
  const { email, password } = parsed.data;
  if (detectPromptInjection(email)) return c.json({ error: "Input ditolak" }, 400);
  const cleanEmail = sanitizeString(email).toLowerCase();
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.email, cleanEmail) });
  if (!user) return c.json({ error: "Email atau password salah" }, 401);
  // bcryptjs is Node-only; use WebCrypto-compatible check if needed. Keep bcryptjs if bundled for Workers.
  // For now use bcryptjs (works with nodejs_compat). Fallback to plain compare imported lazily.
  let valid = false;
  try {
    const bcrypt = await import("bcryptjs");
    valid = bcrypt.compareSync(password, user.passwordHash);
  } catch {
    valid = password === user.passwordHash;
  }
  if (!valid) return c.json({ error: "Email atau password salah" }, 401);
  await setSessionCookie(c, { userId: user.id, email: user.email, name: user.name, role: user.role, desaId: user.desaId, kelompokId: user.kelompokId, generusId: user.generusId }, c.env);
  return c.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    const first = (result.error as any).issues?.[0]?.message || "Input tidak valid";
    return c.json({ error: first }, 400);
  }
  const { name, email, password, desaId, kelompokId, jenisKelamin, kategoriUsia, kategori, namaOrtu, tempatLahir, tanggalLahir, noTelp, noTelpOrtu, alamat, foto } = result.data as any;
  const db = getDb(c.env);
  const existing: any = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) return c.json({ error: "Email sudah terdaftar" }, 409);
  let passwordHash: string;
  try {
    const bcrypt = await import("bcryptjs");
    passwordHash = bcrypt.hashSync(password, 12);
  } catch { passwordHash = password; }
  const id = crypto.randomUUID();
  const assignedRole = kategori === "Usia Mandiri" ? "usia_mandiri" : "generus";
  const generusId = crypto.randomUUID();
  const prefix = assignedRole === "generus" ? "G" : "P";
  const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  let passwordPlain: string | null = null;
  try {
    const { encryptPasswordSymmetric } = await import("../services/crypto");
    passwordPlain = await encryptPasswordSymmetric(c.env, password);
  } catch { passwordPlain = null; }
  await db.insert(generus).values({ id: generusId, nomorUnik, nama: name, jenisKelamin: jenisKelamin === "P" ? "P" : "L", kategoriUsia: (kategoriUsia || "Mandiri") as any, kategori: kategori as any, namaOrtu, tempatLahir, tanggalLahir, alamat, noTelp, noTelpOrtu, desaId: Number(desaId), kelompokId: Number(kelompokId), isGenerus: 1, foto: foto || null } as any);
  await db.insert(users).values({ id, name, email: email.toLowerCase(), passwordHash, passwordPlain, role: assignedRole as any, desaId: Number(desaId), kelompokId: Number(kelompokId), generusId } as any);
  return c.json({ success: true, nomorUnik });
});

auth.post("/logout", async (c) => {
  await clearSessionCookie(c);
  return c.json({ success: true });
});

auth.get("/me", async (c) => {
  const token = extractToken(c);
  if (!token || isTokenRevoked(token)) return c.json({ user: null }, 200);
  const payload = await verifyToken(token, c.env);
  if (!payload) return c.json({ user: null }, 200);
  return c.json({ user: payload });
});

auth.post("/reset-password", async (c) => {
  const { email, newPassword } = await c.req.json().catch(() => ({}));
  if (!email || !newPassword || String(newPassword).length < 8) return c.json({ error: "Email dan password baru (min 8) wajib" }, 400);
  const cleanEmail = sanitizeString(String(email)).toLowerCase();
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq(users.email, cleanEmail) });
  if (!user) return c.json({ error: "Email tidak ditemukan" }, 404);
  let hash: string;
  try {
    const bcrypt = await import("bcryptjs");
    hash = bcrypt.hashSync(String(newPassword), 12);
  } catch { hash = String(newPassword); }
  let plain: string | null = null;
  try {
    const { encryptPasswordSymmetric } = await import("../services/crypto");
    plain = await encryptPasswordSymmetric(c.env, String(newPassword));
  } catch {}
  await db.update(users).set({ passwordHash: hash, passwordPlain: plain } as any).where(eq(users.id, user.id));
  return c.json({ success: true });
});

// Public lookups for register form
auth.get("/desa", async (c) => {
  const db = getDb(c.env);
  const { desa } = await import("../../../shared/schema");
  const rows = await db.select().from(desa);
  return c.json(rows);
});
auth.get("/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  const db = getDb(c.env);
  const { kelompok } = await import("../../../shared/schema");
  const rows = desaId ? await db.select().from(kelompok).where(eq(kelompok.desaId, Number(desaId))) : await db.select().from(kelompok);
  return c.json(rows);
});

export default auth;
