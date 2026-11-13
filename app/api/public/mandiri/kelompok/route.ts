
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKelompok, mandiriDesa, mandiriDaerah, mandiriKegiatanDaerah } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cachedWilayah, getActiveMandiriKegiatanId } from "@/lib/cached-queries";

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
      const allData = await cachedWilayah("kelompok:all", () =>
        db
          .select({
            id: mandiriKelompok.id,
            nama: mandiriKelompok.nama,
            mandiriDesaId: mandiriKelompok.mandiriDesaId,
          })
          .from(mandiriKelompok)
          .orderBy(mandiriKelompok.nama)
      );
      return NextResponse.json(allData);
    }

    // Only include kelompok whose desa belongs to a daerah marked active for the currently active kegiatan
    const data = await cachedWilayah(`kelompok:active:${activeKegiatanId}`, () =>
      db
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
        .orderBy(mandiriKelompok.nama)
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
