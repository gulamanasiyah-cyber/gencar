export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDesa, mandiriDaerah, mandiriKegiatanDaerah } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cachedWilayah, getActiveMandiriKegiatanId, getAllDesaWithDaerah } from "@/lib/cached-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    const activeKegiatanId = await getActiveMandiriKegiatanId();

    if (!activeKegiatanId) {
      return NextResponse.json([]);
    }

    // scope=all bypasses the isActive filter, used by the wilayah registration
    // page where regions should be selectable regardless of verification status
    // BUT still strictly isolated to the active kegiatan
    if (scope === "all") {
      const allData = await getAllDesaWithDaerah();
      return NextResponse.json(allData);
    }

    // Only include desa whose daerah is marked active for the currently active kegiatan
    // (mirrors the toggle on the Kelola Daerah/Desa page)
    const data = await cachedWilayah(`desa:active:${activeKegiatanId}`, () =>
      db
        .select({
          id: mandiriDesa.id,
          nama: mandiriDesa.nama,
          mandiriDaerahId: mandiriDesa.mandiriDaerahId,
          kota: mandiriDaerah.nama,
          daerahNama: mandiriDaerah.nama,
        })
        .from(mandiriDesa)
        .innerJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
        .innerJoin(mandiriKegiatanDaerah, and(
          eq(mandiriKegiatanDaerah.daerahId, mandiriDaerah.id),
          eq(mandiriKegiatanDaerah.kegiatanId, activeKegiatanId),
          eq(mandiriKegiatanDaerah.isActive, 1)
        ))
        .orderBy(mandiriDesa.nama)
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

