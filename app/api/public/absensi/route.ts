export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absensi, generus, kegiatan } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kegiatanId, nomorUnik } = body;

    if (!kegiatanId || !nomorUnik) {
      return NextResponse.json({ error: "Kegiatan ID dan Nomor Unik diperlukan" }, { status: 400 });
    }

    // Periksa apakah kegiatan ada
    const kegiatanExists = await db.query.kegiatan.findFirst({
      where: eq(kegiatan.id, kegiatanId),
    });
    if (!kegiatanExists) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    // Cari generus berdasarkan nomor unik
    const resolvedGenerus = await db.query.generus.findFirst({
      where: eq(generus.nomorUnik, nomorUnik),
    });

    if (!resolvedGenerus) {
      return NextResponse.json(
        { error: "Generus dengan Nomor Unik tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    const resolvedGenerusId = resolvedGenerus.id;

    // Cek apakah sudah absen
    const existing = await db.query.absensi.findFirst({
      where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, resolvedGenerusId)),
    });

    if (existing) {
      return NextResponse.json({ error: "Anda sudah tercatat hadir!", existing }, { status: 409 });
    }

    // Catat kehadiran
    const id = uuidv4();
    await db.insert(absensi).values({
      id,
      kegiatanId,
      generusId: resolvedGenerusId,
      keterangan: "hadir",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, generusNama: resolvedGenerus.nama });
  } catch (error) {
    console.error("Public Absensi POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}
