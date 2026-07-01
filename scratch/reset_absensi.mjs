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

  const client = createClient({
    url,
    authToken
  });

  try {
    console.log("Menghapus data absensi di Turso...");
    await client.execute("DELETE FROM mandiri_absensi;");
    console.log("✓ Berhasil menghapus semua data mandiri_absensi.");

    await client.execute("DELETE FROM absensi;");
    console.log("✓ Berhasil menghapus semua data absensi.");
    
    console.log("Semua peserta didefinisikan sebagai BELUM ABSEN.");
  } catch (error) {
    console.error("Gagal mereset absensi:", error);
  } finally {
    client.close();
  }
}

main();
