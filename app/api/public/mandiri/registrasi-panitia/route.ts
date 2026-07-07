
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, idCardBuilderData, settings, formPanitiaDanPengurus, mandiriDesa, mandiri, kelompok, desa, mandiriKegiatan, mandiriDaerah } from "@/lib/schema";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function generateNomorUnik() {
  const prefix = "PNB"; 
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check Registration Status
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
    const { 
        nama, jenisKelamin, tempatLahir, tanggalLahir,
        alamat, noTelp, foto, 
        mandiriDesaId, mandiriKelompokId, dapukan,
        pendidikan, pekerjaan, hobi, makananMinumanFavorit, instagram, suku, kriteriaPasangan
    } = body;

    if (!nama || !jenisKelamin || !mandiriDesaId || !noTelp || !dapukan || !foto || !tempatLahir || !tanggalLahir || !pendidikan || !pekerjaan || !hobi || !makananMinumanFavorit) {
      return NextResponse.json({ error: "Mohon lengkapi semua data wajib." }, { status: 400 });
    }

    // Fetch Desa/Daerah info for tracking and ID Card display
    const desaDataResult = await db.select({
        nama: mandiriDesa.nama,
        kota: mandiriDaerah.nama
    })
    .from(mandiriDesa)
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
    .where(eq(mandiriDesa.id, Number(mandiriDesaId)))
    .limit(1);
    const desaData = desaDataResult[0] || null;

    // 1. Check for Duplicate in Generus Table
    const existingGenerus = await db.query.generus.findFirst({
        where: or(
            and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)),
            eq(generus.noTelp, noTelp)
        )
    });

    let gId = existingGenerus?.id;
    let nomorUnik = existingGenerus?.nomorUnik;

    if (existingGenerus) {
        // Update existing generus
        await db.update(generus).set({
            nama, jenisKelamin, tempatLahir, tanggalLahir,
            alamat, noTelp, pendidikan, pekerjaan,
            hobi, makananMinumanFavorit, suku, foto, kriteriaPasangan,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            instagram: instagram || existingGenerus.instagram,
            updatedAt: new Date().toISOString()
        }).where(eq(generus.id, gId!));
    } else {
        // Create new generus
        gId = uuidv4();
        nomorUnik = generateNomorUnik();
        
        // Pick a default kelompok/desa to satisfy FK if needed
        const fkWorkaround = await db.select({ kId: kelompok.id, dId: kelompok.desaId }).from(kelompok).limit(1);
        const defaultKelId = fkWorkaround[0]?.kId || null;
        const defaultDesaId = fkWorkaround[0]?.dId || null;

        await db.insert(generus).values({
            id: gId,
            nomorUnik: nomorUnik!,
            nama,
            jenisKelamin,
            kategoriUsia: "Bekerja", 
            tempatLahir,
            tanggalLahir,
            alamat,
            noTelp,
            pendidikan,
            pekerjaan,
            hobi,
            makananMinumanFavorit,
            suku,
            foto,
            kriteriaPasangan,
            desaId: defaultDesaId,
            kelompokId: defaultKelId,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            instagram,
            createdBy: "FORM_PANITIA",
            isGenerus: 0
        });
    }

    // 2. Check/Add to mandiri table to get/stay with nomorUrut
    const existingMandiri = await db.query.mandiri.findFirst({
        where: and(
            eq(mandiri.generusId, gId!),
            eq(mandiri.kegiatanId, activeKegiatanId)
        )
    });

    let nextNr = existingMandiri?.nomorUrut;

    if (!nextNr) {
        // Calculate next nomorUrut based on gender and active activity
        // Laki-laki: 1-199, Perempuan: 200+
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

        await db.insert(mandiri).values({
            id: uuidv4(),
            generusId: gId!,
            nomorUrut: nextNr,
            kegiatanId: activeKegiatanId,
            statusMandiri: "Aktif",
            catatan: "Pendaftaran Panitia (System Generated Participant Number)"
        });
    }

    // 3. Save to form_panitia_dan_pengurus (Legacy tracking)
    const existingPanitia = await db.query.formPanitiaDanPengurus.findFirst({
        where: and(
            eq(formPanitiaDanPengurus.generusId, gId!),
            eq(formPanitiaDanPengurus.kegiatanId, activeKegiatanId)
        )
    });

    if (existingPanitia) {
        await db.update(formPanitiaDanPengurus).set({
            nama, jenisKelamin, alamat, noTelp, foto,
            tempatLahir, tanggalLahir, suku,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            dapukan,
            updatedAt: new Date().toISOString()
        }).where(eq(formPanitiaDanPengurus.id, existingPanitia.id));
    } else {
        await db.insert(formPanitiaDanPengurus).values({
            id: uuidv4(),
            generusId: gId!,
            nama,
            jenisKelamin,
            tempatLahir,
            tanggalLahir,
            alamat,
            noTelp,
            suku,
            foto,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            kegiatanId: activeKegiatanId,
            dapukan,
            nomorUnik: nomorUnik!
        });
    }

    // 4. Save to idCardBuilderData
    const existingIdCard = await db.query.idCardBuilderData.findFirst({
        where: eq(idCardBuilderData.nomorUnik, nomorUnik!)
    });

    if (existingIdCard) {
        await db.update(idCardBuilderData).set({
            nama, dapukan, foto,
            role: dapukan.toUpperCase(),
            daerah: desaData?.kota || null,
            desa: desaData?.nama || null
        }).where(eq(idCardBuilderData.id, existingIdCard.id));
    } else {
        await db.insert(idCardBuilderData).values({
            id: uuidv4(),
            nama, nomorUnik: nomorUnik!,
            dapukan, role: dapukan.toUpperCase(), foto, jenisKelamin,
            daerah: desaData?.kota || null,
            desa: desaData?.nama || null,
            kegiatanId: activeKegiatanId,
            createdBy: "FORM_PANITIA"
        });
    }

    // Get nama kegiatan
    const kegiatan = await db.query.mandiriKegiatan.findFirst({
        where: eq(mandiriKegiatan.id, activeKegiatanId)
    });
    const namaKegiatan = kegiatan?.judul || "Kegiatan Mandiri";

    return NextResponse.json({ success: true, nomorUnik, nomorUrut: nextNr, namaKegiatan });

  } catch (error) {
    console.error("Panitia Registration error:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran: " + (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }
}

