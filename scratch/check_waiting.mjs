import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const res = await client.execute({
      sql: "SELECT id, status, status_tunggu FROM mandiri_pemilihan WHERE status = 'Menunggu' AND (status_tunggu = 'dipanggil' OR status_tunggu = 'ada');",
    });
    console.log("Waiting/arrived pairs in DB:", res.rows);
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    client.close();
  }
}

main();
