export const runtime = "edge";
export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession, setSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    console.log("Profile API - Session:", session);
    let currentGenerusId = session?.generusId;

    if (!session) {
        // Independent Participant check via headers
        const headerUnik = request.headers.get("x-nomor-unik");
        const headerToken = request.headers.get("x-session-token");

        if (headerUnik && headerToken) {
            const m = await db.select({ generusId: mandiri.generusId })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, headerUnik), eq(mandiri.lastSessionToken, headerToken)))
                .limit(1);
            if (m.length > 0) currentGenerusId = m[0].generusId;
        }

        if (!currentGenerusId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    if (!currentGenerusId) {
      if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt"].includes(session.role)) {
        return NextResponse.json({ error: "Akun Anda belum terhubung dengan data profil generus" }, { status: 403 });
      }

      // Fallback: Ambil data dari tabel users (baru atau lama) jika tidak punya generusId (khusus pengurus/admin)
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

      // Jika tidak ada di tabel users, cek di users_old
      if (userData.length === 0) {
          const { users } = await import("@/lib/schema");
          const oldData = await db
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
          
          if (oldData.length > 0) {
              userData = oldData as any;
          }
      }

      if (userData.length === 0) {
        console.log("Profile API - User data not found for session user ID in both users and users_old:", session.userId);
        return NextResponse.json({ error: "Data user tidak ditemukan" }, { status: 404 });
      }

      const u = userData[0];
      return NextResponse.json({
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
      }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const data = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        desaId: generus.desaId,
        kelompokId: generus.kelompokId,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        kota: mandiriDesa.kota,
        createdAt: generus.createdAt,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(eq(generus.id, currentGenerusId))
      .limit(1);

    if (data.length === 0) {
      console.log("Profile API - Generus data not found for ID:", currentGenerusId);
      return NextResponse.json({ error: "Data profil tidak ditemukan" }, { status: 404 });
    }

    const mandiriData = await db.query.mandiri.findFirst({ where: eq(mandiri.generusId, currentGenerusId) });

    // Include the current session role and PDKT status in the response
    const profile = {
      ...data[0],
      role: session?.role || "peserta",
      nomorUrut: mandiriData?.nomorUrut || null,
      isInPdkt: !!mandiriData || (session && ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt"].includes(session.role))
    };

    // Nonaktifkan cache agar data selalu fresh setelah update
    return NextResponse.json(profile, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.generusId) {
      if (!["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { nama, desaId, kelompokId } = body;

      // Create a new generus record for this admin/pengurus if they don't have one
      // This allows them to have a full profile with photo, birthdate, etc.
      const newGenerusId = uuidv4();
      const nomorUnik = `${session.role === "admin" ? "ADM" : "OFF"}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Get user's current desa/kelompok if not provided
      const userRecord = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
      const finalDesaId = Number(desaId || userRecord?.desaId || 1);
      const finalKelompokId = Number(kelompokId || userRecord?.kelompokId || 1);

      await db.insert(generus).values({
        id: newGenerusId,
        nomorUnik,
        nama: nama || session.name,
        tempatLahir: body.tempatLahir || "-",
        tanggalLahir: body.tanggalLahir || "-",
        jenisKelamin: body.jenisKelamin || "L",
        kategoriUsia: body.kategoriUsia || "Bekerja",
        alamat: body.alamat || "-",
        noTelp: body.noTelp || "-",
        pendidikan: body.pendidikan || "-",
        pekerjaan: body.pekerjaan || session.role.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        statusNikah: body.statusNikah || "Menikah",
        hobi: body.hobi || "-",
        makananMinumanFavorit: body.makananMinumanFavorit || "-",
        suku: body.suku || "-",
        foto: body.foto || "",
        desaId: finalDesaId,
        kelompokId: finalKelompokId,
        createdBy: session.userId,
      });

      // Link it to the user
      await db.update(users).set({ generusId: newGenerusId, name: nama || session.name }).where(eq(users.id, session.userId));

      // Update session cookie with new generusId and name
      await setSession({ ...session, generusId: newGenerusId, name: nama || session.name });

      // Fetch the full data we just created to return to frontend
      const updatedData = await db
        .select({
          id: generus.id,
          nomorUnik: generus.nomorUnik,
          nama: generus.nama,
          tempatLahir: generus.tempatLahir,
          tanggalLahir: generus.tanggalLahir,
          jenisKelamin: generus.jenisKelamin,
          kategoriUsia: generus.kategoriUsia,
          alamat: generus.alamat,
          noTelp: generus.noTelp,
          pendidikan: generus.pendidikan,
          pekerjaan: generus.pekerjaan,
          statusNikah: generus.statusNikah,
          hobi: generus.hobi,
          makananMinumanFavorit: generus.makananMinumanFavorit,
          suku: generus.suku,
          foto: generus.foto,
          instagram: generus.instagram,
          desaNama: desa.nama,
          kelompokNama: kelompok.nama,
          mandiriDesaNama: mandiriDesa.nama,
          kota: mandiriDesa.kota,
          createdAt: generus.createdAt,
        })
        .from(generus)
        .leftJoin(desa, eq(generus.desaId, desa.id))
        .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
        .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
        .where(eq(generus.id, newGenerusId))
        .limit(1);

      return NextResponse.json({ success: true, data: { ...updatedData[0], role: session.role } });
    }

    const { nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, alamat, noTelp, pendidikan, pekerjaan, statusNikah, hobi, makananMinumanFavorit, suku, foto, instagram } = await request.json();

    await db
      .update(generus)
      .set({
        nama,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
        kategoriUsia,
        alamat,
        noTelp,
        pendidikan,
        pekerjaan,
        statusNikah,
        hobi,
        makananMinumanFavorit,
        suku,
        foto,
        instagram,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generus.id, session.generusId));

    // Sinkronkan nama ke tabel users jika berubah
    if (nama) {
      await db.update(users).set({ name: nama }).where(eq(users.generusId, session.generusId));
      // Update session cookie with new name
      await setSession({ ...session, name: nama });
    }

    // Kembalikan data terbaru agar frontend bisa update state langsung tanpa fetch ulang
    const updated = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        kota: mandiriDesa.kota,
        createdAt: generus.createdAt,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(eq(generus.id, session.generusId))
      .limit(1);

    return NextResponse.json({ success: true, data: updated[0] ?? null });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Gagal mengupdate profil" }, { status: 500 });
  }
}
