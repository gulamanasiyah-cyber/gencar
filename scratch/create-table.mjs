import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS organisasi_pengurus (
        id TEXT PRIMARY KEY,
        nama TEXT NOT NULL,
        dapukan TEXT NOT NULL,
        foto TEXT,
        urutan INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log("Table 'organisasi_pengurus' created successfully!");
  } catch (e) {
    console.error("Failed to create table:", e);
  }
}
main();
