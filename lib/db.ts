import { createClient, Client } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;

export function getDb() {
  if (!_db) {
    let url = process.env.TURSO_DATABASE_URL || "file:local.db";
    let authToken = process.env.TURSO_AUTH_TOKEN || "";

    // Fix for mangled environment variables (common in Netlify/Vercel copy-paste)
    if (url.includes(" ") || url.includes("%20") || url.includes("TURSO_AUTH_TOKEN=")) {
      console.log("DB_CLIENT: Detected mangled TURSO_DATABASE_URL, attempting to sanitize...");
      // Split by space or %20
      const parts = url.split(/\s+|%20/);
      url = parts[0];
      
      // If we don't have an authToken yet, try to find it in the parts
      if (!authToken || authToken === "") {
        for (const part of parts) {
          if (part.startsWith("TURSO_AUTH_TOKEN=")) {
            authToken = part.replace("TURSO_AUTH_TOKEN=", "");
          }
        }
      }
    }

    if (process.env.TURSO_DATABASE_URL) {
      console.log("DB_CLIENT_CONNECTING_TO:", process.env.TURSO_DATABASE_URL.substring(0, 20) + "...");
    } else {
      console.log("DB_CLIENT: TURSO_DATABASE_URL is missing, using local fallback (normal during build time)");
    }

    _client = createClient({
      url,
      authToken,
      // Explicitly opt out of Next.js's fetch Data Cache: DB queries should never
      // be cached, and this also avoids the "Failed to generate cache key" warning
      // Next.js logs when it can't hash a request body for its cache key.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        globalThis.fetch(input, { ...init, cache: "no-store" }),
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  }
});

export const client = new Proxy({} as Client, {
  get(target, prop) {
    if (!_client) {
      getDb();
    }
    const value = Reflect.get(_client!, prop);
    if (typeof value === "function") {
      return value.bind(_client);
    }
    return value;
  }
});
