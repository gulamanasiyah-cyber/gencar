
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriDesa, desa } from "@/lib/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch unique pendidikan from registered participants (data pendaftar)
    const pendidikanResult = await db
      .select({ value: generus.pendidikan })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(isNotNull(generus.pendidikan))
      .groupBy(generus.pendidikan);
    
    const pendidikan = pendidikanResult
      .map(r => {
        if (!r.value) return "";
        let val = r.value.trim().toUpperCase();
        
        // Match common patterns like S1, D3, SMA, etc.
        const jenjangMatch = val.match(/^(S\s*[1-3]|D\s*[1-4]|SMA|SMK|SMP|SD|MI|MTS|MA|TK|PAUD)/i);
        
        if (jenjangMatch) {
          return jenjangMatch[0].replace(/[\s\.]/g, '');
        }
        
        const parts = val.split(/[\s\-\(\),]+/);
        return parts[0];
      })
      .filter(v => v !== "")
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort((a, b) => {
        const order = ["PAUD", "TK", "SD", "MI", "SMP", "MTS", "SMA", "MA", "SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    // Fetch unique kota from mandiriDesa
    const kotaResult = await db
      .select({ 
        kota: mandiriDesa.kota 
      })
      .from(mandiriDesa)
      .innerJoin(generus, eq(generus.mandiriDesaId, mandiriDesa.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .groupBy(mandiriDesa.kota)
      .orderBy(mandiriDesa.kota);

    const kota = kotaResult.map(r => r.kota).filter(Boolean);

    // Fetch unique mandiriDesa (Wilayah/Desa Mandiri) from registered participants
    const wilayahResult = await db
      .select({ 
        id: mandiriDesa.id, 
        nama: mandiriDesa.nama,
        kota: mandiriDesa.kota
      })
      .from(mandiriDesa)
      .innerJoin(generus, eq(generus.mandiriDesaId, mandiriDesa.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .groupBy(mandiriDesa.id, mandiriDesa.nama, mandiriDesa.kota)
      .orderBy(mandiriDesa.nama);

    return NextResponse.json({
      pendidikan,
      kota,
      wilayah: wilayahResult,
    });
  } catch (error) {
    console.error("Public Filters GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
