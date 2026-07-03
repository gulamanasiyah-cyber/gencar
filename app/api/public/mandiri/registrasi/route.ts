
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, settings, desa, kelompok, users, mandiriDesa, mandiriDaerah, mandiriKegiatan } from "@/lib/schema";
import { sendOneSignalNotification } from "@/lib/onesignal";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function generateNomorUnik() {
  const prefix = "MND"; // Using MND prefix for public mandiri registration
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check Registration Status (Open/Closed)
    const statusSet = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_status"));
    if (statusSet[0]?.value === "0") {
      return NextResponse.json({ error: "Pendaftaran saat ini sedang ditutup secara manual oleh admin." }, { status: 403 });
    }

    const body = await request.json();

    // 2. Fetch active activity
    const activeSetting = await db.query.settings.findFirst({
        where: eq(settings.key, "mandiri_active_kegiatan_id")
    });
    const activeKegiatanId = activeSetting?.value;
    
    if (!activeKegiatanId) {
        return NextResponse.json({ error: "Pendaftaran tidak dapat diproses karena tidak ada kegiatan mandiri yang sedang aktif." }, { status: 400 });
    }

    const activeKegRes = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, activeKegiatanId)).limit(1);
    const activeKegNama = activeKegRes[0]?.judul || "Kegiatan Mandiri";
    const {
        nama, jenisKelamin, tempatLahir, tanggalLahir,
        alamat, noTelp, pendidikan, pekerjaan, statusNikah,
        hobi, makananMinumanFavorit, suku, foto,
        mandiriDesaId, mandiriKelompokId, instagram,
        statusPeserta, dibayarkanSenilai, buktiPembayaran
    } = body;

    if (!nama || !jenisKelamin || !mandiriDesaId || !tempatLahir || !tanggalLahir || !noTelp || !pendidikan || !pekerjaan || !hobi || !makananMinumanFavorit || !foto) {
      return NextResponse.json({ error: "Mohon lengkapi semua data wajib." }, { status: 400 });
    }

    if (statusPeserta === "Person" && (!dibayarkanSenilai || !buktiPembayaran)) {
      return NextResponse.json({ error: "Mohon lengkapi nominal pembayaran dan bukti pembayaran." }, { status: 400 });
    }

    // 2.1. Quota Check for Daerah (Max 5 males, 5 females per kegiatan)
    const desaRecord = await db.select({
      daerahId: mandiriDesa.mandiriDaerahId,
      daerahNama: mandiriDaerah.nama
    })
    .from(mandiriDesa)
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
    .where(eq(mandiriDesa.id, Number(mandiriDesaId)))
    .limit(1);

    const catatanPembayaran = statusPeserta === "Person"
      ? "Sudah dibayar oleh peserta Person"
      : `Sudah dibayar oleh ${desaRecord[0]?.daerahNama || "Daerah Terkait"}`;

    if (desaRecord.length > 0 && desaRecord[0].daerahId) {
      const targetDaerahId = desaRecord[0].daerahId;
      const targetDaerahNama = desaRecord[0].daerahNama || "Daerah Terkait";

      const countResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(and(
        eq(mandiri.kegiatanId, activeKegiatanId),
        eq(mandiriDesa.mandiriDaerahId, targetDaerahId),
        eq(generus.jenisKelamin, jenisKelamin)
      ));

      const registeredCount = Number(countResult[0]?.count || 0);

      if (registeredCount >= 5) {
        const genderLabel = jenisKelamin === "L" ? "pria" : "wanita";
        return NextResponse.json({
          status: "quota_full",
          error: `kouta peserta ${genderLabel} untuk daerah ${targetDaerahNama} sudah penuh, jikaa ingin ikut dapat datang secara mandiri`
        }, { status: 409 });
      }
    }

    // Duplicate Check
    const duplicateConditions = [];
    if (nama && tanggalLahir) {
        duplicateConditions.push(and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)));
    }
    if (noTelp) {
        duplicateConditions.push(eq(generus.noTelp, noTelp));
    }

    const duplicate = duplicateConditions.length > 0 
        ? await db.query.generus.findFirst({ where: or(...duplicateConditions) })
        : null;

    if (duplicate) {
        // Check if already in mandiri list for the active event
        const existingMandiri = await db.query.mandiri.findFirst({
            where: and(
                eq(mandiri.generusId, duplicate.id),
                eq(mandiri.kegiatanId, activeKegiatanId)
            )
        });

        if (existingMandiri) {
            return NextResponse.json({ 
                isAlreadyRegistered: true,
                nomorUnik: duplicate.nomorUnik,
                nomorUrut: existingMandiri.nomorUrut,
                nama: duplicate.nama,
                message: "Peserta sudah terdaftar sebelumnya."
            });
        }

        // --- VALIDATION PASSED: Existing Generus found, Proceed to add to Mandiri ---
        
        // Update existing generus data with the latest info from Mandiri form
        // Also remove from youth category (isGenerus = 0)
        await db.update(generus).set({
            nama, jenisKelamin, tempatLahir, tanggalLahir,
            alamat, noTelp, pendidikan, pekerjaan, statusNikah: statusNikah || "Belum Menikah",
            hobi, makananMinumanFavorit, suku, foto,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            instagram: instagram || duplicate.instagram, 
            isGenerus: 0,
            updatedAt: new Date().toISOString()
        }).where(eq(generus.id, duplicate.id));

        // Hapus akun generus lama (users) agar tidak duplikat role
        await db.delete(users).where(eq(users.generusId, duplicate.id));

        // Calculate next nomorUrut based on gender and active activity
        // Laki-laki: 1-199, Perempuan: 200+
        let nextNr;
        if (jenisKelamin === "L") {
            const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
                .from(mandiri)
                .where(and(
                    sql`${mandiri.nomorUrut} < 200`,
                    eq(mandiri.kegiatanId, activeKegiatanId)
                ));
            nextNr = (lastRes[0]?.maxNr || 0) + 1;
        } else {
            const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
                .from(mandiri)
                .where(and(
                    sql`${mandiri.nomorUrut} >= 200`,
                    eq(mandiri.kegiatanId, activeKegiatanId)
                ));
            nextNr = Math.max(lastRes[0]?.maxNr || 199, 199) + 1;
        }

        // Add to mandiri activity list
        await db.insert(mandiri).values({
            id: uuidv4(),
            generusId: duplicate.id,
            nomorUrut: nextNr,
            kegiatanId: activeKegiatanId,
            statusMandiri: "Aktif",
            statusPeserta: statusPeserta === "Person" ? "Person" : "Utusan Daerah",
            dibayarkanSenilai: statusPeserta === "Person" ? Number(dibayarkanSenilai) : null,
            buktiPembayaran: statusPeserta === "Person" ? buktiPembayaran : null,
            catatan: catatanPembayaran
        });

        // Send OneSignal push notification
        await sendOneSignalNotification({
          headings: "Pendaftaran Sukses! 🎉",
          contents: `Halo ${nama}, pendaftaran Anda untuk kegiatan "${activeKegNama}" berhasil. Nomor Urut Anda adalah #${nextNr}.`,
          externalUserIds: [noTelp]
        });

        return NextResponse.json({ success: true, generusId: duplicate.id, nomorUnik: duplicate.nomorUnik, nomorUrut: nextNr });
    }

    // --- CASE: NEW GENERUS ---

    // Pick a valid kelompok/desa for the new entry to satisfy constraints
    const fkWorkaround = await db.select({ 
        kId: kelompok.id, 
        dId: kelompok.desaId 
    }).from(kelompok).limit(1);

    let defaultDesaId = null;
    let defaultKelompokId = null;

    if (fkWorkaround.length > 0) {
        defaultKelompokId = fkWorkaround[0].kId;
        defaultDesaId = fkWorkaround[0].dId;
    } else {
        const firstDesa = await db.select({ id: desa.id }).from(desa).limit(1);
        defaultDesaId = firstDesa[0]?.id;
    }

    let nomorUnik = generateNomorUnik();
    let uniqueExisting = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    while (uniqueExisting) {
      nomorUnik = generateNomorUnik();
      uniqueExisting = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    }

    const generusId = uuidv4();
    const generusData: any = {
      id: generusId,
      nomorUnik,
      nama,
      jenisKelamin,
      kategoriUsia: "Bekerja", // Default as it's no longer in form and DB constraint lacks 'Mandiri'
      tempatLahir,
      tanggalLahir,
      alamat,
      noTelp,
      pendidikan,
      pekerjaan,
      statusNikah: statusNikah || "Belum Menikah",
      hobi,
      makananMinumanFavorit,
      suku,
      foto,
      desaId: defaultDesaId,
      kelompokId: defaultKelompokId,
      mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
      mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
      instagram,
      createdBy: "FORM_MANDIRI",
      isGenerus: 0
    };

    await db.insert(generus).values(generusData);

    // Calculate next nomorUrut based on gender and active activity
    // Laki-laki: 1-199, Perempuan: 200+
    let nextNr;
    if (jenisKelamin === "L") {
        const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
            .from(mandiri)
            .where(and(
                sql`${mandiri.nomorUrut} < 200`,
                eq(mandiri.kegiatanId, activeKegiatanId)
            ));
        nextNr = (lastRes[0]?.maxNr || 0) + 1;
    } else {
        const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
            .from(mandiri)
            .where(and(
                sql`${mandiri.nomorUrut} >= 200`,
                eq(mandiri.kegiatanId, activeKegiatanId)
            ));
        nextNr = Math.max(lastRes[0]?.maxNr || 199, 199) + 1;
    }

    // Add to mandiri activity list
    await db.insert(mandiri).values({
      id: uuidv4(),
      generusId,
      nomorUrut: nextNr,
      kegiatanId: activeKegiatanId,
      statusMandiri: "Aktif",
      statusPeserta: statusPeserta === "Person" ? "Person" : "Utusan Daerah",
      dibayarkanSenilai: statusPeserta === "Person" ? Number(dibayarkanSenilai) : null,
      buktiPembayaran: statusPeserta === "Person" ? buktiPembayaran : null,
      catatan: catatanPembayaran
    });

    // Send OneSignal push notification
    await sendOneSignalNotification({
      headings: "Pendaftaran Sukses! 🎉",
      contents: `Halo ${nama}, pendaftaran Anda untuk kegiatan "${activeKegNama}" berhasil. Nomor Urut Anda adalah #${nextNr}.`,
      externalUserIds: [noTelp]
    });

    return NextResponse.json({ success: true, generusId, nomorUnik, nomorUrut: nextNr });
  } catch (error) {
    console.error("Public Registration error:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran" }, { status: 500 });
  }
}
