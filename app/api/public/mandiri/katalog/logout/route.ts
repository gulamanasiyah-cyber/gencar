export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, generus } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomorUnik } = body;

    if (!nomorUnik) {
      return NextResponse.json({ error: "Nomor unik diperlukan" }, { status: 400 });
    }

    // 1. Get the latest activity
    const latestActivity = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    if (latestActivity.length === 0) {
      return NextResponse.json({ error: "Tidak ada kegiatan aktif" }, { status: 400 });
    }
    const kegiatanId = latestActivity[0].id;

    // 2. Find the generus by nomorUnik
    const u = await db.select({ id: generus.id })
      .from(generus)
      .where(eq(generus.nomorUnik, nomorUnik))
      .limit(1);

    if (u.length === 0) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }
    const generusId = u[0].id;

    // 3. Check if there is an attendance record
    const attendance = await db.select()
      .from(mandiriAbsensi)
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ))
      .limit(1);

    if (attendance.length === 0) {
      return NextResponse.json({ error: "Absensi tidak ditemukan" }, { status: 404 });
    }

    // 4. Update the mandiri_absensi keterangan to "pulang"
    await db.update(mandiriAbsensi)
      .set({ keterangan: "pulang" })
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
