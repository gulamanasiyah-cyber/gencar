export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah, settings } from "@/lib/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "tim_pnkb_gambuh"];
    if (!allowedRoles.includes(session.role)) {
       return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const filterHaid = searchParams.get("haid"); // "Ya", "Tidak", or undefined/null for all

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const activeKegiatanId = activeSetting[0]?.value;

    const conditions = [
      eq(generus.jenisKelamin, "P")
    ];

    if (activeKegiatanId) {
      conditions.push(
        or(
          eq(mandiri.kegiatanId, activeKegiatanId),
          sql`${mandiri.kegiatanId} IS NULL`
        )!
      );
    }

    if (filterHaid === "Ya" || filterHaid === "Tidak") {
      conditions.push(eq(generus.statusHaid, filterHaid));
    }

    if (search) {
      conditions.push(
        or(
          like(generus.nama, `%${search}%`),
          like(generus.nomorUnik, `%${search}%`),
          like(generus.noTelp, `%${search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const list = await db
      .select({
        generusId: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        jenisKelamin: generus.jenisKelamin,
        tanggalLahir: generus.tanggalLahir,
        noTelp: generus.noTelp,
        foto: generus.foto,
        statusHaid: generus.statusHaid,
        pekerjaan: generus.pekerjaan,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDaerahNama: mandiriDaerah.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        nomorUrut: mandiri.nomorUrut,
        statusMandiri: mandiri.statusMandiri,
        statusPeserta: mandiri.statusPeserta,
      })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .where(whereClause)
      .orderBy(desc(generus.updatedAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error("Mandiri Haid GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data peserta haid" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "kmm_daerah", "tim_pnkb_gambuh"];
    if (!allowedRoles.includes(session.role)) {
       return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { generusId, statusHaid } = await request.json();

    if (!generusId || !["Ya", "Tidak"].includes(statusHaid)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    await db.update(generus)
      .set({
        statusHaid,
        updatedAt: new Date().toISOString()
      })
      .where(eq(generus.id, generusId));

    return NextResponse.json({ success: true, statusHaid });
  } catch (error) {
    console.error("Mandiri Haid PUT error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status haid" }, { status: 500 });
  }
}
