import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    console.log("Adding kegiatan_id column to mandiri_pemilihan...");
    await db.execute("ALTER TABLE mandiri_pemilihan ADD COLUMN kegiatan_id TEXT;");
    console.log("Successfully added kegiatan_id to mandiri_pemilihan.");
  } catch (error) {
    console.error("Error executing query for mandiri_pemilihan:", error);
  }

  try {
    console.log("Adding kegiatan_id column to mandiri_kunjungan...");
    await db.execute("ALTER TABLE mandiri_kunjungan ADD COLUMN kegiatan_id TEXT;");
    console.log("Successfully added kegiatan_id to mandiri_kunjungan.");
  } catch (error) {
    console.error("Error executing query for mandiri_kunjungan:", error);
  }
}

main();
