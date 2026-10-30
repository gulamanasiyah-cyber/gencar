
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiriDesa, mandiri, mandiriKelompok, mandiriDaerah, formPanitiaDanPengurus, settings } from "@/lib/schema";
import { sql, eq, isNotNull, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let kegiatanId = searchParams.get("kegiatanId") || "";
    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (!kegiatanId) {
      return NextResponse.json({ pendidikan: [], daerahs: [], desas: [], kelompoks: [] });
    }

    // Filter choices must come from the selected activity roster. Committee
    // locations are activity-specific, so prefer the committee form values.
    const pendidikanResult = await db
      .select({ value: generus.pendidikan })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(and(eq(mandiri.kegiatanId, kegiatanId), isNotNull(generus.pendidikan)))
      .groupBy(generus.pendidikan);
    
    const pendidikan: string[] = pendidikanResult
      .map((r: { value: string | null }) => {
        if (!r.value) return "";
        // Extract level (jenjang)
        // 1. Trim and uppercase
        let val = r.value.trim().toUpperCase();
        
        // 2. Handle common patterns like S1, D3, etc. at the start
        // Try to capture patterns like S1, D3, SMA, SMK, etc.
        const jenjangMatch = val.match(/^(S\s*[1-3]|D\s*[1-4]|SMA|SMK|SMP|SD|MI|MTS|MA|TK|PAUD)/i);
        
        if (jenjangMatch) {
          // Normalize: remove spaces or dots between S/D and number
          return jenjangMatch[0].replace(/[\s\.]/g, '');
        }
        
        // 3. Fallback: Take first word before space, dash, or paren
        const parts = val.split(/[\s\-\(\),]+/);
        return parts[0];
      })
      .filter((v: string) => v !== "")
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) // unique
      .sort((a: string, b: string) => {
        // Logical sort order for Indonesian education
        const order = ["PAUD", "TK", "SD", "MI", "SMP", "MTS", "SMA", "MA", "SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    const panitiaDesa = alias(mandiriDesa, "filter_panitia_desa");
    const pesertaDesa = alias(mandiriDesa, "filter_peserta_desa");
    const panitiaDaerah = alias(mandiriDaerah, "filter_panitia_daerah");
    const pesertaDaerah = alias(mandiriDaerah, "filter_peserta_daerah");
    const panitiaKelompok = alias(mandiriKelompok, "filter_panitia_kelompok");
    const pesertaKelompok = alias(mandiriKelompok, "filter_peserta_kelompok");

    type RosterLocation = {
      daerahId: number | null;
      daerahNama: string | null;
      desaId: number | null;
      desaNama: string | null;
      kelompokId: number | null;
      kelompokNama: string | null;
      kelompokDesaId: number | null;
    };
    const rosterLocations: RosterLocation[] = await db
      .selectDistinct({
        daerahId: sql<number | null>`COALESCE(${panitiaDaerah.id}, ${pesertaDaerah.id})`,
        daerahNama: sql<string | null>`COALESCE(${panitiaDaerah.nama}, ${pesertaDaerah.nama})`,
        desaId: sql<number | null>`COALESCE(${panitiaDesa.id}, ${pesertaDesa.id})`,
        desaNama: sql<string | null>`COALESCE(${panitiaDesa.nama}, ${pesertaDesa.nama})`,
        kelompokId: sql<number | null>`COALESCE(${panitiaKelompok.id}, ${pesertaKelompok.id})`,
        kelompokNama: sql<string | null>`COALESCE(${panitiaKelompok.nama}, ${pesertaKelompok.nama})`,
        kelompokDesaId: sql<number | null>`COALESCE(${panitiaKelompok.mandiriDesaId}, ${pesertaKelompok.mandiriDesaId})`,
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .leftJoin(formPanitiaDanPengurus, and(
        eq(formPanitiaDanPengurus.generusId, generus.id),
        eq(formPanitiaDanPengurus.kegiatanId, kegiatanId)
      ))
      .leftJoin(panitiaDesa, eq(formPanitiaDanPengurus.mandiriDesaId, panitiaDesa.id))
      .leftJoin(pesertaDesa, eq(generus.mandiriDesaId, pesertaDesa.id))
      .leftJoin(panitiaDaerah, eq(panitiaDesa.mandiriDaerahId, panitiaDaerah.id))
      .leftJoin(pesertaDaerah, eq(pesertaDesa.mandiriDaerahId, pesertaDaerah.id))
      .leftJoin(panitiaKelompok, eq(formPanitiaDanPengurus.mandiriKelompokId, panitiaKelompok.id))
      .leftJoin(pesertaKelompok, eq(generus.mandiriKelompokId, pesertaKelompok.id))
      .where(eq(mandiri.kegiatanId, kegiatanId));

    const daerahById = new Map<number, { id: number; nama: string }>();
    const desaById = new Map<number, { id: number; nama: string; daerahId: number | null }>();
    const kelompokById = new Map<number, { id: number; nama: string; desaId: number | null }>();
    for (const row of rosterLocations) {
      if (row.daerahId != null && row.daerahNama) daerahById.set(row.daerahId, { id: row.daerahId, nama: row.daerahNama });
      if (row.desaId != null && row.desaNama) desaById.set(row.desaId, { id: row.desaId, nama: row.desaNama, daerahId: row.daerahId });
      if (row.kelompokId != null && row.kelompokNama) kelompokById.set(row.kelompokId, { id: row.kelompokId, nama: row.kelompokNama, desaId: row.kelompokDesaId });
    }
    const sortByNama = <T extends { nama: string }>(items: T[]) => items.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    const daerahResult = sortByNama(Array.from(daerahById.values()));
    const desaResult = sortByNama(Array.from(desaById.values()));
    const kelompokResult = sortByNama(Array.from(kelompokById.values()));

    return NextResponse.json({
      pendidikan,
      daerahs: daerahResult,
      desas: desaResult,
      kelompoks: kelompokResult,
    });
  } catch (error) {
    console.error("Filters GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
