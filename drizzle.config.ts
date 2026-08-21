import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

let dbUrl = process.env.TURSO_DATABASE_URL!;
let dbAuthToken = process.env.TURSO_AUTH_TOKEN;

// Fix for mangled environment variables
if (dbUrl && (dbUrl.includes(" ") || dbUrl.includes("%20") || dbUrl.includes("TURSO_AUTH_TOKEN="))) {
  const parts = dbUrl.split(/\s+|%20/);
  dbUrl = parts[0];
  if (!dbAuthToken) {
    for (const part of parts) {
      if (part.startsWith("TURSO_AUTH_TOKEN=")) {
        dbAuthToken = part.replace("TURSO_AUTH_TOKEN=", "");
      }
    }
  }
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || "",
    token: process.env.CLOUDFLARE_D1_TOKEN || "",
    // Fallback untuk lokal: wrangler d1 execute --local tidak butuh http credentials
    ...(dbUrl ? { url: dbUrl, authToken: dbAuthToken } : {}),
  } as any,
});
