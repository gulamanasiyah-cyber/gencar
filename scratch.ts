import { db } from "./lib/db";
import { generus, mandiriAbsensi, mandiriKegiatan } from "./lib/schema";
import { like, eq, desc, and } from "drizzle-orm";

async function run() {
  // 1. Find all generus matching "Raka"
  const matchingGenerus = await db.select()
    .from(generus)
    .where(like(generus.nama, "%Raka%"));

  if (matchingGenerus.length === 0) {
    console.log("No participant named Raka found.");
    return;
  }

  console.log("Found matching participants:");
  for (const g of matchingGenerus) {
    console.log(`- ${g.nama} (ID: ${g.id}, Nomor Unik: ${g.nomorUnik})`);
  }

  // 2. Find the latest activity
  const latestActivity = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
  if (latestActivity.length === 0) {
    console.log("No active kegiatan found.");
    return;
  }
  const kegiatanId = latestActivity[0].id;
  console.log(`Targeting Activity: ${latestActivity[0].judul}`);

  // 3. Update status to 'hadir' for each matched Raka
  for (const g of matchingGenerus) {
    const att = await db.select()
      .from(mandiriAbsensi)
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, g.id)
      ))
      .limit(1);

    if (att.length > 0) {
      if (att[0].keterangan === "pulang") {
        await db.update(mandiriAbsensi)
          .set({ keterangan: "hadir", timestamp: new Date().toISOString() })
          .where(eq(mandiriAbsensi.id, att[0].id));
        console.log(`SUCCESS: Status for ${g.nama} has been updated to 'hadir' (no longer 'pulang').`);
      } else {
        console.log(`INFO: Status for ${g.nama} is already '${att[0].keterangan}' (not 'pulang').`);
      }
    } else {
      // If no attendance record exists, insert a new one
      const newAbsId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      await db.insert(mandiriAbsensi).values({
        id: newAbsId,
        kegiatanId,
        generusId: g.id,
        keterangan: "hadir",
        timestamp: new Date().toISOString()
      });
      console.log(`SUCCESS: Created new attendance record ('hadir') for ${g.nama}.`);
    }
  }
}

run().catch(err => {
  console.error("Error running script:", err);
});
