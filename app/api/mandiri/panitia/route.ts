
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formPanitiaDanPengurus, mandiriDesa, mandiriAbsensi, mandiriKegiatan, settings, mandiriDaerah, mandiriKelompok, generus } from "@/lib/schema";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "200");
    const offset = (page - 1) * limit;

    // Gunakan kegiatanId dari query param jika ada, lalu dari settings, lalu fallback ke terbaru
    let kegiatanId = searchParams.get("kegiatanId") || "";

    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(formPanitiaDanPengurus.nama, `%${search}%`),
          like(formPanitiaDanPengurus.nomorUnik, `%${search}%`),
          like(formPanitiaDanPengurus.dapukan, `%${search}%`)
        )
      );
    }

    if (kegiatanId) {
      conditions.push(eq(formPanitiaDanPengurus.kegiatanId, kegiatanId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataQuery = db
      .select({
        id: formPanitiaDanPengurus.id,
        generusId: formPanitiaDanPengurus.generusId,
        nama: formPanitiaDanPengurus.nama,
        nomorUnik: formPanitiaDanPengurus.nomorUnik,
        jenisKelamin: formPanitiaDanPengurus.jenisKelamin,
        dapukan: formPanitiaDanPengurus.dapukan,
        noTelp: formPanitiaDanPengurus.noTelp,
        tanggalLahir: formPanitiaDanPengurus.tanggalLahir,
        pekerjaan: generus.pekerjaan,
        tempatLahir: generus.tempatLahir,
        alamat: generus.alamat,
        pendidikan: generus.pendidikan,
        suku: generus.suku,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        instagram: generus.instagram,
        kriteriaPasangan: generus.kriteriaPasangan,
        foto: formPanitiaDanPengurus.foto,
        mandiriDaerahId: mandiriDaerah.id,
        mandiriDesaId: formPanitiaDanPengurus.mandiriDesaId,
        mandiriKelompokId: formPanitiaDanPengurus.mandiriKelompokId,
        createdAt: formPanitiaDanPengurus.createdAt,
        desaKota: sql<string>`COALESCE(${mandiriDaerah.nama}, 'N/A')`,
        desaNama: sql<string>`COALESCE(${mandiriDesa.nama}, 'N/A')`,
        kelompokNama: sql<string>`COALESCE(${mandiriKelompok.nama}, 'N/A')`,
        isHadir: sql<number>`CASE WHEN ${mandiriAbsensi.id} IS NOT NULL THEN 1 ELSE 0 END`,
        waktuHadir: mandiriAbsensi.timestamp,
      })
      .from(formPanitiaDanPengurus)
      .leftJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(mandiriKelompok, eq(formPanitiaDanPengurus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(generus, eq(formPanitiaDanPengurus.generusId, generus.id))
      .leftJoin(mandiriAbsensi, and(
        eq(formPanitiaDanPengurus.generusId, mandiriAbsensi.generusId),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(formPanitiaDanPengurus.createdAt));

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(formPanitiaDanPengurus)
      .where(whereClause);

    const data = await dataQuery;

    return NextResponse.json({
      data,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    });
  } catch (error) {
    console.error("Panitia GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { 
        id, generusId, nama, jenisKelamin, noTelp, tanggalLahir, pekerjaan, 
        mandiriDesaId, mandiriKelompokId, dapukan, foto,
        tempatLahir, alamat, pendidikan, suku, hobi, makananMinumanFavorit, instagram, kriteriaPasangan
    } = body;

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const updateAdminFields: any = { 
        nama, jenisKelamin, noTelp, tanggalLahir, dapukan, foto,
        tempatLahir, alamat, suku,
        mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
        mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
        updatedAt: sql`(datetime('now'))` 
    };

    // Update in formPanitiaDanPengurus
    await db.update(formPanitiaDanPengurus)
      .set(updateAdminFields)
      .where(eq(formPanitiaDanPengurus.id, id));

    // Update in generus if they exist
    if (generusId) {
        await db.update(generus)
            .set({ 
                nama, jenisKelamin, noTelp, tanggalLahir, pekerjaan, foto,
                tempatLahir, alamat, pendidikan, suku, hobi, makananMinumanFavorit, instagram, kriteriaPasangan,
                mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
                mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
                updatedAt: sql`(datetime('now'))`
            })
            .where(eq(generus.id, generusId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Panitia PUT error:", error);
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    await db.delete(formPanitiaDanPengurus).where(eq(formPanitiaDanPengurus.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Panitia DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
