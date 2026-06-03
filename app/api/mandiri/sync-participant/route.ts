
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriAbsensi, mandiriDesa, idCardBuilderData } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      nama, 
      nomorUnik, 
      daerah, 
      desa, 
      role,
      dapukan, 
      foto, 
      jenisKelamin, 
      kegiatanId,
      gradient 
    } = body;

    if (!nama || !nomorUnik || !jenisKelamin) {
      return NextResponse.json({ error: "Nama, Nomor Unik, dan Jenis Kelamin wajib diisi" }, { status: 400 });
    }

    // 1. Find or Create Generus
    let targetGenerusId = "";
    const existingGenerus = await db.query.generus.findFirst({
      where: eq(generus.nomorUnik, nomorUnik)
    });

    if (existingGenerus) {
      targetGenerusId = existingGenerus.id;
      // Update existing if needed (optional, but good for sync)
      await db.update(generus).set({
        nama,
        foto: foto || existingGenerus.foto,
        updatedAt: sql`(datetime('now'))`
      }).where(eq(generus.id, targetGenerusId));
    } else {
      targetGenerusId = uuidv4();
      
      // Try to find mandiriDesaId based on daerah name
      let mDesaId = null;
      if (daerah && daerah !== "KOTA / DAERAH") {
        const dMatch = await db.query.mandiriDesa.findFirst({
          where: sql`lower(${mandiriDesa.nama}) = ${daerah.toLowerCase()} OR lower(${mandiriDesa.kota}) = ${daerah.toLowerCase()}`
        });
        if (dMatch) mDesaId = dMatch.id;
      }

      await db.insert(generus).values({
        id: targetGenerusId,
        nomorUnik,
        nama,
        jenisKelamin,
        kategoriUsia: "Bekerja",
        foto: foto || null,
        mandiriDesaId: mDesaId,
        isGenerus: 0
      });
    }

    // 2. Ensure in Mandiri table
    const existingMandiri = await db.query.mandiri.findFirst({
      where: eq(mandiri.generusId, targetGenerusId)
    });

    if (!existingMandiri) {
      // Calculate next nomorUrut
      let nextNr;
      if (jenisKelamin === "L") {
          const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
              .from(mandiri)
              .where(sql`${mandiri.nomorUrut} < 200`);
          nextNr = (lastRes[0]?.maxNr || 0) + 1;
      } else {
          const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
              .from(mandiri)
              .where(sql`${mandiri.nomorUrut} >= 200`);
          nextNr = Math.max(lastRes[0]?.maxNr || 199, 199) + 1;
      }

      await db.insert(mandiri).values({
        id: uuidv4(),
        generusId: targetGenerusId,
        nomorUrut: nextNr,
        statusMandiri: "Aktif",
        catatan: `Daftar via ID Card Builder (${role || ""}${dapukan ? " - " + dapukan : ""})`
      });
    }

    // 3. Record Attendance if kegiatanId provided
    if (kegiatanId) {
      const existingAbsensi = await db.query.mandiriAbsensi.findFirst({
        where: and(
          eq(mandiriAbsensi.kegiatanId, kegiatanId),
          eq(mandiriAbsensi.generusId, targetGenerusId)
        )
      });

      if (!existingAbsensi) {
        await db.insert(mandiriAbsensi).values({
          id: uuidv4(),
          kegiatanId,
          generusId: targetGenerusId,
          keterangan: "hadir"
        });
      }
    }
    
    // 4. Save to ID Card Builder Data Record
    await db.insert(idCardBuilderData).values({
      id: uuidv4(),
      nama,
      daerah,
      desa,
      role,
      dapukan,
      foto,
      nomorUnik,
      jenisKelamin,
      kegiatanId,
      gradient: gradient || null,
      createdBy: session.userId,
    });

    return NextResponse.json({ 
      success: true, 
      generusId: targetGenerusId,
      message: kegiatanId ? "Data tersinkron dan kehadiran dicatat" : "Data peserta tersinkron"
    });

  } catch (error: any) {
    console.error("Sync Participant Error:", error);
    return NextResponse.json({ error: error.message || "Gagal sinkronisasi data" }, { status: 500 });
  }
}
