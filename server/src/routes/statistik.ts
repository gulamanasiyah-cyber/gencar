import { Hono } from "hono";
import { eq, and, or, sql, isNull, notInArray } from "drizzle-orm";
import { generus, kegiatan, absensi, desa, kelompok, users } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

function toInt(v: string | null | undefined) { if (!v || v === "all" || v === "") return null; const n = Number(v); return Number.isNaN(n) ? null : n; }

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const from = c.req.query("from") || "";
  const to = c.req.query("to") || "";
  const kategoriAcara = c.req.query("kategoriAcara") || "all";
  const qDesaId = toInt(c.req.query("desaId"));
  const qKelompokId = toInt(c.req.query("kelompokId"));
  const _qDaerahId = toInt(c.req.query("daerahId"));
  const _qMandiriDesaId = toInt(c.req.query("mandiriDesaId"));
  const _qMandiriKelompokId = toInt(c.req.query("mandiriKelompokId"));
  const kategoriMudaMudi = c.req.query("kategoriMudaMudi") || "all";
  const jenisKelamin = c.req.query("jenisKelamin") || "all";
  const kategoriUsia = c.req.query("kategoriUsia") || "all";

  const roleDesaId = session.role === "desa" && session.desaId ? session.desaId : null;
  const roleKelompokId = session.role === "kelompok" && session.kelompokId ? session.kelompokId : null;
  const roleTimDesaId = session.role === "tim_pnkb" && !session.kelompokId && session.desaId ? session.desaId : null;
  const roleTimKelompokId = session.role === "tim_pnkb" && session.kelompokId ? session.kelompokId : null;
  const effectiveDesaId = roleDesaId ?? roleTimDesaId ?? qDesaId;
  const effectiveKelompokId = roleKelompokId ?? roleTimKelompokId ?? qKelompokId;

  const generusConds: any[] = [];
  generusConds.push(eq(generus.isGenerus, 1));
  generusConds.push(or(isNull(users.role), notInArray(users.role, ["tim_pnkb", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "admin", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"] as any)));
  if (effectiveDesaId != null) generusConds.push(eq(generus.desaId, effectiveDesaId));
  if (effectiveKelompokId != null) generusConds.push(eq(generus.kelompokId, effectiveKelompokId));
  // legacy mandiri filters removed (pruned)
  if (kategoriMudaMudi !== "all") generusConds.push(eq(generus.kategoriMudaMudi, kategoriMudaMudi as any));
  if (jenisKelamin === "L" || jenisKelamin === "P") generusConds.push(eq(generus.jenisKelamin, jenisKelamin as any));
  if (kategoriUsia !== "all") generusConds.push(eq(generus.kategoriUsia, kategoriUsia as any));
  const generusWhere = and(...generusConds);

  const kegiatanConds: any[] = [];
  if (kategoriAcara !== "all") kegiatanConds.push(eq(kegiatan.kategoriAcara, kategoriAcara as any));
  if (effectiveDesaId != null) kegiatanConds.push(eq(kegiatan.desaId, effectiveDesaId));
  if (effectiveKelompokId != null) kegiatanConds.push(eq(kegiatan.kelompokId, effectiveKelompokId));
  if (from) kegiatanConds.push(sql`${kegiatan.tanggal} >= ${from}`);
  if (to) kegiatanConds.push(sql`${kegiatan.tanggal} <= ${to}`);
  const kegiatanWhere = kegiatanConds.length ? and(...kegiatanConds) : undefined;
  const db = getDb(c.env);

  const totalGenerusQ = db.select({ count: sql<number>`count(DISTINCT ${generus.id})` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere);
  const byGenderQ = db.select({ name: generus.jenisKelamin, value: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere).groupBy(generus.jenisKelamin);
  const byUsiaQ = db.select({ name: generus.kategoriUsia, value: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere).groupBy(generus.kategoriUsia);
  const byMudaMudiQ = db.select({ name: sql<string>`COALESCE(${generus.kategoriMudaMudi}, 'belum_diisi')`, value: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere).groupBy(generus.kategoriMudaMudi);
  const byDesaQ = db.select({ name: sql<string>`COALESCE(${desa.nama}, 'Tanpa Desa')`, value: sql<number>`count(*)` }).from(generus).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere).groupBy(desa.nama).orderBy(sql`count(*) DESC`);
  const byDaerahQ = db.select({ name: sql<string>`'Cengkareng'`, value: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere);
  const byPendidikanQ = db.select({ name: sql<string>`COALESCE(${generus.pendidikan}, 'Belum diisi')`, value: sql<number>`count(*)` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(generusWhere).groupBy(generus.pendidikan).orderBy(sql`count(*) DESC`).limit(10);
  const totalKegiatanQ = db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(kegiatanWhere);
  const kegiatanByKategoriQ = db.select({ name: sql<string>`COALESCE(${kegiatan.kategoriAcara}, 'lainnya')`, value: sql<number>`count(*)` }).from(kegiatan).where(kegiatanWhere).groupBy(kegiatan.kategoriAcara);
  const kegiatanMonthlyQ = db.select({ name: sql<string>`substr(${kegiatan.tanggal},1,7)`, value: sql<number>`count(*)` }).from(kegiatan).where(kegiatanWhere).groupBy(sql`substr(${kegiatan.tanggal},1,7)`).orderBy(sql`substr(${kegiatan.tanggal},1,7) ASC`);

  const absensiBaseConds: any[] = [];
  if (from) absensiBaseConds.push(sql`${kegiatan.tanggal} >= ${from}`);
  if (to) absensiBaseConds.push(sql`${kegiatan.tanggal} <= ${to}`);
  if (kategoriAcara !== "all") absensiBaseConds.push(eq(kegiatan.kategoriAcara, kategoriAcara as any));
  if (effectiveDesaId != null) absensiBaseConds.push(eq(generus.desaId, effectiveDesaId));
  if (effectiveKelompokId != null) absensiBaseConds.push(eq(generus.kelompokId, effectiveKelompokId));
  // legacy mandiri absensi filters removed
  if (kategoriMudaMudi !== "all") absensiBaseConds.push(eq(generus.kategoriMudaMudi, kategoriMudaMudi as any));
  if (jenisKelamin === "L" || jenisKelamin === "P") absensiBaseConds.push(eq(generus.jenisKelamin, jenisKelamin as any));
  if (kategoriUsia !== "all") absensiBaseConds.push(eq(generus.kategoriUsia, kategoriUsia as any));
  const absensiWhere = absensiBaseConds.length ? and(...absensiBaseConds) : undefined;

  const totalAbsensiQ = db.select({ count: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere);
  const byKeteranganQ = db.select({ name: absensi.keterangan, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(absensi.keterangan);
  const absensiByGenderQ = db.select({ name: generus.jenisKelamin, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(generus.jenisKelamin);
  const absensiByUsiaQ = db.select({ name: generus.kategoriUsia, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(generus.kategoriUsia).orderBy(sql`count(*) DESC`);
  const absensiByMudaMudiQ = db.select({ name: sql<string>`COALESCE(${generus.kategoriMudaMudi}, 'belum_diisi')`, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(generus.kategoriMudaMudi);
  const absensiByKategoriAcaraQ = db.select({ name: sql<string>`COALESCE(${kegiatan.kategoriAcara}, 'lainnya')`, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(kegiatan.kategoriAcara);
  const absensiTimeSeriesQ = db.select({ date: kegiatan.tanggal, hadir: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='hadir' THEN 1 ELSE 0 END)`, izin: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='izin' THEN 1 ELSE 0 END)`, alpha: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='alpha' THEN 1 ELSE 0 END)`, total: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).where(absensiWhere).groupBy(kegiatan.tanggal).orderBy(kegiatan.tanggal);
  const absensiByDesaQ = db.select({ name: sql<string>`COALESCE(${desa.nama}, 'Tanpa Desa')`, value: sql<number>`count(*)` }).from(absensi).innerJoin(generus, eq(absensi.generusId, generus.id)).innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id)).leftJoin(desa, eq(generus.desaId, desa.id)).where(absensiWhere).groupBy(desa.nama).orderBy(sql`count(*) DESC`).limit(10);

  const [totalGenerusRes, byGenderRes, byUsiaRes, byMudaMudiRes, byDesaRes, byDaerahRes, byPendidikanRes, totalKegiatanRes, kegiatanByKategoriRes, kegiatanMonthlyRes, totalAbsensiRes, byKeteranganRes, absensiByGenderRes, absensiByUsiaRes, absensiByMudaMudiRes, absensiByKategoriAcaraRes, timeSeriesRes, absensiByDesaRes] = await Promise.all([totalGenerusQ, byGenderQ, byUsiaQ, byMudaMudiQ, byDesaQ, byDaerahQ, byPendidikanQ, totalKegiatanQ, kegiatanByKategoriQ, kegiatanMonthlyQ, totalAbsensiQ, byKeteranganQ, absensiByGenderQ, absensiByUsiaQ, absensiByMudaMudiQ, absensiByKategoriAcaraQ, absensiTimeSeriesQ, absensiByDesaQ]);
  const totalGenerus = Number((totalGenerusRes as any)[0]?.count || 0);
  const totalKegiatan = Number((totalKegiatanRes as any)[0]?.count || 0);
  const totalAbsensi = Number((totalAbsensiRes as any)[0]?.count || 0);
  const norm = (arr: any[]) => arr.map((r: any) => ({ name: r.name ?? "unknown", value: Number(r.value || 0) })).filter((r) => r.value > 0);
  const hadir = Number((byKeteranganRes as any[]).find((r: any) => r.name === "hadir")?.value || 0);
  const izin = Number((byKeteranganRes as any[]).find((r: any) => r.name === "izin")?.value || 0);
  const alpha = Number((byKeteranganRes as any[]).find((r: any) => r.name === "alpha")?.value || 0);
  const hadirRate = totalAbsensi > 0 ? Math.round((hadir / totalAbsensi) * 100) : 0;
  return c.json({ summary: { totalGenerus, totalKegiatan, totalAbsensi, hadir, izin, alpha, hadirRate }, member: { byGender: norm(byGenderRes as any), byUsia: norm(byUsiaRes as any), byMudaMudi: norm(byMudaMudiRes as any), byDesa: norm(byDesaRes as any), byDaerah: norm(byDaerahRes as any), byPendidikan: norm(byPendidikanRes as any) }, kegiatan: { total: totalKegiatan, byKategori: norm(kegiatanByKategoriRes as any), monthly: (kegiatanMonthlyRes as any[]).map((r: any) => ({ name: r.name, value: Number(r.value) })) }, absensi: { total: totalAbsensi, byKeterangan: norm(byKeteranganRes as any), byGender: norm(absensiByGenderRes as any), byUsia: norm(absensiByUsiaRes as any), byMudaMudi: norm(absensiByMudaMudiRes as any), byKategoriAcara: norm(absensiByKategoriAcaraRes as any), byDesa: norm(absensiByDesaRes as any), timeSeries: (timeSeriesRes as any[]).map((r: any) => ({ date: r.date, hadir: Number(r.hadir || 0), izin: Number(r.izin || 0), alpha: Number(r.alpha || 0), total: Number(r.total || 0) })) }, filtersApplied: { from: from || null, to: to || null, kategoriAcara, desaId: effectiveDesaId, kelompokId: effectiveKelompokId, daerahId: _qDaerahId, mandiriDesaId: _qMandiriDesaId, mandiriKelompokId: _qMandiriKelompokId, kategoriMudaMudi, jenisKelamin, kategoriUsia } });
});

r.get("/options", async (c) => {
  const db = getDb(c.env);
  const [desaRows, kelompokRows] = await Promise.all([db.select().from(desa), db.select().from(kelompok)]);
  return c.json({ desa: desaRows, kelompok: kelompokRows, daerah: [] });
});

export default r;
