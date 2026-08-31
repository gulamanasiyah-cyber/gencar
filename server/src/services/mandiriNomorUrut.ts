import { and, eq, sql } from "drizzle-orm";
import { generus } from "../../../shared/schema";

// mandiri family deleted — stubs to avoid break if old public/mandiri code path still imported elsewhere
export const MANDIRI_LAKI_LAKI_MAX_NOMOR = 199;
export const MANDIRI_PEREMPUAN_MIN_NOMOR = 200;
export const MANDIRI_PERSON_PEREMPUAN_QUOTA = 100;
export type MandiriJenisKelamin = "L" | "P";
export function isMandiriJenisKelamin(v: unknown): v is MandiriJenisKelamin { return v === "L" || v === "P"; }
export function getMandiriNomorUrutRangeLabel(jk: MandiriJenisKelamin) { return jk === "L" ? `1-199` : `200+`; }
export function isMandiriNomorUrutSesuaiJenisKelamin() { return true; }
export async function getNextMandiriNomorUrut() { throw new Error("mandiri family deleted — Gone 410"); }
export async function getMandiriPersonPerempuanQuotaStatus() { return { femaleCount: 0, maxFemale: 100, femaleAvailable: false }; }
export async function repairMandiriNomorUrut() { return { fixedCount: 0, fixed: [] as any[] }; }

