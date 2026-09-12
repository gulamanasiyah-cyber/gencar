import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../shared/schema";
import { haversineM } from "../../shared/validation";
import authRoutes from "./routes/auth";
import generusRoutes from "./routes/generus";
import kegiatanRoutes from "./routes/kegiatan";
import absensiRoutes from "./routes/absensi";
import artikelRoutes from "./routes/artikel";
import beritaRoutes from "./routes/berita";
import statistikRoutes from "./routes/statistik";
import adminRoutes from "./routes/admin";
import rabRoutes from "./routes/rab";
import rundownRoutes from "./routes/rundown";
import miscRoutes from "./routes/misc";
import publicRoutes from "./routes/public";
import cmsRoutes from "./routes/cms";
import { uaBlock, rateLimitAuth, bodyLimit } from "./middleware/security";
import { requireCsrf } from "./middleware/csrf";

type Env = { DB: D1Database; KV?: KVNamespace; R2_BUCKET?: R2Bucket; JWT_SECRET: string; DAERAH_NAMA?: string } & Record<string, unknown>;

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin: string) => (origin ? origin : "*"),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use("/*", uaBlock());
app.use("/*", rateLimitAuth());
app.use("/*", bodyLimit());
app.use("/*", requireCsrf());

app.onError((err, c) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  console.error("[onError]", msg);
  // Return JSON even for DELETE — ensure 500 body is readable
  try {
    return c.json({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined }, 500);
  } catch {
    return c.text(`onError: ${msg}`, 500);
  }
});

app.get("/api/health", (c) => c.json({ ok: true, daerah: (c.env.DAERAH_NAMA as string) || "Cengkareng" }));

function db(c: any) { return drizzle(c.env.DB, { schema }); }

// ── Auth (no prefix auth needed — mounted at /api/auth) ──
app.route("/api/auth", authRoutes);

// ── Core domain routes ──
app.route("/api/generus", generusRoutes);
app.route("/api/kegiatan", kegiatanRoutes);
app.route("/api/absensi", absensiRoutes);
app.route("/api/artikel", artikelRoutes);
app.route("/api/berita", beritaRoutes);
app.route("/api/statistik", statistikRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/rab", rabRoutes);
app.route("/api/rundown", rundownRoutes);
app.route("/api/public", publicRoutes);
app.route("/api/cms", cmsRoutes);
// misc hosts /api/scanner, /api/sholat, /api/upload, /api/download, /api/images, /api/dashboard/stats, /api/settings, /api/profile, /api/fcm, /api/webhook
app.route("/api", miscRoutes);

// ── Magic link (Buka Akses Login) — 15 menit, sekali pakai ──
app.post("/api/auth/magic/generate", async (c) => {
  // Admin-only: require valid session
  const { extractToken, verifyToken } = await import("./middleware/auth");
  const token = extractToken(c);
  const payload: any = token ? await verifyToken(token, c.env) : null;
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  const role = String(payload.role ?? "").toLowerCase();
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(role)) return c.json({ error: "Hanya admin dapat membuat magic link" }, 403);

  const { generusId } = await c.req.json().catch(() => ({} as any));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  // Pastikan generus ada dan dalam scope admin
  const exists: any = await (c.env.DB as any).prepare("SELECT id, desa_id, kelompok_id FROM generus WHERE id = ?").bind(String(generusId)).first();
  if (!exists) return c.json({ error: "Generus tidak ditemukan" }, 404);
  if (role === "admin_kelompok" && payload.kelompokId && exists.kelompok_id !== payload.kelompokId) {
    return c.json({ error: "Tidak diizinkan membuat link untuk generus di luar kelompok Anda" }, 403);
  }
  if (role === "admin_desa" && payload.desaId && exists.desa_id !== payload.desaId) {
    return c.json({ error: "Tidak diizinkan membuat link untuk generus di luar desa Anda" }, 403);
  }

  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const d = db(c);
  await d.insert(schema.magicTokens).values({ id: crypto.randomUUID(), generusId: String(generusId), email: String(generusId), tokenHash: hash, expiresAt } as any);
  return c.json({ token: rawToken, expiresAt });
});

app.get("/api/auth/magic/verify", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "token wajib" }, 400);
  const hash = await sha256(token);
  const found: any = await (c.env.DB as any).prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);

  // Cari user & generus info beserta desa & kelompok
  const generusId = String(found.generus_id);
  const userRow: any = await (c.env.DB as any).prepare("SELECT email FROM users WHERE generus_id = ?").bind(generusId).first();
  const generusRow: any = await (c.env.DB as any).prepare(`
    SELECT g.nama, g.nomor_unik, d.nama as desa_nama, k.nama as kelompok_nama 
    FROM generus g 
    LEFT JOIN desa d ON g.desa_id = d.id 
    LEFT JOIN kelompok k ON g.kelompok_id = k.id 
    WHERE g.id = ?
  `).bind(generusId).first();

  return c.json({
    ok: true,
    generusId: found.generus_id,
    expiresAt: found.expires_at,
    email: userRow?.email ?? null,
    nama: generusRow?.nama ?? null,
    nomorUnik: generusRow?.nomor_unik ?? null,
    desa: generusRow?.desa_nama ?? null,
    kelompok: generusRow?.kelompok_nama ?? null,
  });
});

app.post("/api/auth/magic/set-password", async (c) => {
  const { token, password, email } = await c.req.json().catch(() => ({} as any));
  if (!token || !password) return c.json({ error: "Token dan password wajib" }, 400);
  if (String(password).length < 8) return c.json({ error: "Password minimal 8 karakter" }, 400);
  const hash = await sha256(String(token));
  const found: any = await (c.env.DB as any).prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);
  const generusId = String(found.generus_id);
  const dbInst = db(c);
  const { users } = schema;
  const { eq, and, ne } = await import("drizzle-orm");
  const user: any = await dbInst.query.users.findFirst({ where: eq(users.generusId, generusId) });
  if (!user) return c.json({ error: "User untuk generus ini tidak ditemukan. Hubungi admin." }, 404);

  let finalEmail = user.email;
  if (email && typeof email === "string" && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return c.json({ error: "Format email tidak valid" }, 400);
    }
    const existingOther: any = await dbInst.query.users.findFirst({
      where: and(eq(users.email, cleanEmail), ne(users.id, user.id)),
    });
    if (existingOther) {
      return c.json({ error: "Email sudah digunakan oleh akun lain" }, 409);
    }
    finalEmail = cleanEmail;
  }

  let passwordHash: string;
  try {
    const bcrypt: any = await import("bcryptjs");
    passwordHash = bcrypt.hashSync(String(password), 12);
  } catch { passwordHash = String(password); }
  let passwordPlain: string | null = null;
  try {
    const { encryptPasswordSymmetric } = await import("./services/crypto");
    passwordPlain = await encryptPasswordSymmetric(c.env as any, String(password));
  } catch {}
  await dbInst.update(users).set({ email: finalEmail, passwordHash, passwordPlain } as any).where(eq(users.id, user.id));
  await (c.env.DB as any).prepare("UPDATE magic_tokens SET consumed_at = datetime('now') WHERE token_hash = ?").bind(hash).run();
  // Auto-login: create session cookie
  const { setSessionCookie } = await import("./middleware/auth");
  const { setCsrfCookie } = await import("./middleware/csrf");
  const bearer = await setSessionCookie(c, { userId: user.id, email: finalEmail, name: user.name, role: user.role, desaId: user.desaId, kelompokId: user.kelompokId, generusId: user.generusId } as any, c.env);
  setCsrfCookie(c);
  return c.json({ success: true, token: bearer, email: finalEmail });
});

// ── Registrasi Mandiri via Invite Link (Scoped per Admin) ──
app.post("/api/auth/invite/create", async (c) => {
  const { extractToken, verifyToken } = await import("./middleware/auth");
  const token = extractToken(c);
  const payload: any = token ? await verifyToken(token, c.env) : null;
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  const role = String(payload.role ?? "").toLowerCase();
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(role)) {
    return c.json({ error: "Hanya admin yang dapat membuat link registrasi" }, 403);
  }

  const { durationMinutes, durationLabel, desaId: reqDesaId, kelompokId: reqKelompokId } = await c.req.json().catch(() => ({} as any));

  let desaId: number | null = null;
  let kelompokId: number | null = null;

  if (role === "admin_kelompok") {
    desaId = payload.desaId ? Number(payload.desaId) : null;
    kelompokId = payload.kelompokId ? Number(payload.kelompokId) : null;
  } else if (role === "admin_desa") {
    desaId = payload.desaId ? Number(payload.desaId) : null;
    kelompokId = reqKelompokId ? Number(reqKelompokId) : null;
  } else {
    // admin_daerah
    desaId = reqDesaId ? Number(reqDesaId) : null;
    kelompokId = reqKelompokId ? Number(reqKelompokId) : null;
  }

  let expiresAt: string | null = null;
  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  }

  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(rawToken);
  const inviteId = crypto.randomUUID();

  const d = db(c);
  await d.insert(schema.invites).values({
    id: inviteId,
    tokenHash: hash,
    scopeRole: role as any,
    desaId,
    kelompokId,
    createdBy: String(payload.userId || payload.email || "admin"),
    status: "open",
    durationLabel: durationLabel || (durationMinutes ? `${durationMinutes} menit` : "Tanpa batas"),
    expiresAt,
  } as any);

  return c.json({
    success: true,
    id: inviteId,
    token: rawToken,
    expiresAt,
    durationLabel: durationLabel || (durationMinutes ? `${durationMinutes} menit` : "Tanpa batas"),
  });
});

app.get("/api/auth/invite/list", async (c) => {
  const { extractToken, verifyToken } = await import("./middleware/auth");
  const token = extractToken(c);
  const payload: any = token ? await verifyToken(token, c.env) : null;
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  const role = String(payload.role ?? "").toLowerCase();
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(role)) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const rows: any[] = await (c.env.DB as any).prepare(`
    SELECT i.id, i.scope_role, i.desa_id, i.kelompok_id, i.status, i.duration_label, i.expires_at, i.consumed_at, i.created_at,
           d.nama as desa_nama, k.nama as kelompok_nama
    FROM invites i
    LEFT JOIN desa d ON i.desa_id = d.id
    LEFT JOIN kelompok k ON i.kelompok_id = k.id
    WHERE i.created_by = ? OR (i.scope_role = ? AND (i.desa_id = ? OR i.desa_id IS NULL))
    ORDER BY i.created_at DESC
    LIMIT 30
  `).bind(
    String(payload.userId || payload.email || ""),
    role,
    payload.desaId || null
  ).all().then((r: any) => r.results || []);

  return c.json(rows);
});

app.post("/api/auth/invite/revoke", async (c) => {
  const { extractToken, verifyToken } = await import("./middleware/auth");
  const token = extractToken(c);
  const payload: any = token ? await verifyToken(token, c.env) : null;
  if (!payload) return c.json({ error: "Unauthorized" }, 401);
  const role = String(payload.role ?? "").toLowerCase();
  if (!["admin_daerah", "admin_desa", "admin_kelompok"].includes(role)) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const { id } = await c.req.json().catch(() => ({} as any));
  if (!id) return c.json({ error: "id wajib" }, 400);

  await (c.env.DB as any).prepare("UPDATE invites SET status = 'revoked' WHERE id = ?").bind(String(id)).run();
  return c.json({ success: true });
});

app.get("/api/auth/invite/resolve", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "Token wajib disertakan" }, 400);
  const hash = await sha256(token);

  const found: any = await (c.env.DB as any).prepare("SELECT * FROM invites WHERE token_hash = ?").bind(hash).first();
  if (!found) return c.json({ error: "Link pendaftaran tidak valid atau tidak ditemukan" }, 404);
  if (found.status === "revoked") return c.json({ error: "Link pendaftaran ini telah dicabut oleh admin" }, 410);
  if (found.status === "used") return c.json({ error: "Link pendaftaran ini sudah pernah digunakan" }, 410);
  if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
    return c.json({ error: "Link pendaftaran telah kadaluarsa" }, 410);
  }

  let desaNama: string | null = null;
  let kelompokNama: string | null = null;
  if (found.desa_id) {
    const dRow: any = await (c.env.DB as any).prepare("SELECT nama FROM desa WHERE id = ?").bind(found.desa_id).first();
    desaNama = dRow?.nama || null;
  }
  if (found.kelompok_id) {
    const kRow: any = await (c.env.DB as any).prepare("SELECT nama FROM kelompok WHERE id = ?").bind(found.kelompok_id).first();
    kelompokNama = kRow?.nama || null;
  }

  return c.json({
    ok: true,
    scopeRole: found.scope_role,
    desaId: found.desa_id,
    kelompokId: found.kelompok_id,
    desaNama,
    kelompokNama,
    expiresAt: found.expires_at,
    durationLabel: found.duration_label,
  });
});

app.post("/api/auth/invite/register", async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const {
    token, nama, email, password, jenisKelamin, kategoriUsia, kategoriMudaMudi, asalDaerah,
    tempatLahir, tanggalLahir, noTelp, noTelpOrtu, namaOrtu, domisiliAnak, isOrtuSama, domisiliOrtu,
    alamat, pendidikan, pekerjaan, hobi, hobiDetail, avatarId, foto, desaId: overrideDesaId, kelompokId: overrideKelompokId
  } = body;

  if (!token) return c.json({ error: "Token registrasi wajib" }, 400);
  const hash = await sha256(String(token));
  const invite: any = await (c.env.DB as any).prepare("SELECT * FROM invites WHERE token_hash = ?").bind(hash).first();
  if (!invite) return c.json({ error: "Link registrasi tidak valid" }, 404);
  if (invite.status === "revoked") return c.json({ error: "Link registrasi ini telah dicabut oleh admin" }, 410);
  if (invite.status === "used") return c.json({ error: "Link registrasi ini sudah pernah digunakan" }, 410);
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return c.json({ error: "Link registrasi telah kadaluarsa" }, 410);
  }

  if (!nama || !nama.trim()) return c.json({ error: "Nama lengkap wajib diisi" }, 400);
  if (!jenisKelamin || (jenisKelamin !== "L" && jenisKelamin !== "P")) return c.json({ error: "Jenis kelamin wajib dipilih (L/P)" }, 400);
  if (!tempatLahir || !tempatLahir.trim()) return c.json({ error: "Tempat lahir wajib diisi" }, 400);
  if (!tanggalLahir) return c.json({ error: "Tanggal lahir wajib diisi" }, 400);
  if (!noTelp || !noTelp.trim()) return c.json({ error: "Nomor WhatsApp / HP wajib diisi" }, 400);
  if (!password || String(password).length < 8) return c.json({ error: "Kata sandi minimal 8 karakter" }, 400);
  if (!email || !email.trim()) return c.json({ error: "Email Google / akun wajib diisi" }, 400);

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) return c.json({ error: "Format email tidak valid" }, 400);

  const dbInst = db(c);
  const { users, generus, desa, kelompok } = schema;
  const { eq, or, and } = await import("drizzle-orm");

  // Cek duplikasi email
  const existingUser: any = await dbInst.query.users.findFirst({ where: eq(users.email, cleanEmail) });
  if (existingUser) return c.json({ error: "Email sudah digunakan oleh akun lain. Gunakan email lain." }, 409);

  // Cek duplikasi generus (nama + tanggalLahir atau noTelp)
  const dupes: any = await dbInst.query.generus.findFirst({
    where: or(
      and(eq(generus.nama, nama.trim()), eq(generus.tanggalLahir, String(tanggalLahir))),
      eq(generus.noTelp, noTelp.trim())
    ),
  });
  if (dupes) {
    return c.json({ error: `Data anggota dengan nama "${nama}" atau nomor HP "${noTelp}" sudah terdaftar.` }, 409);
  }

  // Tentukan desaId & kelompokId berdasarkan scope invite
  let finalDesaId: number | null = invite.desa_id || null;
  let finalKelompokId: number | null = invite.kelompok_id || null;

  if (invite.scope_role === "admin_daerah") {
    if (overrideDesaId) finalDesaId = Number(overrideDesaId);
    if (overrideKelompokId) finalKelompokId = Number(overrideKelompokId);
  } else if (invite.scope_role === "admin_desa") {
    finalDesaId = invite.desa_id;
    if (overrideKelompokId) finalKelompokId = Number(overrideKelompokId);
  }

  const generusId = crypto.randomUUID();
  const nomorUnik = `GNR${Math.floor(100000 + Math.random() * 900000)}`;

  let passwordHash: string;
  try {
    const bcrypt: any = await import("bcryptjs");
    passwordHash = bcrypt.hashSync(String(password), 12);
  } catch { passwordHash = String(password); }

  let passwordPlain: string | null = null;
  try {
    const { encryptPasswordSymmetric } = await import("./services/crypto");
    passwordPlain = await encryptPasswordSymmetric(c.env as any, String(password));
  } catch {}

  await dbInst.insert(generus).values({
    id: generusId,
    nomorUnik,
    nama: nama.trim(),
    namaOrtu: namaOrtu ? namaOrtu.trim() : null,
    tempatLahir: tempatLahir.trim(),
    tanggalLahir: String(tanggalLahir),
    jenisKelamin: jenisKelamin === "P" ? "P" : "L",
    kategoriUsia: (kategoriUsia || "Mandiri") as any,
    kategori: "Generus",
    kategoriMudaMudi: kategoriMudaMudi || "pribumi",
    asalDaerah: asalDaerah ? asalDaerah.trim() : null,
    domisiliAnak: domisiliAnak ? domisiliAnak.trim() : (alamat ? alamat.trim() : null),
    domisiliOrtu: domisiliOrtu ? domisiliOrtu.trim() : null,
    isDomisiliOrtuSama: isOrtuSama != null ? (isOrtuSama ? 1 : 0) : 1,
    alamat: alamat ? alamat.trim() : (domisiliAnak ? domisiliAnak.trim() : null),
    noTelp: noTelp.trim(),
    noTelpOrtu: noTelpOrtu ? noTelpOrtu.trim() : null,
    pendidikan: pendidikan || "SMA",
    pekerjaan: pekerjaan ? pekerjaan.trim() : null,
    hobi: hobi || null,
    hobiDetail: hobiDetail || null,
    avatarId: avatarId || null,
    foto: foto || null,
    desaId: finalDesaId,
    kelompokId: finalKelompokId,
    isGenerus: 1,
    createdBy: invite.created_by,
  } as any);

  const userId = crypto.randomUUID();
  await dbInst.insert(users).values({
    id: userId,
    name: nama.trim(),
    email: cleanEmail,
    passwordHash,
    passwordPlain,
    role: "generus",
    generusId,
    desaId: finalDesaId,
    kelompokId: finalKelompokId,
  } as any);

  // Tandai invite digunakan
  await (c.env.DB as any).prepare("UPDATE invites SET status = 'used', consumed_at = datetime('now') WHERE id = ?").bind(invite.id).run();

  // Ambil nama desa & kelompok untuk info kartu
  let desaNama = "";
  let kelompokNama = "";
  if (finalDesaId) {
    const dRow: any = await (c.env.DB as any).prepare("SELECT nama FROM desa WHERE id = ?").bind(finalDesaId).first();
    desaNama = dRow?.nama || "";
  }
  if (finalKelompokId) {
    const kRow: any = await (c.env.DB as any).prepare("SELECT nama FROM kelompok WHERE id = ?").bind(finalKelompokId).first();
    kelompokNama = kRow?.nama || "";
  }

  // Auto-login session cookie
  const { setSessionCookie } = await import("./middleware/auth");
  const { setCsrfCookie } = await import("./middleware/csrf");
  const bearer = await setSessionCookie(c, {
    userId,
    email: cleanEmail,
    name: nama.trim(),
    role: "generus",
    desaId: finalDesaId,
    kelompokId: finalKelompokId,
    generusId,
  } as any, c.env);
  setCsrfCookie(c);

  return c.json({
    success: true,
    token: bearer,
    member: {
      id: generusId,
      nama: nama.trim(),
      nomorUnik,
      desa: desaNama,
      kelompok: kelompokNama,
      email: cleanEmail,
      password: String(password),
    },
  });
});

app.post("/api/absensi/scan", async (c) => {
  const { qrToken, lat, lng, accuracy, generusId } = await c.req.json().catch(() => ({} as any));
  if (!qrToken || !generusId) return c.json({ error: "qrToken & generusId wajib" }, 400);
  const qr: any = await (c.env.DB as any).prepare("SELECT * FROM wilayah_qr WHERE qr_token = ?").bind(qrToken).first();
  if (!qr) return c.json({ error: "QR tidak dikenal" }, 404);
  const today = new Date().toISOString().slice(0, 10);
  let kegs: any[] = [];
  if (qr.level === "daerah") kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id IS NULL AND kelompok_id IS NULL").bind(today).all().then((r: any) => r.results || []);
  else if (qr.level === "desa") kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id = ? AND kelompok_id IS NULL").bind(today, qr.desa_id).all().then((r: any) => r.results || []);
  else kegs = await (c.env.DB as any).prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND kelompok_id = ?").bind(today, qr.kelompok_id).all().then((r: any) => r.results || []);
  // Acara gabungan: sertakan acara yang mengundang scope QR ini (undangan approved saja).
  // Tanpa ini, tamu undangan scan QR wilayahnya sendiri selalu 404.
  try {
    const ownedIds = new Set(kegs.map((k: any) => k.id));
    const scopeOrs: string[] = [];
    const scopeArgs: any[] = [];
    if (generusId) { scopeOrs.push("p.generus_id = ?"); scopeArgs.push(String(generusId)); }
    if (qr.level === "desa" && qr.desa_id != null) { scopeOrs.push("p.desa_id = ?"); scopeArgs.push(qr.desa_id); }
    else if (qr.level === "kelompok" && qr.kelompok_id != null) {
      scopeOrs.push("p.kelompok_id = ?"); scopeArgs.push(qr.kelompok_id);
      let parentDesa = qr.desa_id;
      if (parentDesa == null) {
        const krow: any = await (c.env.DB as any).prepare("SELECT desa_id FROM kelompok WHERE id = ?").bind(qr.kelompok_id).first();
        parentDesa = krow?.desa_id ?? null;
      }
      if (parentDesa != null) { scopeOrs.push("p.desa_id = ?"); scopeArgs.push(parentDesa); }
    }
    if (scopeOrs.length > 0) {
      const invited: any[] = await (c.env.DB as any).prepare(
        `SELECT DISTINCT k.* FROM kegiatan k JOIN kegiatan_peserta p ON p.kegiatan_id = k.id WHERE k.tanggal = ? AND p.status = 'approved' AND (${scopeOrs.join(" OR ")})`
      ).bind(today, ...scopeArgs).all().then((r: any) => r.results || []);
      for (const k of invited) if (!ownedIds.has(k.id)) { ownedIds.add(k.id); kegs.push(k); }
    }
  } catch {}
  if (kegs.length === 0) return c.json({ error: "Tidak ada kegiatan aktif di wilayah ini", kegiatan: [] }, 404);
  if (kegs.length === 1) {
    const k = kegs[0];
    const gps = gpsCheck(k, lat, lng, accuracy);
    if (!gps.ok && k.gps_required) return c.json({ error: gps.reason, kegiatanId: k.id }, 403);
    return c.json({ ok: true, kegiatanId: k.id, gps, needPick: false });
  }
  const filtered = kegs.filter((k: any) => {
    if (k.lat == null || k.lng == null || lat == null || lng == null) return true;
    const d = haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng));
    return d <= (Number(k.radius_m) || 100) + 10;
  });
  if (filtered.length === 0) return c.json({ error: "Tidak ada kegiatan dalam radius GPS", kegiatan: kegs }, 404);
  if (filtered.length === 1) {
    const k = filtered[0];
    const gps = gpsCheck(k, lat, lng, accuracy);
    if (!gps.ok && k.gps_required) return c.json({ error: gps.reason, kegiatanId: k.id }, 403);
    return c.json({ ok: true, kegiatanId: k.id, gps, needPick: false });
  }
  const withGps = filtered.map((k: any) => ({ ...k, _gps: gpsCheck(k, lat, lng, accuracy), _distanceM: k.lat != null && lat != null ? Math.round(haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng))) : null }));
  return c.json({ needPick: true, kegiatan: withGps });
});

function gpsCheck(k: any, lat: any, lng: any, accuracy: any) {
  if (k.lat == null || k.lng == null) return { ok: true, reason: null };
  if (lat == null || lng == null) return { ok: true, reason: "GPS tidak tersedia — advisory" };
  if (accuracy != null && Number(accuracy) > 100) return { ok: false, reason: "Akurasi GPS buruk (>100m)" };
  const d = haversineM(Number(lat), Number(lng), Number(k.lat), Number(k.lng));
  const radius = Number(k.radius_m) || 100;
  if (d > radius + 10) return { ok: false, reason: `Di luar radius (${Math.round(d)}m > ${radius}m)` };
  return { ok: true, reason: null, distanceM: Math.round(d) };
}

// ── Internal / Test trigger: manual sweep alpha (bisa dipanggil admin atau test script) ──
app.post("/api/_internal/alpha-sweep", async (c) => {
  const { runAlphaSweep } = await import("./jobs/alphaSweep");
  const summary = await runAlphaSweep({ DB: c.env.DB });
  return c.json({ success: true, ...summary });
});

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Cloudflare Worker scheduled handler (Cron Trigger setiap 15 menit) ──
async function scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
  const { runAlphaSweep } = await import("./jobs/alphaSweep");
  ctx.waitUntil(runAlphaSweep({ DB: env.DB }));
}

export default {
  fetch: app.fetch,
  scheduled,
};
