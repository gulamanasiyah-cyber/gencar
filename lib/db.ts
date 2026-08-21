import * as schema from "../shared/schema";

// D1 primary (Cloudflare Workers) — Turso fallback untuk strangler 2 minggu.
// Saat env.DB ada (wrangler D1 binding), pakai drizzle/d1. Jika tidak, fallback Turso/libsql.

let _tursoDb: any = null;
let _d1Db: any = null;

function getTursoDb(): any {
  if (_tursoDb) return _tursoDb;
  let url = process.env.TURSO_DATABASE_URL || "file:local.db";
  let authToken = process.env.TURSO_AUTH_TOKEN || "";
  if (url.includes(" ") || url.includes("%20") || url.includes("TURSO_AUTH_TOKEN=")) {
    const parts = url.split(/\s+|%20/);
    url = parts[0];
    if (!authToken || authToken === "") {
      for (const part of parts) if (part.startsWith("TURSO_AUTH_TOKEN=")) authToken = part.replace("TURSO_AUTH_TOKEN=", "");
    }
  }
  // Lazy import agar tidak bundling @libsql saat D1 murni
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client/web");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzleLibsql } = require("drizzle-orm/libsql/web");
  const client = createClient({
    url, authToken,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, { ...init, cache: "no-store" }),
  });
  _tursoDb = drizzleLibsql(client, { schema });
  return _tursoDb;
}

function tryGetD1Db(): any | null {
  try {
    // @ts-ignore — tersedia di Cloudflare Workers runtime
    const maybeEnv: any = (globalThis as any).__env ?? (typeof process !== "undefined" ? (process as any).env : null);
    const d1 = maybeEnv?.DB;
    if (!d1) return null;
    if (_d1Db) return _d1Db;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzleD1 } = require("drizzle-orm/d1");
    _d1Db = drizzleD1(d1, { schema });
    return _d1Db;
  } catch { return null; }
}

export function getDb(): any {
  return tryGetD1Db() ?? getTursoDb();
}

export const db: any = new Proxy({} as any, {
  get(_t, prop) {
    const v = Reflect.get(getDb(), prop);
    return typeof v === "function" ? v.bind(getDb()) : v;
  },
});

export const client: any = new Proxy({} as any, {
  get(_t, prop) {
    const inst = tryGetD1Db() ?? getTursoDb();
    const v = Reflect.get(inst, prop);
    return typeof v === "function" ? v.bind(inst) : v;
  },
});
