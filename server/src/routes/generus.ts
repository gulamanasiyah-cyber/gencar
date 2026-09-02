import { Hono } from "hono";
import { eq, and, or, like, sql, not, isNull, isNotNull, notInArray } from "drizzle-orm";
import { generus, desa, kelompok, users, settings } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";
import { decryptPasswordSymmetric, encryptPasswordSymmetric } from "../services/crypto";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

function generateNomorUnik() { return `GNR${Math.floor(100000 + Math.random() * 900000)}`; }

function buildWhereClause(session: any, search?: string, _ignoreRoleRestriction?: boolean, statusNikah?: string, desaId?: string, kelompokId?: string, jenisKelamin?: string, _status?: string, kategoriUsia?: string, _notInMandiri?: boolean, isGenerus?: boolean, pendidikan?: string, _mandiriDesaId?: string, _mandiriDaerahId?: string, _mandiriKelompokId?: string, isPnkb?: boolean) {
  const conditions: any[] = [];
  if (isPnkb) conditions.push(or(like(generus.nomorUnik, 'PNKB-%'), like(generus.nomorUnik, 'PNB-%')));
  else if (isGenerus) {
    conditions.push(eq(generus.isGenerus, 1));
    conditions.push(and(not(like(generus.nomorUnik, 'PNKB-%')), not(like(generus.nomorUnik, 'PNB-%'))));
  }
  if (session?.role === "admin_desa" && session.desaId) conditions.push(eq(generus.desaId, session.desaId));
  else if (session?.role === "admin_kelompok" && session.kelompokId) conditions.push(eq(generus.kelompokId, session.kelompokId));
  if (desaId && desaId !== "all" && !isNaN(Number(desaId))) conditions.push(eq(generus.desaId, Number(desaId)));
  if (kelompokId && kelompokId !== "all" && !isNaN(Number(kelompokId))) conditions.push(eq(generus.kelompokId, Number(kelompokId)));
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
    else conditions.push(or(like(generus.nama, `%${t}%`), like(generus.nomorUnik, `%${t}%`), like(desa.nama, `%${t}%`), like(kelompok.nama, `%${t}%`), like(generus.alamat, `%${t}%`)));
  }
  if (jenisKelamin && (jenisKelamin === "L" || jenisKelamin === "P")) conditions.push(eq(generus.jenisKelamin, jenisKelamin as any));
  // Exclude admin accounts — they are not real anggota
  conditions.push(sql`${generus.id} NOT IN (SELECT generus_id FROM users WHERE generus_id IS NOT NULL AND role IN ('admin_daerah', 'admin_desa', 'admin_kelompok'))`);
  return (conditions.length > 0 ? and(...conditions) : undefined) as any;
}

r.use("/*", requireAuth());

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const url = new URL(c.req.url);
  const search = (url.searchParams.get("search") || url.searchParams.get("q") || "").trim();
  const statusNikah = url.searchParams.get("statusNikah") || "all";
  const desaId = url.searchParams.get("desaId") || "";
  const kelompokId = url.searchParams.get("kelompokId") || "";
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "10");
  const all = url.searchParams.get("all") === "true";
  const _mandiriOnly = url.searchParams.get("mandiriOnly") === "true";
  const _notInMandiri = url.searchParams.get("notInMandiri") === "true";
  const isGenerusPage = url.searchParams.get("isGenerus") === "true";
  const isPnkb = url.searchParams.get("isPnkb") === "true";
  let filterIsGenerus = false;
  let _kegiatanId = url.searchParams.get("kegiatanId") || "";
  const db = getDb(c.env);
  if (!_kegiatanId) {
    const activeSetting: any = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    _kegiatanId = activeSetting[0]?.value || "";
  }
  if (!all || isGenerusPage) filterIsGenerus = true;
  const jenisKelamin = url.searchParams.get("jenisKelamin") || "all";
  const status = url.searchParams.get("status") || "all";
  const kategoriUsia = url.searchParams.get("kategoriUsia") || "all";
  const pendidikan = url.searchParams.get("pendidikan") || "all";
  const sortBy = url.searchParams.get("sortBy") || "nama";
  const order = url.searchParams.get("order") || "asc";
  const offset = (page - 1) * limit;
  const finalWhere = buildWhereClause(session, search, all, statusNikah, desaId, kelompokId, jenisKelamin, status, kategoriUsia, _notInMandiri, filterIsGenerus, pendidikan, undefined, undefined, undefined, isPnkb);
  const whereClause: any = finalWhere;
  const canSeePrivateData = ["admin_daerah", "admin_desa", "admin_kelompok"].includes(session.role);
  const commonSelect: any = {
    id: generus.id, nomorUnik: generus.nomorUnik, nama: generus.nama,
    email: canSeePrivateData ? users.email : sql`NULL`, passwordPlain: session.role === "admin_daerah" ? users.passwordPlain : sql`NULL`, role: users.role,
    desaId: generus.desaId, kelompokId: generus.kelompokId, desaNama: desa.nama, kelompokNama: kelompok.nama, foto: generus.foto, avatarId: generus.avatarId, instagram: generus.instagram,
    tanggalLahir: generus.tanggalLahir, tempatLahir: generus.tempatLahir, kategoriUsia: generus.kategoriUsia, kategori: generus.kategori, jenisKelamin: generus.jenisKelamin,
    kategoriMudaMudi: generus.kategoriMudaMudi, asalDaerah: generus.asalDaerah, domisiliAnak: generus.domisiliAnak, domisiliOrtu: generus.domisiliOrtu, isDomisiliOrtuSama: generus.isDomisiliOrtuSama, hobi: generus.hobi, hobiDetail: generus.hobiDetail,
    noTelp: canSeePrivateData ? generus.noTelp : sql`NULL`, namaOrtu: canSeePrivateData ? generus.namaOrtu : sql`NULL`, alamat: generus.alamat, pendidikan: generus.pendidikan, pekerjaan: generus.pekerjaan, statusNikah: generus.statusNikah, suku: generus.suku, makananMinumanFavorit: generus.makananMinumanFavorit, kriteriaPasangan: generus.kriteriaPasangan, createdAt: generus.createdAt,
  };
  const orderByClause: any[] = [];
  orderByClause.push(order === "desc" ? sql`${generus.nama} DESC` : sql`${generus.nama} ASC`);

  const isExport = all === true;
  if (isExport) {
    let query: any = db.select(commonSelect).from(generus).leftJoin(users, eq(generus.id, users.generusId)).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id));
    let data: any[] = await query.where(finalWhere).orderBy(...orderByClause);
    if (session.role === "admin_daerah") data = await Promise.all(data.map(async (item: any) => ({ ...item, passwordPlain: await decryptPasswordSymmetric(c.env, item.passwordPlain as string) })));
    return c.json({ data, total: data.length, page: 1, limit: data.length, meta: { total: data.length, page: 1, limit: data.length } } as unknown as any, 200, { "Cache-Control": "private, max-age=60" } as any);
  }

  let dataQuery: any = db.select(commonSelect).from(generus).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).leftJoin(users, eq(generus.id, users.generusId));
  let countQuery: any = db.select({ count: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId));
  if (search) { countQuery = countQuery.leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)); }

  const [dataRaw, countResult] = await Promise.all([dataQuery.where(whereClause).orderBy(...orderByClause).limit(limit).offset(offset), countQuery.where(whereClause)]);
  let data: any[] = dataRaw;
  if (session.role === "admin_daerah") data = await Promise.all(data.map(async (item: any) => ({ ...item, passwordPlain: await decryptPasswordSymmetric(c.env, item.passwordPlain as string) })));
  return c.json({ data, total: Number(countResult[0]?.count || 0), page, limit, meta: { total: Number(countResult[0]?.count || 0), page, limit } } as unknown as any, 200, { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } as any);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { mapJenisKelaminToDb } = await import("../../../shared/validation");
  const rawJK = body.jenisKelamin ? mapJenisKelaminToDb(String(body.jenisKelamin)) : null;
  const jenisKelamin = rawJK ?? body.jenisKelamin;
  const { nama, tempatLahir, tanggalLahir, kategoriUsia, kategori, alamat, noTelp, noTelpOrtu, namaOrtu, pendidikan, pekerjaan, statusNikah, desaId, kelompokId, hobi, hobiDetail, avatarId, makananMinumanFavorit, suku, foto } = body;
  if (!nama || !jenisKelamin || !kategoriUsia || !desaId) return c.json({ error: "Nama dan Wilayah wajib diisi" }, 400);
  const db = getDb(c.env);
  const duplicateConditions: any[] = [];
  if (nama && tanggalLahir) duplicateConditions.push(and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)));
  if (noTelp) duplicateConditions.push(eq(generus.noTelp, noTelp));
  const duplicate: any = duplicateConditions.length > 0 ? await db.query.generus.findFirst({ where: or(...duplicateConditions) }) : null;
  if (duplicate) return c.json({ error: `Data dengan Nama "${nama}" atau Nomor HP "${noTelp}" sudah terdaftar.` }, 400);
  if (session.role === "admin_kelompok" && session.kelompokId && session.kelompokId !== Number(kelompokId)) return c.json({ error: "Tidak diizinkan" }, 403);
  if (session.role === "admin_desa" && session.desaId && !session.kelompokId && session.desaId !== Number(desaId)) return c.json({ error: "Tidak diizinkan" }, 403);
  let nomorUnik = generateNomorUnik();
  let existing: any = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
  while (existing) { nomorUnik = generateNomorUnik(); existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) }); }
  const id = crypto.randomUUID();
  await db.insert(generus).values({ id, nomorUnik, nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori: kategori || "Generus", alamat, noTelp, noTelpOrtu, namaOrtu, pendidikan, pekerjaan, statusNikah: statusNikah || "Belum Menikah", desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, hobi: hobi ?? null, hobiDetail: hobiDetail ?? null, avatarId: avatarId ?? null, makananMinumanFavorit, suku, foto, createdBy: session.userId, isGenerus: 1 } as any);
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
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const row: any = await db.query.generus.findFirst({ where: eq(generus.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && session.desaId && row.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && session.kelompokId && row.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);

  // Ambil data statistik kehadiran & absensi untuk perhitungan gamifikasi & streak
  const absensiRows = await db
    .select({
      id: absensi.id,
      kegiatanId: absensi.kegiatanId,
      timestamp: absensi.timestamp,
      keterangan: absensi.keterangan,
      tanggal: kegiatan.tanggal,
      jam: kegiatan.jam,
      kategoriAcara: kegiatan.kategoriAcara,
      tingkat: kegiatan.tingkat,
    })
    .from(absensi)
    .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
    .where(eq(absensi.generusId, id))
    .orderBy(sql`${kegiatan.tanggal} DESC, ${kegiatan.jam} DESC`);

  const hadirList = absensiRows.filter((a) => a.keterangan === "hadir");
  const izinList = absensiRows.filter((a) => a.keterangan === "izin");
  const alphaList = absensiRows.filter((a) => a.keterangan === "alpha");
  const totalAbsen = absensiRows.length;
  const hadirCount = hadirList.length;
  const rate = totalAbsen > 0 ? Math.round((hadirCount / totalAbsen) * 100) : 0;

  // Hitung streak beruntun dari riwayat terakhir
  let currentStreak = 0;
  for (const a of absensiRows) {
    if (a.keterangan === "hadir") {
      currentStreak++;
    } else {
      break;
    }
  }

  // Ringkasan trophy tercapai sederhana berbasis kehadiran & streak
  const trophiesUnlocked = [];
  if (hadirCount >= 1) trophiesUnlocked.push("pertama_kali");
  if (hadirCount >= 5) trophiesUnlocked.push("hadir_5");
  if (hadirCount >= 10) trophiesUnlocked.push("hadir_10");
  if (hadirCount >= 25) trophiesUnlocked.push("hadir_25");
  if (hadirCount >= 50) trophiesUnlocked.push("hadir_50");
  if (hadirCount >= 100) trophiesUnlocked.push("hadir_100");
  if (currentStreak >= 5) trophiesUnlocked.push("streak_5");
  if (currentStreak >= 10) trophiesUnlocked.push("streak_10");
  if (currentStreak >= 20) trophiesUnlocked.push("streak_20");
  if (currentStreak >= 40) trophiesUnlocked.push("streak_40");

  // Perhitungan keterlambatan: bandingkan jam kegiatan dengan timestamp absensi
  const riwayatTelat: { id: string; judul?: string; tanggal: string; jamKegiatan: string; jamAbsen: string; menit: number }[] = [];
  for (const a of absensiRows) {
    if (a.keterangan === "hadir" && a.jam && a.timestamp) {
      try {
        const [targetH, targetM] = a.jam.split(":").map(Number);
        // Tangani format "YYYY-MM-DD HH:mm:ss" atau ISO string
        let absenH = 0;
        let absenM = 0;
        if (a.timestamp.includes(" ")) {
          const timePart = a.timestamp.split(" ")[1] || "00:00";
          const [h, m] = timePart.split(":").map(Number);
          absenH = h ?? 0;
          absenM = m ?? 0;
        } else {
          const absenDate = new Date(a.timestamp);
          absenH = absenDate.getHours();
          absenM = absenDate.getMinutes();
        }
        const targetMinutes = (targetH ?? 0) * 60 + (targetM ?? 0);
        const absenMinutes = absenH * 60 + absenM;
        const diff = absenMinutes - targetMinutes;
        if (diff > 0) {
          riwayatTelat.push({
            id: a.id,
            tanggal: a.tanggal,
            jamKegiatan: a.jam,
            jamAbsen: `${String(absenH).padStart(2, "0")}:${String(absenM).padStart(2, "0")}`,
            menit: diff,
          });
        }
      } catch {}
    }
  }

  const telatCount = riwayatTelat.length;
  const totalMenitTelat = riwayatTelat.reduce((acc, t) => acc + t.menit, 0);
  const avgTelatMenit = telatCount > 0 ? Math.round(totalMenitTelat / telatCount) : 0;

  return c.json({
    ...row,
    stats: {
      total: totalAbsen,
      hadir: hadirCount,
      izin: izinList.length,
      alpha: alphaList.length,
      rate,
      streak: currentStreak,
      trophiesCount: trophiesUnlocked.length,
      trophies: trophiesUnlocked,
      telatCount,
      avgTelatMenit,
      riwayatTelat,
      riwayat: absensiRows.slice(0, 10),
    },
  });
});

r.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const existing: any = await db.query.generus.findFirst({ where: eq(generus.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && session.desaId && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && session.kelompokId && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.update(generus).set({ ...body, updatedAt: sql`(datetime('now'))` } as any).where(eq(generus.id, id));
  return c.json({ success: true });
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("user" as any) as any;
  const db = getDb(c.env);
  const existing: any = await db.query.generus.findFirst({ where: eq(generus.id, id) });
  if (!existing) return c.json({ error: "Tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && session.desaId && existing.desaId !== session.desaId) return c.json({ error: "Forbidden" }, 403);
  if (session.role === "admin_kelompok" && session.kelompokId && existing.kelompokId !== session.kelompokId) return c.json({ error: "Forbidden" }, 403);
  await db.delete(generus).where(eq(generus.id, id));
  return c.json({ success: true });
});

export default r;
