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
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='organisasi_pengurus';");
    console.log("Table exists query result:", res.rows);
  } catch (e) {
    console.error(e);
  }
}
main();
