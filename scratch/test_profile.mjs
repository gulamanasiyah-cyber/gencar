import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
  try {
    const email = "panitiagambuh@jb2.id";
    console.log(`Fetching user by email: ${email}`);
    const checkRes = await client.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.role, u.desa_id, u.kelompok_id, u.generus_id,
               d.nama as desa_nama, k.nama as kelompok_nama
        FROM users u
        LEFT JOIN desa d ON u.desa_id = d.id
        LEFT JOIN kelompok k ON u.kelompok_id = k.id
        WHERE u.email = ? LIMIT 1;
      `,
      args: [email]
    });

    console.log("Database result:", JSON.stringify(checkRes.rows, null, 2));

  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    client.close();
  }
}

main();
