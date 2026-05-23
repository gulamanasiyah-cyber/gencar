export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kegiatan, absensi, desa, kelompok } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = params;
    const data = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
    if (!data) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = params;
    const body = await request.json();
    const { judul, deskripsi, tanggal, jam, lokasi, desaId, kelompokId } = body;

    let finalDesaId = ["admin", "pengurus_daerah", "kmm_daerah", "admin_keuangan"].includes(session.role) ? (desaId ? Number(desaId) : null) : session.desaId;
    let finalKelompokId = ["admin", "pengurus_daerah", "kmm_daerah", "admin_keuangan"].includes(session.role) ? (kelompokId ? Number(kelompokId) : null) : session.kelompokId;

    if (session.role === "desa") {
      finalDesaId = session.desaId;
    }
    if (session.role === "kelompok") {
      finalKelompokId = session.kelompokId;
      finalDesaId = session.desaId;
    }

    await db.update(kegiatan).set({ 
      judul, deskripsi, tanggal, jam, lokasi,
      desaId: finalDesaId, kelompokId: finalKelompokId
    }).where(eq(kegiatan.id, id));
    
    // Kembalikan data terbaru
    const updated = await db
      .select({
        id: kegiatan.id,
        judul: kegiatan.judul,
        deskripsi: kegiatan.deskripsi,
        tanggal: kegiatan.tanggal,
        jam: kegiatan.jam,
        lokasi: kegiatan.lokasi,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        desaId: kegiatan.desaId,
        kelompokId: kegiatan.kelompokId,
        createdAt: kegiatan.createdAt,
      })
      .from(kegiatan)
      .leftJoin(desa, eq(kegiatan.desaId, desa.id))
      .leftJoin(kelompok, eq(kegiatan.kelompokId, kelompok.id))
      .where(eq(kegiatan.id, id))
      .then(res => res[0]);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = params;
    
    // FIX: Delete absensi related to this kegiatan first to avoid FK constraint error
    await db.delete(absensi).where(eq(absensi.kegiatanId, id));
    
    await db.delete(kegiatan).where(eq(kegiatan.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
