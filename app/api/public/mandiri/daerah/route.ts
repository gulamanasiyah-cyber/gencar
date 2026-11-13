export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDaerah, mandiriKegiatanDaerah } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cachedWilayah, getActiveMandiriKegiatanId } from "@/lib/cached-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "all") {
      const data = await cachedWilayah("daerah:all", () =>
        db.select().from(mandiriDaerah).orderBy(mandiriDaerah.nama)
      );
      return NextResponse.json(data);
    }

    const activeKegiatanId = await getActiveMandiriKegiatanId();

    if (!activeKegiatanId) {
      return NextResponse.json([]);
    }

    const data = await cachedWilayah(`daerah:kegiatan:${activeKegiatanId}`, () =>
      db
        .select({
          id: mandiriDaerah.id,
          nama: mandiriDaerah.nama,
        })
        .from(mandiriDaerah)
        .innerJoin(
          mandiriKegiatanDaerah,
          and(
            eq(mandiriKegiatanDaerah.daerahId, mandiriDaerah.id),
            eq(mandiriKegiatanDaerah.kegiatanId, activeKegiatanId)
          )
        )
        .orderBy(mandiriDaerah.nama)
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data daerah" }, { status: 500 });
  }
}
