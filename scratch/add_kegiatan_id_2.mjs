import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import fs from "fs";

// Load from .env.local
const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  try {
    console.log("Adding kegiatan_id to mandiri...");
    try {
        await db.execute("ALTER TABLE mandiri ADD COLUMN kegiatan_id TEXT;");
        console.log("Success: Added kegiatan_id to mandiri.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
             console.log("kegiatan_id already exists in mandiri.");
        } else throw e;
    }
    
    console.log("Adding kegiatan_id to form_panitia_dan_pengurus...");
    try {
        await db.execute("ALTER TABLE form_panitia_dan_pengurus ADD COLUMN kegiatan_id TEXT;");
        console.log("Success: Added kegiatan_id to form_panitia_dan_pengurus.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
             console.log("kegiatan_id already exists in form_panitia_dan_pengurus.");
        } else throw e;
    }

    // Get the most recent activity ID to set for existing records
    const latestActivity = await db.execute("SELECT id FROM mandiri_kegiatan ORDER BY tanggal DESC LIMIT 1");
    if (latestActivity.rows.length > 0) {
      const activeId = latestActivity.rows[0].id;
      console.log(`Setting existing records to use active activity ID: ${activeId}`);
      await db.execute({ sql: "UPDATE mandiri SET kegiatan_id = ? WHERE kegiatan_id IS NULL", args: [activeId] });
      await db.execute({ sql: "UPDATE form_panitia_dan_pengurus SET kegiatan_id = ? WHERE kegiatan_id IS NULL", args: [activeId] });
    }

    console.log("Successfully migrated tables.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

main();
