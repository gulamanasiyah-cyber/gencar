export const runtime = "edge";
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, mandiriKelompok, settings, mandiriKegiatan, mandiriAbsensi } from "@/lib/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // 1. Check Public Access Status
    const publicStatus = await db.select().from(settings).where(eq(settings.key, "mandiri_katalog_public_status"));
    if (!publicStatus[0] || publicStatus[0].value !== "open") {
      return NextResponse.json({ error: "Katalog sedang tidak dibuka untuk publik." }, { status: 403 });
    }

    // 2. Get latest activity to filter by attendance
    const latestActivity = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    const kegiatanId = latestActivity[0]?.id;

    if (!kegiatanId) {
      return NextResponse.json({ error: "Data tidak ditemukan (Belum absensi)" }, { status: 404 });
    }

    const data = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        statusNikah: generus.statusNikah,
        suku: generus.suku,
        foto: generus.foto,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDesa.kota,
        mandiriKelompokNama: mandiriKelompok.nama,
        createdAt: generus.createdAt,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        role: users.role,
        nomorUrut: mandiri.nomorUrut,
        noTelp: sql<string>`NULL`,
        alamat: generus.alamat,
        instagram: generus.instagram,
      })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .innerJoin(mandiriAbsensi, eq(generus.id, mandiriAbsensi.generusId))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .where(and(
        eq(generus.id, id),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ))
      .limit(1);

    if (data.length === 0) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Public Detail error:", error);
    return NextResponse.json({ error: "Gagal mengambil data detail" }, { status: 500 });
  }
}
