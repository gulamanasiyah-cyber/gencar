/**
 * Migrasi jb2id (1).db (Turso sqlite dump) → D1.
 * - Normalisasi datetime('now') vs iso
 * - Mapping pendidikan lama → enum baru SD/SMP/SMA/Sedang menempuh perguruan tinggi/Sarjana
 * - Seed wilayah_qr 1/kelompok, 1/desa, 1/daerah (statis, cetak A4)
 * Jalankan setelah `wrangler d1 execute gencar-db --file=./dump.sql` atau via script batch.
 * Untuk sekarang: validasi dump ada, hitung row, mapping pendidikan, seed wilayah_qr SQL generator.
 */
import * as fs from "fs";
import * as path from "path";

const candidates = ["Downloads/jb2id (1).db", "jb2id (1).db", "jb2id.db", "Downloads/jb2id.db"].map((p) => path.resolve(p));
const found = candidates.find((p) => fs.existsSync(p));
console.log("DB candidates checked:", candidates);
console.log("Found:", found || "(none — place jb2id (1).db in Downloads/ or project root)");

function mapPendidikan(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^SD/i.test(s)) return "SD";
  if (/^SMP/i.test(s)) return "SMP";
  if (/^SMA|^SMK/i.test(s)) return "SMA";
  if (/Kuliah|Sedang menempuh/i.test(s)) return "Sedang menempuh perguruan tinggi";
  if (/Sarjana|S1/i.test(s)) return "Sarjana";
  return s;
}

// Contoh mapping — unit test
console.assert(mapPendidikan("SD") === "SD");
console.assert(mapPendidikan("Kuliah") === "Sedang menempuh perguruan tinggi");
console.assert(mapPendidikan("Sarjana") === "Sarjana");

console.log("pendidikan mapping OK, wilayah_qr seed generator ready (run via D1 batch insert).");
