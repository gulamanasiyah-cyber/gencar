import { db } from "../lib/db";
import { users, desa, kelompok } from "../lib/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const email = "panitiagambuh@jb2.id";
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.log("User not found in db");
      return;
    }

    console.log("Simulating GET /api/profile for user:", user);

    const session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      desaId: user.desaId,
      kelompokId: user.kelompokId,
      generusId: user.generusId,
    };

    let currentGenerusId = session?.generusId;

    if (!currentGenerusId) {
      if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_gambuh"].includes(session.role)) {
        console.log("Error: Akun Anda belum terhubung dengan data profil generus (403)");
        return;
      }

      let userData = await db
        .select({
          id: users.id,
          nama: users.name,
          email: users.email,
          role: users.role,
          desaId: users.desaId,
          kelompokId: users.kelompokId,
          desaNama: desa.nama,
          kelompokNama: kelompok.nama,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(desa, eq(users.desaId, desa.id))
        .leftJoin(kelompok, eq(users.kelompokId, kelompok.id))
        .where(eq(users.id, session.userId))
        .limit(1);

      console.log("Fallback user data query result:", userData);

      if (userData.length === 0) {
        console.log("Error: Data user tidak ditemukan (404)");
        return;
      }

      const u = userData[0];
      const result = {
        id: u.id,
        nomorUnik: "OFFICIAL-" + u.id.split("-")[0].toUpperCase(),
        nama: u.nama,
        tempatLahir: "-",
        tanggalLahir: "-",
        jenisKelamin: "L",
        kategoriUsia: "Bekerja",
        alamat: "-",
        noTelp: "-",
        pendidikan: "-",
        pekerjaan: u.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        statusNikah: "Menikah",
        desaId: u.desaId,
        kelompokId: u.kelompokId,
        desaNama: u.desaNama || "Daerah",
        kelompokNama: u.kelompokNama || "Daerah",
        role: u.role,
        isInPdkt: true,
        createdAt: u.createdAt,
      };

      console.log("Success result:", result);
    }
  } catch (error) {
    console.error("Simulation failed:", error);
  }
}

main();
