import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const INDONESIAN_NAMES = [
  "Budi Santoso", "Dewi Lestari", "Rian Hidayat", "Siti Aminah", "Andi Wijaya",
  "Rina Permata", "Agus Setiawan", "Mega Utami", "Yudi Pratama", "Novi Anggraini",
  "Hendra Gunawan", "Fitri Handayani", "Aditya Nugraha", "Larasati Putri", "Fajar Ramadhan",
  "Diana Kartika", "Eko Prasetyo", "Wulan Sari", "Denny Cahyono", "Gita Astari",
  "Rudi Hermawan", "Indah permata", "Taufik Hidayat", "Sri Wahyuni", "Ahmad Fauzi"
];

async function main() {
  try {
    // 1. Get active kegiatan ID
    const kegiatanRes = await client.execute({
      sql: "SELECT value FROM settings WHERE key = ? LIMIT 1;",
      args: ["mandiri_active_kegiatan_id"]
    });
    const kegiatanId = kegiatanRes.rows[0]?.value;
    if (!kegiatanId) {
      console.error("Error: No active kegiatan ID found in settings.");
      return;
    }
    console.log("Active Kegiatan ID:", kegiatanId);

    // 2. Fetch all regions
    const daerahRes = await client.execute("SELECT id, nama FROM mandiri_daerah;");
    const daerahList = daerahRes.rows;
    if (daerahList.length === 0) {
      console.error("Error: No mandiri_daerah found in database.");
      return;
    }
    console.log(`Found ${daerahList.length} regions.`);

    // 3. Fetch all villages
    const desaRes = await client.execute("SELECT id, nama, mandiri_daerah_id FROM mandiri_desa;");
    const desaList = desaRes.rows;
    console.log(`Found ${desaList.length} villages.`);

    // Group villages by region ID for quick selection
    const desaByDaerah = {};
    daerahList.forEach(d => {
      desaByDaerah[d.id] = desaList.filter(v => v.mandiri_daerah_id === d.id);
    });

    // 4. Generate 20 dummy members
    const dummyMembers = [];
    const usedNames = new Set();

    function getRandomName() {
      let name;
      do {
        name = INDONESIAN_NAMES[Math.floor(Math.random() * INDONESIAN_NAMES.length)];
      } while (usedNames.has(name));
      usedNames.add(name);
      return name;
    }

    // Step 4a: Ensure every region has at least one representative
    let generatedCount = 0;
    for (const daerah of daerahList) {
      if (generatedCount >= 20) break;
      const associatedDesas = desaByDaerah[daerah.id] || [];
      if (associatedDesas.length === 0) {
        console.warn(`Warning: Region '${daerah.nama}' (ID: ${daerah.id}) has no associated villages.`);
        continue;
      }
      const randomDesa = associatedDesas[Math.floor(Math.random() * associatedDesas.length)];
      
      dummyMembers.push({
        id: crypto.randomUUID(),
        nama: getRandomName(),
        kegiatanId,
        daerahId: daerah.id,
        desaId: randomDesa.id,
        tipe: generatedCount % 2 === 0 ? "PNKB" : "Ibu Gambuh"
      });
      generatedCount++;
    }

    // Step 4b: Fill the remaining spots up to 20
    while (generatedCount < 20) {
      // Pick a random region that has at least one village
      const validDaerahs = daerahList.filter(d => (desaByDaerah[d.id] || []).length > 0);
      if (validDaerahs.length === 0) break;
      
      const randomDaerah = validDaerahs[Math.floor(Math.random() * validDaerahs.length)];
      const associatedDesas = desaByDaerah[randomDaerah.id];
      const randomDesa = associatedDesas[Math.floor(Math.random() * associatedDesas.length)];

      dummyMembers.push({
        id: crypto.randomUUID(),
        nama: getRandomName(),
        kegiatanId,
        daerahId: randomDaerah.id,
        desaId: randomDesa.id,
        tipe: generatedCount % 2 === 0 ? "PNKB" : "Ibu Gambuh"
      });
      generatedCount++;
    }

    console.log(`Generated ${dummyMembers.length} dummy members:`);
    console.log(dummyMembers);

    // 5. Insert into tim_gambuh
    console.log("Inserting dummy members into tim_gambuh...");
    for (const m of dummyMembers) {
      await client.execute({
        sql: "INSERT INTO tim_gambuh (id, nama, kegiatan_id, daerah_id, desa_id, tipe, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'));",
        args: [m.id, m.nama, m.kegiatanId, m.daerahId, m.desaId, m.tipe]
      });
    }

    console.log("Success! Generated and inserted 20 dummy members successfully.");
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    client.close();
  }
}

main();
