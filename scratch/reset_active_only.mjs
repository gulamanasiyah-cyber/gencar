import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

// Read and parse .env.local
const envPath = path.resolve(".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
});

const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

async function main() {
  if (!url || !authToken) {
    console.error("Missing TURSO credentials in .env.local");
    return;
  }

  const client = createClient({ url, authToken });

  try {
    // 1. Get active kegiatan ID from settings
    const activeSettingRes = await client.execute("SELECT value FROM settings WHERE key = 'mandiri_active_kegiatan_id';");
    const activeKegiatanId = activeSettingRes.rows[0]?.value;

    if (!activeKegiatanId) {
      console.log("Tidak ada kegiatan aktif yang diset di settings.");
      return;
    }

    console.log(`Mereset absensi hanya untuk Kegiatan ID: ${activeKegiatanId}`);

    // 2. Delete attendance records for this activity only
    const resMandiri = await client.execute({
      sql: "DELETE FROM mandiri_absensi WHERE kegiatan_id = ?;",
      args: [activeKegiatanId]
    });
    console.log(`✓ Berhasil menghapus ${resMandiri.rowsAffected} baris dari mandiri_absensi.`);

    const resAbsensi = await client.execute({
      sql: "DELETE FROM absensi WHERE kegiatan_id = ?;",
      args: [activeKegiatanId]
    });
    console.log(`✓ Berhasil menghapus ${resAbsensi.rowsAffected} baris dari absensi.`);

    console.log("Reset selesai.");
  } catch (error) {
    console.error("Gagal mereset absensi:", error);
  } finally {
    client.close();
  }
}

main();
