import { getDb } from "./lib/db.js";
import { mandiriKegiatanDaerah, mandiriDaerah } from "./lib/schema.js";

async function main() {
  const db = getDb();
  console.log("Checking DB...");
  const records = await db.select().from(mandiriKegiatanDaerah);
  console.log("Kegiatan Daerah records:", records);
  
  const daerahs = await db.select().from(mandiriDaerah);
  console.log("Daerahs:", daerahs);
}

main().catch(console.error);
