import { createClient } from "@libsql/client";
import fs from "fs";
import dotenv from "dotenv";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
for (const k in envConfig) process.env[k] = envConfig[k];

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // 1. Show all kegiatan
  const kegiatan = await db.execute("SELECT id, judul, tanggal, created_at FROM mandiri_kegiatan ORDER BY created_at ASC");
  console.log("\n=== DAFTAR KEGIATAN ===");
  kegiatan.rows.forEach((k, i) => console.log(`${i + 1}. [${k.id}] ${k.judul} | tanggal: ${k.tanggal} | created_at: ${k.created_at}`));

  // 2. Show active kegiatan from settings
  const activeSetting = await db.execute("SELECT value FROM settings WHERE key = 'mandiri_active_kegiatan_id'");
  const activeId = activeSetting.rows[0]?.value || "";
  console.log(`\nActive kegiatan_id (dari settings): ${activeId}`);

  // 3. Count records per table
  const stats = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM mandiri_kunjungan) as total_kunjungan,
      (SELECT COUNT(*) FROM mandiri_kunjungan WHERE kegiatan_id IS NULL) as null_kunjungan,
      (SELECT COUNT(*) FROM mandiri_pemilihan) as total_pemilihan,
      (SELECT COUNT(*) FROM mandiri_pemilihan WHERE kegiatan_id IS NULL) as null_pemilihan
  `);
  const s = stats.rows[0];
  console.log(`\nKunjungan: ${s.total_kunjungan} total, ${s.null_kunjungan} NULL kegiatan_id`);
  console.log(`Pemilihan: ${s.total_pemilihan} total, ${s.null_pemilihan} NULL kegiatan_id`);

  // 4. Show distribution of kegiatan_id in kunjungan
  const kunjDist = await db.execute(`
    SELECT mk.judul, mk.id, COUNT(mj.id) as jumlah
    FROM mandiri_kunjungan mj
    LEFT JOIN mandiri_kegiatan mk ON mj.kegiatan_id = mk.id
    GROUP BY mj.kegiatan_id
    ORDER BY jumlah DESC
  `);
  console.log("\n=== DISTRIBUSI kegiatan_id di mandiri_kunjungan ===");
  kunjDist.rows.forEach(r => console.log(`  [${r.id || "NULL"}] ${r.judul || "(null)"}: ${r.jumlah} records`));

  // 5. Show distribution of kegiatan_id in pemilihan
  const pilihDist = await db.execute(`
    SELECT mk.judul, mk.id, COUNT(mp.id) as jumlah
    FROM mandiri_pemilihan mp
    LEFT JOIN mandiri_kegiatan mk ON mp.kegiatan_id = mk.id
    GROUP BY mp.kegiatan_id
    ORDER BY jumlah DESC
  `);
  console.log("\n=== DISTRIBUSI kegiatan_id di mandiri_pemilihan ===");
  pilihDist.rows.forEach(r => console.log(`  [${r.id || "NULL"}] ${r.judul || "(null)"}: ${r.jumlah} records`));

  if (!activeId) {
    console.log("\nTidak ada active kegiatan_id di settings. Hentikan migrasi.");
    return;
  }

  if (kegiatan.rows.length < 2) {
    console.log("\nHanya ada 1 kegiatan, tidak perlu migrasi.");
    return;
  }

  // 6. Migrate mandiri_kunjungan: assign records NOT matching activeId to activeId
  //    using the same logic: nearest preceding kegiatan by created_at
  console.log(`\n=== MIGRASI mandiri_kunjungan ke kegiatan aktif [${activeId}] ===`);
  const updateKunjungan = await db.execute(`
    UPDATE mandiri_kunjungan
    SET kegiatan_id = COALESCE(
      (SELECT id FROM mandiri_kegiatan WHERE created_at <= mandiri_kunjungan.created_at ORDER BY created_at DESC LIMIT 1),
      (SELECT id FROM mandiri_kegiatan ORDER BY created_at ASC LIMIT 1)
    )
    WHERE kegiatan_id != ? OR kegiatan_id IS NULL
  `, [activeId]);
  console.log(`Rows updated: ${updateKunjungan.rowsAffected}`);

  // 7. Migrate mandiri_pemilihan
  console.log(`\n=== MIGRASI mandiri_pemilihan ke kegiatan aktif [${activeId}] ===`);
  const updatePemilihan = await db.execute(`
    UPDATE mandiri_pemilihan
    SET kegiatan_id = COALESCE(
      (SELECT id FROM mandiri_kegiatan WHERE created_at <= mandiri_pemilihan.created_at ORDER BY created_at DESC LIMIT 1),
      (SELECT id FROM mandiri_kegiatan ORDER BY created_at ASC LIMIT 1)
    )
    WHERE kegiatan_id != ? OR kegiatan_id IS NULL
  `, [activeId]);
  console.log(`Rows updated: ${updatePemilihan.rowsAffected}`);

  // 8. Verify
  const verify = await db.execute(`
    SELECT mk.judul,
      (SELECT COUNT(*) FROM mandiri_kunjungan WHERE kegiatan_id = mk.id) as kunjungan,
      (SELECT COUNT(*) FROM mandiri_pemilihan WHERE kegiatan_id = mk.id) as pemilihan
    FROM mandiri_kegiatan mk
    ORDER BY mk.created_at ASC
  `);
  console.log("\n=== HASIL VERIFIKASI ===");
  verify.rows.forEach(r => console.log(`  ${r.judul}: ${r.kunjungan} kunjungan, ${r.pemilihan} pemilihan`));

  console.log("\nMigrasi selesai.");
}

main().catch(console.error);
