/**
 * Data referensi yang dibaca hampir di setiap request, disimpan di cache memori
 * (lihat lib/server-cache.ts). Setiap endpoint yang MENULIS tabel terkait wajib
 * memanggil fungsi invalidate* di bawah agar perubahan langsung terlihat.
 */
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, mandiriKegiatan, mandiriDesa, mandiriKelompok, mandiriDaerah } from "@/lib/schema";
import { cached, invalidateCache } from "@/lib/server-cache";

const SETTINGS_TTL_MS = 30_000;
const LOOKUP_TTL_MS = 60_000;

// ── Settings ────────────────────────────────────────────────────────────────

export type SettingRow = { key: string; value: string | null; updatedAt: string | null };

function getSettingsMap(): Promise<ReadonlyMap<string, SettingRow>> {
  return cached("settings:all", SETTINGS_TTL_MS, async () => {
    const rows: SettingRow[] = await db
      .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
      .from(settings);
    return new Map(rows.map((row) => [row.key, row]));
  });
}

/** Semua settings sebagai object { key: value }. */
export async function getSettingsObject(): Promise<Record<string, string | null>> {
  const map = await getSettingsMap();
  const obj: Record<string, string | null> = {};
  map.forEach((row, key) => {
    obj[key] = row.value;
  });
  return obj;
}

export async function getSettingRow(key: string): Promise<SettingRow | undefined> {
  return (await getSettingsMap()).get(key);
}

/** Bentuk sama dengan `db.select().from(settings).where(eq(settings.key, key))`. */
export async function getSettingRows(key: string): Promise<SettingRow[]> {
  const row = await getSettingRow(key);
  return row ? [row] : [];
}

export async function getSettingValue(key: string): Promise<string | null | undefined> {
  return (await getSettingRow(key))?.value;
}

/** ID kegiatan mandiri yang sedang aktif ("" bila belum diatur). */
export async function getActiveMandiriKegiatanId(): Promise<string> {
  return (await getSettingValue("mandiri_active_kegiatan_id")) || "";
}

export function invalidateSettingsCache(): void {
  invalidateCache("settings:");
}

// ── Kegiatan mandiri ────────────────────────────────────────────────────────

/** Daftar kegiatan mandiri (terbaru dulu), bentuk sama dengan GET /api/mandiri/kegiatan. */
export function getMandiriKegiatanList() {
  return cached("kegiatan:mandiri-list", LOOKUP_TTL_MS, () =>
    db
      .select({
        id: mandiriKegiatan.id,
        judul: mandiriKegiatan.judul,
        deskripsi: mandiriKegiatan.deskripsi,
        tanggal: mandiriKegiatan.tanggal,
        lokasi: mandiriKegiatan.lokasi,
        kota: mandiriKegiatan.kota,
        desaNama: mandiriDesa.nama,
        kelompokNama: mandiriKelompok.nama,
        desaId: mandiriKegiatan.desaId,
        kelompokId: mandiriKegiatan.kelompokId,
        createdAt: mandiriKegiatan.createdAt,
      })
      .from(mandiriKegiatan)
      .leftJoin(mandiriDesa, eq(mandiriKegiatan.desaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(mandiriKegiatan.kelompokId, mandiriKelompok.id))
      .orderBy(sql`${mandiriKegiatan.tanggal} DESC`) as Promise<MandiriKegiatanListItem[]>
  );
}

export type MandiriKegiatanListItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string;
  lokasi: string | null;
  kota: string;
  desaNama: string | null;
  kelompokNama: string | null;
  desaId: number | null;
  kelompokId: number | null;
  createdAt: string | null;
};

export async function getMandiriKegiatanById(id: string): Promise<MandiriKegiatanListItem | undefined> {
  if (!id) return undefined;
  return (await getMandiriKegiatanList()).find((k) => k.id === id);
}

/** Kegiatan dengan tanggal terbaru (setara `ORDER BY tanggal DESC LIMIT 1`). */
export async function getLatestMandiriKegiatan(): Promise<MandiriKegiatanListItem | undefined> {
  return (await getMandiriKegiatanList())[0];
}

export function invalidateKegiatanCache(): void {
  // Menghapus kegiatan ikut menghapus relasi kegiatan↔daerah (cascade).
  invalidateCache("kegiatan:", "wilayah:");
}

// ── Wilayah (daerah / desa / kelompok) ──────────────────────────────────────

/**
 * Cache hasil query wilayah. `key` harus memuat semua parameter yang
 * memengaruhi hasil (mis. kegiatanId).
 */
export function cachedWilayah<T>(key: string, loader: () => Promise<T>): Promise<T> {
  return cached(`wilayah:${key}`, LOOKUP_TTL_MS, loader);
}

export type DesaWithDaerah = {
  id: number;
  nama: string;
  mandiriDaerahId: number | null;
  kota: string | null;
  daerahNama: string | null;
};

export type KelompokWithDesa = {
  id: number;
  nama: string;
  mandiriDesaId: number;
  desaNama: string | null;
};

/** Semua desa beserta nama daerahnya (urut nama desa). */
export function getAllDesaWithDaerah(): Promise<DesaWithDaerah[]> {
  return cachedWilayah<DesaWithDaerah[]>("desa:all", () =>
    db
      .select({
        id: mandiriDesa.id,
        nama: mandiriDesa.nama,
        mandiriDaerahId: mandiriDesa.mandiriDaerahId,
        kota: mandiriDaerah.nama,
        daerahNama: mandiriDaerah.nama,
      })
      .from(mandiriDesa)
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .orderBy(mandiriDesa.nama)
  );
}

/** Semua kelompok beserta nama desanya (urut nama kelompok). */
export function getAllKelompokWithDesa(): Promise<KelompokWithDesa[]> {
  return cachedWilayah<KelompokWithDesa[]>("kelompok:with-desa", () =>
    db
      .select({
        id: mandiriKelompok.id,
        nama: mandiriKelompok.nama,
        mandiriDesaId: mandiriKelompok.mandiriDesaId,
        desaNama: mandiriDesa.nama,
      })
      .from(mandiriKelompok)
      .leftJoin(mandiriDesa, eq(mandiriKelompok.mandiriDesaId, mandiriDesa.id))
      .orderBy(mandiriKelompok.nama)
  );
}

export function invalidateWilayahCache(): void {
  // Daftar kegiatan ikut menampilkan nama desa/kelompok.
  invalidateCache("wilayah:", "kegiatan:");
}
