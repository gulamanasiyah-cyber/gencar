import { and, asc, eq, sql } from "drizzle-orm";
import { generus, mandiri } from "../../../shared/schema";

export const MANDIRI_LAKI_LAKI_MAX_NOMOR = 199;
export const MANDIRI_PEREMPUAN_MIN_NOMOR = 200;
export const MANDIRI_PERSON_PEREMPUAN_QUOTA = 100;

export type MandiriJenisKelamin = "L" | "P";
export function isMandiriJenisKelamin(value: unknown): value is MandiriJenisKelamin {
  return value === "L" || value === "P";
}
export function getMandiriNomorUrutRangeLabel(jenisKelamin: MandiriJenisKelamin) {
  return jenisKelamin === "L" ? `1-${MANDIRI_LAKI_LAKI_MAX_NOMOR}` : `${MANDIRI_PEREMPUAN_MIN_NOMOR}+`;
}
export function isMandiriNomorUrutSesuaiJenisKelamin(jenisKelamin: unknown, nomorUrut: unknown) {
  if (!isMandiriJenisKelamin(jenisKelamin)) return false;
  const nomor = Number(nomorUrut);
  if (!Number.isInteger(nomor) || nomor <= 0) return false;
  return jenisKelamin === "L" ? nomor <= MANDIRI_LAKI_LAKI_MAX_NOMOR : nomor >= MANDIRI_PEREMPUAN_MIN_NOMOR;
}
function kegiatanScopeCondition(kegiatanId?: string | null) {
  return kegiatanId ? eq(mandiri.kegiatanId, kegiatanId) : sql`1=1`;
}
export async function getNextMandiriNomorUrut(db: any, jenisKelamin: MandiriJenisKelamin, kegiatanId?: string | null, excludeMandiriId?: string | null) {
  const baseConditions: any[] = [kegiatanScopeCondition(kegiatanId)];
  if (excludeMandiriId) baseConditions.push(sql`${mandiri.id} <> ${excludeMandiriId}`);
  if (jenisKelamin === "L") {
    const rows = await db.select({ nomorUrut: mandiri.nomorUrut }).from(mandiri).where(and(...baseConditions, sql`${mandiri.nomorUrut} >= 1`, sql`${mandiri.nomorUrut} <= ${MANDIRI_LAKI_LAKI_MAX_NOMOR}`)).orderBy(asc(mandiri.nomorUrut));
    const used = new Set(rows.map((r: any) => Number(r.nomorUrut)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= MANDIRI_LAKI_LAKI_MAX_NOMOR));
    for (let n = 1; n <= MANDIRI_LAKI_LAKI_MAX_NOMOR; n++) if (!used.has(n)) return n;
    const e = new Error(`Nomor peserta laki-laki sudah penuh (${getMandiriNomorUrutRangeLabel("L")}).`);
    (e as any).status = 409;
    throw e;
  }
  const rows = await db.select({ nomorUrut: mandiri.nomorUrut }).from(mandiri).where(and(...baseConditions, sql`${mandiri.nomorUrut} >= ${MANDIRI_PEREMPUAN_MIN_NOMOR}`)).orderBy(asc(mandiri.nomorUrut));
  const used = new Set(rows.map((r: any) => Number(r.nomorUrut)).filter((n: number) => Number.isInteger(n) && n >= MANDIRI_PEREMPUAN_MIN_NOMOR));
  let n = MANDIRI_PEREMPUAN_MIN_NOMOR;
  while (used.has(n)) n++;
  return n;
}
export async function getMandiriPersonPerempuanQuotaStatus(db: any, kegiatanId?: string | null) {
  if (!kegiatanId) return { femaleCount: 0, maxFemale: MANDIRI_PERSON_PEREMPUAN_QUOTA, femaleAvailable: false };
  const result = await db.select({ count: sql<number>`count(DISTINCT ${mandiri.id})` }).from(mandiri).innerJoin(generus, eq(mandiri.generusId, generus.id)).where(and(eq(mandiri.kegiatanId, kegiatanId), eq(generus.jenisKelamin, "P"), sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${kegiatanId})`));
  const femaleCount = Number(result[0]?.count || 0);
  return { femaleCount, maxFemale: MANDIRI_PERSON_PEREMPUAN_QUOTA, femaleAvailable: femaleCount < MANDIRI_PERSON_PEREMPUAN_QUOTA };
}
export async function repairMandiriNomorUrut(db: any, kegiatanId?: string | null) {
  let query: any = db.select({ mandiriId: mandiri.id, kegiatanId: mandiri.kegiatanId, nomorUrut: mandiri.nomorUrut, generusId: mandiri.generusId, nama: generus.nama, jenisKelamin: generus.jenisKelamin }).from(mandiri).innerJoin(generus, eq(mandiri.generusId, generus.id));
  if (kegiatanId) query = query.where(eq(mandiri.kegiatanId, kegiatanId));
  const rows = await query.orderBy(asc(mandiri.kegiatanId), asc(mandiri.nomorUrut), asc(mandiri.createdAt));
  const fixed: any[] = [];
  for (const row of rows) {
    if (!isMandiriJenisKelamin(row.jenisKelamin)) continue;
    if (isMandiriNomorUrutSesuaiJenisKelamin(row.jenisKelamin, row.nomorUrut)) continue;
    const nomorBaru = await getNextMandiriNomorUrut(db, row.jenisKelamin, row.kegiatanId || null, row.mandiriId);
    await db.update(mandiri).set({ nomorUrut: nomorBaru, updatedAt: sql`(datetime('now'))` }).where(eq(mandiri.id, row.mandiriId));
    fixed.push({ mandiriId: row.mandiriId, generusId: row.generusId, nama: row.nama, jenisKelamin: row.jenisKelamin, nomorLama: row.nomorUrut, nomorBaru, kegiatanId: row.kegiatanId });
  }
  return { fixedCount: fixed.length, fixed };
}
