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
    await client.execute("ALTER TABLE mandiri_rooms ADD COLUMN started_at TEXT;");
    console.log("Migration successful: added started_at column to mandiri_rooms");
  } catch (e) {
    if (e.message.includes("duplicate column") || e.message.includes("already exists")) {
      console.log("Column already exists");
    } else {
      console.error(e);
    }
  } finally {
    process.exit(0);
  }
}
main();
