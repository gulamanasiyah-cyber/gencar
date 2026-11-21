import { sql } from "drizzle-orm";
import { mandiriAbsensi } from "@/lib/schema";

/**
 * Join hanya ke SATU catatan kehadiran per (peserta, kegiatan).
 * Bila ada catatan ganda (mis. scan/klik dua kali bersamaan), daftar tidak lagi menampilkan
 * peserta yang sama dua kali dan jumlah total tidak membengkak.
 * Pakai sebagai tambahan kondisi pada leftJoin/innerJoin(mandiriAbsensi, and(..., firstAbsensiOnly)).
 */
export const firstAbsensiOnly = sql`${mandiriAbsensi.id} = (
  SELECT ma.id FROM mandiri_absensi ma
  WHERE ma.generus_id = ${mandiriAbsensi.generusId} AND ma.kegiatan_id = ${mandiriAbsensi.kegiatanId}
  ORDER BY ma.timestamp ASC, ma.id ASC LIMIT 1
)`;

/**
 * Catat kehadiran HANYA bila peserta belum punya catatan untuk kegiatan itu.
 * Satu pernyataan SQL (atomik) sehingga dua request yang datang bersamaan tidak menghasilkan data ganda.
 */
export async function insertMandiriAbsensiOnce(
  db: any,
  row: { id: string; kegiatanId: string; generusId: string; keterangan?: string; timestamp?: string }
) {
  const ts = row.timestamp ?? new Date().toISOString();
  await db.run(sql`
    INSERT INTO mandiri_absensi (id, kegiatan_id, generus_id, keterangan, timestamp)
    SELECT ${row.id}, ${row.kegiatanId}, ${row.generusId}, ${row.keterangan ?? "hadir"}, ${ts}
    WHERE NOT EXISTS (
      SELECT 1 FROM mandiri_absensi WHERE generus_id = ${row.generusId} AND kegiatan_id = ${row.kegiatanId}
    )
  `);
}
