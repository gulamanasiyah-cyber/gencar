import { eq, and, sql, isNull, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../../shared/schema";
import { getEventTimeWindow } from "../utils/kegiatanTime";

export type AlphaSweepSummary = {
  scannedKegiatan: number;
  endedKegiatan: number;
  processedKegiatan: number;
  alphaInserted: number;
  details: { kegiatanId: string; judul: string; alphaCount: number }[];
};

/**
 * Menentukan daftar ID generus yang WAJIB hadir pada suatu kegiatan:
 * 1. Bila `kegiatan_peserta` (status approved) ada → ekspansi desa, kelompok, & generus yang ditarget (termasuk undangan lintas wilayah).
 * 2. Bila kosong → seluruh generus dalam lingkup kegiatan:
 *    - kelompokId ada → semua generus kelompok tsb
 *    - desaId ada (kelompokId null) → semua generus desa tsb
 *    - desaId & kelompokId null (daerah) → semua generus
 * Hanya menyertakan `isGenerus = 1` dan mengecualikan akun admin murni.
 */
async function getWajibGenerus(
  db: ReturnType<typeof drizzle<typeof schema>>,
  kegiatanItem: typeof schema.kegiatan.$inferSelect
): Promise<(typeof schema.generus.$inferSelect)[]> {
  const { kegiatanPeserta, generus, users } = schema;

  // 1. Cek kegiatan_peserta approved
  const pesertaRows = await db
    .select()
    .from(kegiatanPeserta)
    .where(and(eq(kegiatanPeserta.kegiatanId, kegiatanItem.id), eq(kegiatanPeserta.status, "approved")));

  const allGenerusQuery = db
    .select()
    .from(generus)
    .where(
      and(
        eq(generus.isGenerus, 1),
        sql`${generus.id} NOT IN (SELECT generus_id FROM ${users} WHERE generus_id IS NOT NULL AND role IN ('admin_daerah', 'admin_desa', 'admin_kelompok'))`
      )
    );

  if (pesertaRows.length > 0) {
    const directGenerusIds = pesertaRows.filter((r) => r.generusId).map((r) => r.generusId!);
    const desaIds = pesertaRows.filter((r) => r.desaId && !r.kelompokId).map((r) => r.desaId!);
    const kelompokIds = pesertaRows.filter((r) => r.kelompokId).map((r) => r.kelompokId!);

    const conds: any[] = [];
    if (directGenerusIds.length > 0) conds.push(inArray(generus.id, directGenerusIds));
    if (desaIds.length > 0) conds.push(inArray(generus.desaId, desaIds));
    if (kelompokIds.length > 0) conds.push(inArray(generus.kelompokId, kelompokIds));

    if (conds.length === 0) return [];
    return await db
      .select()
      .from(generus)
      .where(
        and(
          eq(generus.isGenerus, 1),
          sql`${generus.id} NOT IN (SELECT generus_id FROM ${users} WHERE generus_id IS NOT NULL AND role IN ('admin_daerah', 'admin_desa', 'admin_kelompok'))`,
          sql`(${sql.join(conds, sql` OR `)})`
        )
      );
  }

  // 2. Default lingkup kegiatan
  if (kegiatanItem.kelompokId != null) {
    return await db
      .select()
      .from(generus)
      .where(
        and(
          eq(generus.isGenerus, 1),
          eq(generus.kelompokId, kegiatanItem.kelompokId),
          sql`${generus.id} NOT IN (SELECT generus_id FROM ${users} WHERE generus_id IS NOT NULL AND role IN ('admin_daerah', 'admin_desa', 'admin_kelompok'))`
        )
      );
  }
  if (kegiatanItem.desaId != null) {
    return await db
      .select()
      .from(generus)
      .where(
        and(
          eq(generus.isGenerus, 1),
          eq(generus.desaId, kegiatanItem.desaId),
          sql`${generus.id} NOT IN (SELECT generus_id FROM ${users} WHERE generus_id IS NOT NULL AND role IN ('admin_daerah', 'admin_desa', 'admin_kelompok'))`
        )
      );
  }
  // Kegiatan Daerah (terbuka se-Cengkareng)
  return await allGenerusQuery;
}

/**
 * Memindai kegiatan yang sudah selesai dan mencatat `alpha` untuk generus wajib yang belum hadir / belum izin.
 * - Idempoten: hanya memproses `kegiatan` dengan `alpha_processed_at IS NULL`.
 * - Setelah selesai, menandai `alpha_processed_at = now`.
 * - Skip generus yang sudah punya record absensi (baik hadir, izin ajuan, atau izin bentrok).
 */
export async function runAlphaSweep(env: { DB: D1Database }): Promise<AlphaSweepSummary> {
  const db = drizzle(env.DB, { schema });
  const { kegiatan, absensi } = schema;
  const now = new Date();

  // Ambil semua kegiatan yang belum pernah diproses
  const unprocessedKegiatan = await db
    .select()
    .from(kegiatan)
    .where(isNull(kegiatan.alphaProcessedAt));

  const summary: AlphaSweepSummary = {
    scannedKegiatan: unprocessedKegiatan.length,
    endedKegiatan: 0,
    processedKegiatan: 0,
    alphaInserted: 0,
    details: [],
  };

  for (const k of unprocessedKegiatan) {
    const { windowClose } = getEventTimeWindow(k);
    // Hanya proses kegiatan yang sudah melewati waktu selesai / waktu pulang
    if (now <= windowClose) continue;

    summary.endedKegiatan++;

    // 1. Ambil semua generus wajib hadir untuk kegiatan ini
    const wajibGenerusList = await getWajibGenerus(db, k);
    if (wajibGenerusList.length === 0) {
      // Tandai selesai meski tidak ada generus
      await db.update(kegiatan).set({ alphaProcessedAt: now.toISOString() }).where(eq(kegiatan.id, k.id));
      summary.processedKegiatan++;
      continue;
    }

    // 2. Ambil record absensi yang sudah ada untuk kegiatan ini (hadir / izin / alpha manual)
    const existingAbsensi = await db
      .select({ generusId: absensi.generusId })
      .from(absensi)
      .where(eq(absensi.kegiatanId, k.id));
    const alreadyRecordedSet = new Set(existingAbsensi.map((a) => a.generusId));

    // 3. Filter generus wajib yang belum punya record sama sekali
    const absentGenerus = wajibGenerusList.filter((g) => !alreadyRecordedSet.has(g.id));

    let insertedForThisEvent = 0;
    for (const g of absentGenerus) {
      await db.insert(absensi).values({
        id: crypto.randomUUID(),
        kegiatanId: k.id,
        generusId: g.id,
        desaId: g.desaId ?? null,         // Snapshot desa asal saat sweep
        kelompokId: g.kelompokId ?? null, // Snapshot kelompok asal saat sweep
        keterangan: "alpha",
        catatan: null,
        izinSumber: null,
        timestamp: now.toISOString(),
      });
      insertedForThisEvent++;
    }

    // 4. Tandai kegiatan sudah diproses agar idempoten
    await db.update(kegiatan).set({ alphaProcessedAt: now.toISOString() }).where(eq(kegiatan.id, k.id));

    summary.processedKegiatan++;
    summary.alphaInserted += insertedForThisEvent;
    summary.details.push({ kegiatanId: k.id, judul: k.judul, alphaCount: insertedForThisEvent });
  }

  return summary;
}
