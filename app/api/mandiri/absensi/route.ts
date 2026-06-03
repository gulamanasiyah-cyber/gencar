export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, generus, mandiriKegiatan, mandiriDesa, mandiri, idCardBuilderData, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");

    if (!kegiatanId) return NextResponse.json({ error: "kegiatanId diperlukan" }, { status: 400 });

    const data = await db
      .select({
        id: mandiriAbsensi.id,
        kegiatanId: mandiriAbsensi.kegiatanId,
        generusId: mandiriAbsensi.generusId,
        timestamp: mandiriAbsensi.timestamp,
        keterangan: mandiriAbsensi.keterangan,
        generusNama: generus.nama,
        generusNomorUnik: generus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDesa.kota,
        nomorPeserta: sql<string>`COALESCE(CAST(${mandiri.nomorUrut} AS TEXT), ${idCardBuilderData.dapukan})`,
      })
      .from(mandiriAbsensi)
      .leftJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(idCardBuilderData, eq(generus.nomorUnik, idCardBuilderData.nomorUnik))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(eq(mandiriAbsensi.kegiatanId, kegiatanId));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mandiri Absensi GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kegiatanId, generusId: rawGenerusId, keterangan } = body;

    if (!kegiatanId || !rawGenerusId) {
      return NextResponse.json({ error: "kegiatanId dan generusId diperlukan" }, { status: 400 });
    }

    // Resolve generus using the unified logic
    const upperCode = rawGenerusId.toUpperCase();
    
    // Use select to allow complex joins (Drizzle query syntax doesn't join mandiri well here)
    const resolvedResults = await db
      .select({
        id: generus.id,
        nama: generus.nama,
        nomorPeserta: mandiri.nomorUrut
      })
      .from(generus)
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(
        or(
          eq(generus.id, rawGenerusId),
          eq(sql`UPPER(${generus.nomorUnik})`, upperCode),
          !isNaN(Number(rawGenerusId)) ? eq(sql`CAST(${mandiri.nomorUrut} AS TEXT)`, rawGenerusId) : sql`0`
        )
      )
      .limit(1);

    let resolvedGenerusId = "";
    let resolvedGenerusNama = "";

    if (resolvedResults.length > 0) {
      resolvedGenerusId = resolvedResults[0].id;
      resolvedGenerusNama = resolvedResults[0].nama;
    } else {
      // Try searching in form_panitia_dan_pengurus if not found in generus directly
      const panitiaResults = await db
        .select({
          id: formPanitiaDanPengurus.id,
          generusId: formPanitiaDanPengurus.generusId,
          nama: formPanitiaDanPengurus.nama,
          nomorUnik: formPanitiaDanPengurus.nomorUnik,
          jenisKelamin: formPanitiaDanPengurus.jenisKelamin,
          noTelp: formPanitiaDanPengurus.noTelp,
          mandiriDesaId: formPanitiaDanPengurus.mandiriDesaId,
          mandiriKelompokId: formPanitiaDanPengurus.mandiriKelompokId,
          foto: formPanitiaDanPengurus.foto,
        })
        .from(formPanitiaDanPengurus)
        .where(
          or(
            eq(formPanitiaDanPengurus.id, rawGenerusId),
            eq(sql`UPPER(${formPanitiaDanPengurus.nomorUnik})`, upperCode)
          )
        )
        .limit(1);

      if (panitiaResults.length === 0) {
        return NextResponse.json({ error: `Kode/No. Peserta "${rawGenerusId}" tidak terdaftar dalam sistem.` }, { status: 404 });
      }

      const panitia = panitiaResults[0];
      
      if (panitia.generusId) {
        resolvedGenerusId = panitia.generusId;
        resolvedGenerusNama = panitia.nama;
      } else {
        // Create generus on the fly if it doesn't exist yet for this Panitia
        resolvedGenerusId = uuidv4();
        resolvedGenerusNama = panitia.nama;
        
        await db.insert(generus).values({
          id: resolvedGenerusId,
          nama: panitia.nama,
          nomorUnik: panitia.nomorUnik || `PNB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          jenisKelamin: (panitia.jenisKelamin as "L" | "P") || "L",
          noTelp: panitia.noTelp,
          mandiriDesaId: panitia.mandiriDesaId,
          mandiriKelompokId: panitia.mandiriKelompokId,
          foto: panitia.foto,
          kategoriUsia: "Bekerja", // Default for auto-linked panitia to satisfy DB constraints
          isGenerus: 1,
          createdBy: "ABSENSI_AUTO_LINK"
        });

        // Link back to form
        await db.update(formPanitiaDanPengurus)
          .set({ generusId: resolvedGenerusId })
          .where(eq(formPanitiaDanPengurus.id, panitia.id));
      }
    }

    // Check if already present in Mandiri Absensi
    const existing = await db.query.mandiriAbsensi.findFirst({
      where: and(eq(mandiriAbsensi.kegiatanId, kegiatanId), eq(mandiriAbsensi.generusId, resolvedGenerusId)),
    });

    if (existing) {
      return NextResponse.json({ error: "Sudah diabsen", existing }, { status: 409 });
    }

    const id = uuidv4();
    await db.insert(mandiriAbsensi).values({
      id,
      kegiatanId,
      generusId: resolvedGenerusId,
      keterangan: keterangan || "hadir",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id, generusNama: resolvedGenerusNama });
  } catch (error) {
    console.error("Mandiri Absensi POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id absensi diperlukan" }, { status: 400 });

    await db.delete(mandiriAbsensi).where(eq(mandiriAbsensi.id, id));

    return NextResponse.json({ success: true, message: "Data absensi berhasil dihapus" });
  } catch (error) {
    console.error("Mandiri Absensi DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
