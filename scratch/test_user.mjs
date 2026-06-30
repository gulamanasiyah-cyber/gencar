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
      sql: "SELECT id, name, email, role FROM users WHERE email = ? LIMIT 1;",
      args: ["timjepret@jb2.id"]
    });
    console.log("DB User Info:", res.rows[0]);
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    client.close();
  }
}

main();
