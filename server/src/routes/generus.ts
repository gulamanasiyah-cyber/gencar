import { Hono } from "hono";
import { eq, and, or, like, sql, not, isNull, isNotNull, notInArray } from "drizzle-orm";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah, formPanitiaDanPengurus, settings, mandiriAbsensi } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";
import { decryptPasswordSymmetric, encryptPasswordSymmetric } from "../services/crypto";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

function generateNomorUnik() { return `GNR${Math.floor(100000 + Math.random() * 900000)}`; }

function buildWhereClause(session: any, search?: string, ignoreRoleRestriction?: boolean, statusNikah?: string, desaId?: string, kelompokId?: string, jenisKelamin?: string, status?: string, kategoriUsia?: string, notInMandiri?: boolean, isGenerus?: boolean, pendidikan?: string, mandiriDesaId?: string, mandiriDaerahId?: string, mandiriKelompokId?: string, isPnkb?: boolean) {
  const conditions: any[] = [];
  if (isPnkb) conditions.push(or(like(generus.nomorUnik, 'PNKB-%'), like(generus.nomorUnik, 'PNB-%')));
  else if (isGenerus) {
    conditions.push(eq(generus.isGenerus, 1));
    conditions.push(and(not(like(generus.nomorUnik, 'PNKB-%')), not(like(generus.nomorUnik, 'PNB-%'))));
    conditions.push(or(isNull(users.role), notInArray(users.role, ["tim_pnkb", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator"] as any)));
  }
  if (notInMandiri) conditions.push(isNull(mandiri.id));
  if (!ignoreRoleRestriction) {
    if ((session?.role === "desa" || (session?.role === "tim_pnkb" && !session.kelompokId)) && session.desaId) conditions.push(eq(generus.desaId, session.desaId));
    else if ((session?.role === "kelompok" || (session?.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId) conditions.push(eq(generus.kelompokId, session.kelompokId));
  }
  if (desaId && desaId !== "all" && !isNaN(Number(desaId))) conditions.push(eq(generus.desaId, Number(desaId)));
  if (kelompokId && kelompokId !== "all" && !isNaN(Number(kelompokId))) conditions.push(eq(generus.kelompokId, Number(kelompokId)));
  if (mandiriDesaId && mandiriDesaId !== "all" && !isNaN(Number(mandiriDesaId))) conditions.push(eq(generus.mandiriDesaId, Number(mandiriDesaId)));
  if (mandiriDaerahId && mandiriDaerahId !== "all" && !isNaN(Number(mandiriDaerahId))) conditions.push(eq(mandiriDesa.mandiriDaerahId, Number(mandiriDaerahId)));
  if (mandiriKelompokId && mandiriKelompokId !== "all" && !isNaN(Number(mandiriKelompokId))) conditions.push(eq(generus.mandiriKelompokId, Number(mandiriKelompokId)));
  if (statusNikah && statusNikah !== "all") conditions.push(eq(generus.statusNikah, statusNikah as any));
  if (kategoriUsia && kategoriUsia !== "all") conditions.push(eq(generus.kategoriUsia, kategoriUsia as any));
  if (pendidikan && pendidikan !== "all") {
    if (/^[SD][1-4]$/i.test(pendidikan)) {
      const char = pendidikan[0].toUpperCase(); const num = pendidikan[1];
      conditions.push(or(like(generus.pendidikan, `${char}${num}%`), like(generus.pendidikan, `${char}-${num}%`), like(generus.pendidikan, `${char} ${num}%`), like(generus.pendidikan, `${char}.${num}%`)));
    } else conditions.push(like(generus.pendidikan, `${pendidikan}%`));
  }
  if (search) {
    const t = search.trim();
    if (/^GNR\d+$/i.test(t)) conditions.push(eq(generus.nomorUnik, t.toUpperCase()));
    else if (/^\d+$/.test(t)) conditions.push(eq(mandiri.nomorUrut, Number(t)));
    else conditions.push(or(like(generus.nama, `%${t}%`), like(generus.nomorUnik, `%${t}%`), like(mandiri.nomorUrut, `%${t}%`), like(mandiriDaerah.nama, `%${t}%`), like(mandiriDesa.nama, `%${t}%`), like(desa.nama, `%${t}%`), like(kelompok.nama, `%${t}%`), like(generus.alamat, `%${t}%`), like(formPanitiaDanPengurus.dapukan, `%${t}%`)));
  }
  if (jenisKelamin && (jenisKelamin === "L" || jenisKelamin === "P")) conditions.push(eq(generus.jenisKelamin, jenisKelamin as any));
  if (status === "panitia") conditions.push(or(not(or(isNull(users.role), eq(users.role, "generus"))!), isNotNull(formPanitiaDanPengurus.id)));
  else if (status === "peserta") conditions.push(and(or(isNull(users.role), eq(users.role, "generus")), isNull(formPanitiaDanPengurus.id)));
  return (conditions.length > 0 ? and(...conditions) : undefined) as any;
}

r.use("/*", requireAuth());

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const url = new URL(c.req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const statusNikah = url.searchParams.get("statusNikah") || "all";
  const desaId = url.searchParams.get("desaId") || "";
  const mandiriDaerahId = url.searchParams.get("mandiriDaerahId") || "";
  const mandiriDesaId = url.searchParams.get("mandiriDesaId") || "";
  const mandiriKelompokId = url.searchParams.get("mandiriKelompokId") || "";
  const kelompokId = url.searchParams.get("kelompokId") || "";
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "10");
  const all = url.searchParams.get("all") === "true";
  const mandiriOnly = url.searchParams.get("mandiriOnly") === "true";
  const notInMandiri = url.searchParams.get("notInMandiri") === "true";
  const isGenerusPage = url.searchParams.get("isGenerus") === "true";
  const isPnkb = url.searchParams.get("isPnkb") === "true";
  let filterIsGenerus = false;
  let kegiatanId = url.searchParams.get("kegiatanId") || "";
  const db = getDb(c.env);
  if (!kegiatanId) {
    const activeSetting: any = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    kegiatanId = activeSetting[0]?.value || "";
  }
  if ((!all && !mandiriOnly) || isGenerusPage) filterIsGenerus = true;
  const jenisKelamin = url.searchParams.get("jenisKelamin") || "all";
  const status = url.searchParams.get("status") || "all";
  const kategoriUsia = url.searchParams.get("kategoriUsia") || "all";
  const pendidikan = url.searchParams.get("pendidikan") || "all";
  const sortBy = url.searchParams.get("sortBy") || "nama";
  const order = url.searchParams.get("order") || "asc";
  const offset = (page - 1) * limit;
  const finalWhere = buildWhereClause(session, search, all, statusNikah, desaId, kelompokId, jenisKelamin, status, kategoriUsia, notInMandiri, filterIsGenerus, pendidikan, mandiriDesaId, mandiriDaerahId, mandiriKelompokId, isPnkb);
  let whereClause: any = finalWhere;
  if (mandiriOnly) {
    const matchExclude = sql`${generus.id} NOT IN (SELECT pengirim_id FROM mandiri_pemilihan WHERE status='Selesai' AND hasil_pengirim='Lanjut' AND hasil_penerima='Lanjut' UNION SELECT penerima_id FROM mandiri_pemilihan WHERE status='Selesai' AND hasil_pengirim='Lanjut' AND hasil_penerima='Lanjut')`;
    whereClause = whereClause ? and(whereClause, matchExclude) : matchExclude;
  }
  const canSeePrivateData = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb", "admin_pdkt"].includes(session.role);
  const commonSelect: any = {
    id: generus.id, nomorUnik: generus.nomorUnik, nama: generus.nama,
    email: canSeePrivateData ? users.email : sql`NULL`, passwordPlain: session.role === "admin" ? users.passwordPlain : sql`NULL`, role: users.role,
    desaNama: desa.nama, kelompokNama: kelompok.nama, foto: generus.foto, instagram: generus.instagram,
    tanggalLahir: generus.tanggalLahir, tempatLahir: generus.tempatLahir, kategoriUsia: generus.kategoriUsia, kategori: generus.kategori, jenisKelamin: generus.jenisKelamin,
    nomorUrut: mandiri.nomorUrut, mandiriDesaNama: mandiriDesa.nama, mandiriDesaKota: mandiriDaerah.nama, mandiriKelompokNama: mandiriKelompok.nama,
    noTelp: canSeePrivateData ? generus.noTelp : sql`NULL`, namaOrtu: canSeePrivateData ? generus.namaOrtu : sql`NULL`, alamat: generus.alamat, pendidikan: generus.pendidikan, pekerjaan: generus.pekerjaan, statusNikah: generus.statusNikah, suku: generus.suku, hobi: generus.hobi, makananMinumanFavorit: generus.makananMinumanFavorit, kriteriaPasangan: generus.kriteriaPasangan, createdAt: generus.createdAt, panitiaStatus: formPanitiaDanPengurus.dapukan, keterangan: mandiriAbsensi.keterangan,
    totalMemanggil: sql<number>`(SELECT COUNT(*) FROM mandiri_pemilihan WHERE mandiri_pemilihan.pengirim_id = ${generus.id} AND mandiri_pemilihan.kegiatan_id = ${kegiatanId})`,
    totalDipanggil: sql<number>`(SELECT COUNT(*) FROM mandiri_pemilihan WHERE mandiri_pemilihan.penerima_id = ${generus.id} AND mandiri_pemilihan.kegiatan_id = ${kegiatanId})`,
  };
  const orderByClause: any[] = [];
  if (sortBy === "nomorUrut") orderByClause.push(order === "desc" ? sql`${mandiri.nomorUrut} DESC` : sql`${mandiri.nomorUrut} ASC`);
  else orderByClause.push(order === "desc" ? sql`${generus.nama} DESC` : sql`${generus.nama} ASC`);

  const isExport = all === true;
  if (isExport) {
    let query: any = db.select(commonSelect).from(generus).leftJoin(users, eq(generus.id, users.generusId)).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id)).leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id)).leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id)).leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId)).leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)));
    query = mandiriOnly ? (query as any).innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId))) : (query as any).leftJoin(mandiri, eq(generus.id, mandiri.generusId));
    let data: any[] = await query.where(finalWhere).orderBy(...orderByClause);
    if (session.role === "admin") data = await Promise.all(data.map(async (item: any) => ({ ...item, passwordPlain: await decryptPasswordSymmetric(c.env, item.passwordPlain as string) })));
    return c.json({ data, total: data.length, page: 1, limit: data.length }, 200, { "Cache-Control": "private, max-age=60" } as any);
  }

  let dataQuery: any = db.select(commonSelect).from(generus).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).leftJoin(users, eq(generus.id, users.generusId)).leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id)).leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id)).leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id)).leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId)).leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)));
  dataQuery = mandiriOnly ? (dataQuery as any).innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId))) : (dataQuery as any).leftJoin(mandiri, eq(generus.id, mandiri.generusId));
  let countQuery: any = db.select({ count: sql<number>`count(*)` }).from(generus);
  if (status !== "all" || search || filterIsGenerus) countQuery = countQuery.leftJoin(users, eq(generus.id, users.generusId));
  if (search) { countQuery = countQuery.leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id)).leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id)).leftJoin(mandiri, eq(generus.id, mandiri.generusId)); }
  if (search || mandiriOnly || status !== "all") countQuery = countQuery.leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId));
  if (mandiriOnly) countQuery = countQuery.innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)));

  const [dataRaw, countResult] = await Promise.all([dataQuery.where(whereClause).orderBy(...orderByClause).limit(limit).offset(offset), countQuery.where(whereClause)]);
  let data: any[] = dataRaw;
  if (session.role === "admin") data = await Promise.all(data.map(async (item: any) => ({ ...item, passwordPlain: await decryptPasswordSymmetric(c.env, item.passwordPlain as string) })));
  return c.json({ data, total: Number(countResult[0]?.count || 0), page, limit }, 200, { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" } as any);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori, alamat, noTelp, noTelpOrtu, namaOrtu, pendidikan, pekerjaan, statusNikah, desaId, kelompokId, mandiriDesaId, mandiriKelompokId, hobi, makananMinumanFavorit, suku, foto } = body;
  if (!nama || !jenisKelamin || !kategoriUsia || (!desaId && !mandiriDesaId)) return c.json({ error: "Nama dan Wilayah wajib diisi" }, 400);
  const db = getDb(c.env);
  const duplicateConditions: any[] = [];
  if (nama && tanggalLahir) duplicateConditions.push(and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)));
  if (noTelp) duplicateConditions.push(eq(generus.noTelp, noTelp));
  const duplicate: any = duplicateConditions.length > 0 ? await db.query.generus.findFirst({ where: or(...duplicateConditions) }) : null;
  if (duplicate) return c.json({ error: `Data dengan Nama "${nama}" atau Nomor HP "${noTelp}" sudah terdaftar.` }, 400);
  if ((session.role === "kelompok") && session.kelompokId && session.kelompokId !== Number(kelompokId)) return c.json({ error: "Tidak diizinkan" }, 403);
  if ((session.role === "desa") && session.desaId && !session.kelompokId && session.desaId !== Number(desaId)) return c.json({ error: "Tidak diizinkan" }, 403);
  let nomorUnik = generateNomorUnik();
  let existing: any = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
  while (existing) { nomorUnik = generateNomorUnik(); existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) }); }
  const id = crypto.randomUUID();
  await db.insert(generus).values({ id, nomorUnik, nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori: kategori || "Generus", alamat, noTelp, noTelpOrtu, namaOrtu, pendidikan, pekerjaan, statusNikah: statusNikah || "Belum Menikah", desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null, mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null, hobi, makananMinumanFavorit, suku, foto, createdBy: session.userId, isGenerus: 1 } as any);
  let finalEmail = body.email ? String(body.email).toLowerCase() : `${nomorUnik.toLowerCase()}@gencar.com`;
  const finalPassword = body.password || nomorUnik;
  const existingEmail: any = await db.query.users.findFirst({ where: eq(users.email, finalEmail) });
  if (existingEmail) finalEmail = `${crypto.randomUUID().slice(0, 4)}_${finalEmail}`;
  let passwordHash: string;
  try { const bcrypt = await import("bcryptjs"); passwordHash = bcrypt.hashSync(finalPassword, 10); } catch { passwordHash = finalPassword; }
  let passwordPlain: string | null = null;
  try { passwordPlain = await encryptPasswordSymmetric(c.env, finalPassword); } catch {}
  await db.insert(users).values({ id: crypto.randomUUID(), name: nama, email: finalEmail, passwordHash, passwordPlain, role: "generus", generusId: id, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null } as any);
  return c.json({ success: true, id, nomorUnik });
});

// PATCH /:id, DELETE /:id, import, filters etc — delegated
r.get("/filters", async (c) => {
  const db = getDb(c.env);
  const desaRows = await db.select().from(desa);
  const kelompokRows = await db.select().from(kelompok);
  return c.json({ desa: desaRows, kelompok: kelompokRows });
});

r.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.generus.findFirst({ where: eq(generus.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});

r.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db.update(generus).set({ ...body, updatedAt: sql`(datetime('now'))` } as any).where(eq(generus.id, id));
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(generus).where(eq(generus.id, id));
  return c.json({ success: true });
});

export default r;
