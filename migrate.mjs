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
    await client.execute("ALTER TABLE kegiatan ADD COLUMN jam TEXT;");
    console.log("Migration successful");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("Column already exists");
    } else {
      console.error(e);
    }
  }
}
main();
