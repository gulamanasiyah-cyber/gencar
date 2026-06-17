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
  // 1. Show all kegiatan so we know what's in the DB
  const kegiatan = await db.execute("SELECT id, judul, tanggal, created_at FROM mandiri_kegiatan ORDER BY created_at ASC");
  console.log("\n=== DAFTAR KEGIATAN ===");
  kegiatan.rows.forEach((k, i) => console.log(`${i + 1}. [${k.id}] ${k.judul} | tanggal: ${k.tanggal} | created_at: ${k.created_at}`));

  // 2. Count NULL records
  const nullCount = await db.execute("SELECT COUNT(*) as n FROM mandiri WHERE kegiatan_id IS NULL");
  const nullPanitiaCount = await db.execute("SELECT COUNT(*) as n FROM form_panitia_dan_pengurus WHERE kegiatan_id IS NULL");
  console.log(`\nMandiri NULL kegiatan_id: ${nullCount.rows[0].n}`);
  console.log(`Panitia NULL kegiatan_id: ${nullPanitiaCount.rows[0].n}`);

  if (kegiatan.rows.length === 0) {
    console.log("Tidak ada kegiatan ditemukan. Hentikan migrasi.");
    return;
  }

  // 3. Assign each NULL mandiri record to the kegiatan whose created_at is
  //    the most recent one that is <= the mandiri record's created_at.
  //    Records created before the first kegiatan go to the oldest kegiatan.
  console.log("\n=== MIGRASI mandiri ===");
  const updateMandiri = await db.execute(`
    UPDATE mandiri
    SET kegiatan_id = COALESCE(
      (SELECT id FROM mandiri_kegiatan WHERE created_at <= mandiri.created_at ORDER BY created_at DESC LIMIT 1),
      (SELECT id FROM mandiri_kegiatan ORDER BY created_at ASC LIMIT 1)
    )
    WHERE kegiatan_id IS NULL
  `);
  console.log(`Rows updated: ${updateMandiri.rowsAffected}`);

  // 4. Same for form_panitia_dan_pengurus
  console.log("\n=== MIGRASI form_panitia_dan_pengurus ===");
  const updatePanitia = await db.execute(`
    UPDATE form_panitia_dan_pengurus
    SET kegiatan_id = COALESCE(
      (SELECT id FROM mandiri_kegiatan WHERE created_at <= form_panitia_dan_pengurus.created_at ORDER BY created_at DESC LIMIT 1),
      (SELECT id FROM mandiri_kegiatan ORDER BY created_at ASC LIMIT 1)
    )
    WHERE kegiatan_id IS NULL
  `);
  console.log(`Rows updated: ${updatePanitia.rowsAffected}`);

  // 5. Verify result
  const verif = await db.execute(`
    SELECT mk.judul, COUNT(m.id) as jumlah
    FROM mandiri m
    LEFT JOIN mandiri_kegiatan mk ON m.kegiatan_id = mk.id
    GROUP BY mk.judul
    ORDER BY mk.judul
  `);
  console.log("\n=== HASIL VERIFIKASI (mandiri per kegiatan) ===");
  verif.rows.forEach(r => console.log(`  ${r.judul || "(null)"}: ${r.jumlah} peserta`));

  console.log("\nMigrasi selesai.");
}

main().catch(console.error);
