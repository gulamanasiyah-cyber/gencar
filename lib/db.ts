import * as schema from "../shared/schema";

// D1 primary (Cloudflare Workers) — Turso fallback untuk strangler 2 minggu.
// Saat env.DB ada (wrangler D1 binding), pakai drizzle/d1. Jika tidak, fallback Turso/libsql.

declare global {
  // eslint-disable-next-line no-var
  var __tursoDb: any;
  // eslint-disable-next-line no-var
  var __d1Db: any;
}

let _tursoDb: any = null;
let _d1Db: any = null;

const WRITE_SQL = /"sql"\s*:\s*"\s*(insert|update|delete|replace|create|drop|alter)\b/i;

// Koneksi ke Turso kadang putus (ECONNRESET / "socket hang up") saat burst request atau
// socket keep-alive basi. Ulangi otomatis, tapi HANYA untuk request baca agar tulis tidak ganda.
async function retryingFetch(input: any, init?: any): Promise<Response> {
  const body = typeof init?.body === "string" ? init.body : "";
  const canRetry = !WRITE_SQL.test(body);
  const maxRetries = canRetry ? 2 : 0;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1) + Math.random() * 100));
    }
  }
}

function getTursoDb(): any {
  if (globalThis.__tursoDb) {
    return globalThis.__tursoDb;
  }

  let url = (process.env.TURSO_DATABASE_URL || "file:local.db").trim();
  let authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  if (url.includes(" ") || url.includes("%20") || url.includes("TURSO_AUTH_TOKEN=")) {
    const parts = url.split(/\s+|%20/);
    url = parts[0];
    if (!authToken || authToken === "") {
      for (const part of parts) {
        if (part.startsWith("TURSO_AUTH_TOKEN=")) {
          authToken = part.replace("TURSO_AUTH_TOKEN=", "").trim();
        }
      }
    }
  }

  const isLocalFile = url.startsWith("file:");
  const isNode = typeof process !== "undefined" && process.versions && !!process.versions.node;

  // Remote Turso URLs (libsql://, https://, wss://) should always use @libsql/client/web & drizzle-orm/libsql/web
  // because they do not require native OS/libc binaries (@libsql/linux-x64-musl, etc.) and work seamlessly
  // across Alpine Docker, Edge, and Node.js.
  let createClient: any;
  let drizzleLibsql: any;

  if (isLocalFile && isNode) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      createClient = require("@libsql/client").createClient;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      drizzleLibsql = require("drizzle-orm/libsql").drizzle;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      createClient = require("@libsql/client/web").createClient;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      drizzleLibsql = require("drizzle-orm/libsql/web").drizzle;
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    createClient = require("@libsql/client/web").createClient;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    drizzleLibsql = require("drizzle-orm/libsql/web").drizzle;
  }

  const clientOpts: any = { url, authToken };
  if (!isLocalFile) clientOpts.fetch = retryingFetch;
  const client = createClient(clientOpts);
  _tursoDb = drizzleLibsql(client, { schema });
  globalThis.__tursoDb = _tursoDb;
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
