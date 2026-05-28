import { db } from "./lib/db";
import { kegiatan, absensi, generus } from "./lib/schema";

async function run() {
  const k = await db.query.kegiatan.findMany();
  console.log("Kegiatan:", k);
  
  const g = await db.query.generus.findMany({limit: 5});
  console.log("Generus:", g);
}
run();
