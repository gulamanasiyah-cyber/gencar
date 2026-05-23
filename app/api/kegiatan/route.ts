export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kegiatan, desa, kelompok } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conditions = [];
    if (session.role === "desa" && session.desaId) {
      conditions.push(eq(kegiatan.desaId, session.desaId));
    } else if (session.role === "kelompok" && session.kelompokId) {
      conditions.push(eq(kegiatan.kelompokId, session.kelompokId));
    }

    const data = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${kegiatan.tanggal} DESC`);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Kegiatan GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { judul, deskripsi, tanggal, jam, lokasi, desaId, kelompokId } = body;

    if (!judul || !tanggal) {
      return NextResponse.json({ error: "Judul dan tanggal wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();
    let finalDesaId = ["admin", "pengurus_daerah", "kmm_daerah", "admin_keuangan"].includes(session.role) ? (desaId ? Number(desaId) : null) : session.desaId;
    let finalKelompokId = ["admin", "pengurus_daerah", "kmm_daerah", "admin_keuangan"].includes(session.role) ? (kelompokId ? Number(kelompokId) : null) : session.kelompokId;

    // Additional strictness: Pengurus Desa cannot create for other Desa
    if (session.role === "desa") {
      finalDesaId = session.desaId;
      // KelompokId can be null (event for entire desa) or specific kelompok within that desa
      // Ideally we should validate that the kelompokId belongs to this desaId
    }

    // Additional strictness: Pengurus Kelompok cannot create for other Kelompok
    if (session.role === "kelompok") {
      finalKelompokId = session.kelompokId;
      finalDesaId = session.desaId; // Usually grouped under a desa
    }

    await db.insert(kegiatan).values({
      id,
      judul,
      deskripsi,
      tanggal,
      jam,
      lokasi,
      desaId: finalDesaId,
      kelompokId: finalKelompokId,
      createdBy: session.userId,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Kegiatan POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
