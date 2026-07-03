
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKelompok, mandiriDesa, mandiriDaerah, mandiriKegiatanDaerah, settings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    // scope=all bypasses the active-kegiatan filter, used by the wilayah registration
    // page where all kelompok should be selectable regardless of activation status
    if (scope === "all") {
      const allData = await db
        .select({
          id: mandiriKelompok.id,
          nama: mandiriKelompok.nama,
          mandiriDesaId: mandiriKelompok.mandiriDesaId,
        })
        .from(mandiriKelompok)
        .orderBy(mandiriKelompok.nama);
      return NextResponse.json(allData);
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const activeKegiatanId = activeSetting[0]?.value;

    if (!activeKegiatanId) {
      return NextResponse.json([]);
    }

    // Only include kelompok whose desa belongs to a daerah marked active for the currently active kegiatan
    const data = await db
      .select({
        id: mandiriKelompok.id,
        nama: mandiriKelompok.nama,
        mandiriDesaId: mandiriKelompok.mandiriDesaId,
      })
      .from(mandiriKelompok)
      .innerJoin(mandiriDesa, eq(mandiriKelompok.mandiriDesaId, mandiriDesa.id))
      .innerJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .innerJoin(mandiriKegiatanDaerah, and(
        eq(mandiriKegiatanDaerah.daerahId, mandiriDaerah.id),
        eq(mandiriKegiatanDaerah.kegiatanId, activeKegiatanId),
        eq(mandiriKegiatanDaerah.isActive, 1)
      ))
      .orderBy(mandiriKelompok.nama);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
