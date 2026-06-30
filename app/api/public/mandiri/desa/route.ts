export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDesa, mandiriDaerah } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db
      .select({
        id: mandiriDesa.id,
        nama: mandiriDesa.nama,
        mandiriDaerahId: mandiriDesa.mandiriDaerahId,
        kota: mandiriDaerah.nama,
        daerahNama: mandiriDaerah.nama,
      })
      .from(mandiriDesa)
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .orderBy(mandiriDesa.nama);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

