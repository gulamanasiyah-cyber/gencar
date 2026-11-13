export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKegiatan } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { getMandiriKegiatanList, invalidateKegiatanCache } from "@/lib/cached-queries";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Dibaca dari cache memori; di-invalidate setiap kali kegiatan berubah.
    const data = await getMandiriKegiatanList();

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Mandiri Kegiatan GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { judul, deskripsi, tanggal, lokasi, kota, desaId, kelompokId } = body;

    if (!judul || !tanggal || !kota) {
      return NextResponse.json({ error: "Judul, tanggal, dan kota wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();
    
    await db.insert(mandiriKegiatan).values({
      id,
      judul,
      deskripsi,
      tanggal,
      lokasi,
      kota,
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      createdBy: session.userId,
    });
    invalidateKegiatanCache();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Mandiri Kegiatan POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
