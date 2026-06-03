import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log("Connecting to:", url);

const client = createClient({ url, authToken });

async function check() {
  try {
    const res = await client.execute('select "key", "value", "updated_at" from "settings"');
    console.log("Query settings result:");
    console.log(res.rows);
  } catch (err) {
    console.error("Query settings failed:", err);
  } finally {
    client.close();
  }
}

check();
