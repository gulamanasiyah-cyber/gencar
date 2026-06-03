import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = ""; // Empty token!

console.log("Connecting to:", url);

const client = createClient({ url, authToken });

async function check() {
  try {
    const res = await client.execute('select "key", "value", "updated_at" from "settings"');
    console.log("Query success!");
  } catch (err) {
    console.error("Query failed error details:");
    console.error("message:", err.message);
    console.error("code:", err.code);
    console.error("raw err:", err);
  } finally {
    client.close();
  }
}

check();
