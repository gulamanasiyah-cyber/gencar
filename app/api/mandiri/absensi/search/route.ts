export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriDesa, idCardBuilderData, formPanitiaDanPengurus, settings, mandiriDaerah } from "@/lib/schema";
import { eq, or, like, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Search specifically for generus who are in the mandiri list for the specified kegiatan
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    let kegiatanId = searchParams.get("kegiatanId") || "";

    if (!q) return NextResponse.json([]);

    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (!kegiatanId) return NextResponse.json([]);

    const dataGenerus = await db
      .select({
        id: generus.id,
        nama: generus.nama,
        nomorUnik: generus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: sql<string>`COALESCE(CAST(${mandiri.nomorUrut} AS TEXT), ${idCardBuilderData.dapukan})`,
      })
      .from(generus)
      .leftJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)))
      .leftJoin(idCardBuilderData, and(eq(generus.nomorUnik, idCardBuilderData.nomorUnik), eq(idCardBuilderData.kegiatanId, kegiatanId)))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          or(
            like(generus.nama, `%${q}%`),
            like(generus.nomorUnik, `%${q}%`)
          ),
          or(
            sql`${mandiri.id} IS NOT NULL`,
            sql`${idCardBuilderData.id} IS NOT NULL`
          )
        )
      )
      .limit(10);

    // Also search specifically in form_panitia_dan_pengurus for those not yet in generus or those with different info
    const dataPanitia = await db
      .select({
        id: sql<string>`COALESCE(${formPanitiaDanPengurus.generusId}, ${formPanitiaDanPengurus.id})`,
        nama: formPanitiaDanPengurus.nama,
        nomorUnik: formPanitiaDanPengurus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: formPanitiaDanPengurus.dapukan,
      })
      .from(formPanitiaDanPengurus)
      .leftJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          eq(formPanitiaDanPengurus.kegiatanId, kegiatanId),
          or(
            like(formPanitiaDanPengurus.nama, `%${q}%`),
            like(formPanitiaDanPengurus.nomorUnik, `%${q}%`),
            like(formPanitiaDanPengurus.noTelp, `%${q}%`)
          )
        )
      )
      .limit(10);

    // Combine and deduplicate by nama + nomorUnik
    const combined = [...dataGenerus, ...dataPanitia];
    const seen = new Set();
    const data = combined.filter(item => {
      const key = `${item.nama}-${item.nomorUnik}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mandiri Search generus error:", error);
    return NextResponse.json({ error: "Gagal mencari data" }, { status: 500 });
  }
}
