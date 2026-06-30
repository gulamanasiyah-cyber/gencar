import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    console.log("Querying users_old table...");
    const result = await client.execute("SELECT * FROM users_old;");
    console.log("=== users_old rows ===");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    client.close();
  }
}

main();
