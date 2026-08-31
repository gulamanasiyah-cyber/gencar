import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "../../../shared/schema";

/** Workers: drizzle bound to c.env.DB. No Turso fallback — D1 only for server/. */
export function getDb(env: { DB: D1Database }) {
  if (!env?.DB) throw new Error("D1 binding 'DB' missing — check wrangler.toml [[d1_databases]] or --local DB mock");
  return drizzleD1(env.DB, { schema });
}
export { schema };
