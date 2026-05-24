import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    console.log("Adding password_plain column...");
    await db.execute("ALTER TABLE users ADD COLUMN password_plain TEXT;");
    console.log("Successfully added password_plain column.");
  } catch (error) {
    console.error("Error executing query:", error);
  }
}

main();
