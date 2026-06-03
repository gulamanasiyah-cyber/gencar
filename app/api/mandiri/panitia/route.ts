
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formPanitiaDanPengurus, mandiriDesa, mandiriKelompok, generus, mandiriAbsensi, mandiriKegiatan } from "@/lib/schema";
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
    const limit = Number(searchParams.get("limit") || "200"); // Use larger limit for now as panitia list is usually small
    const offset = (page - 1) * limit;

    // 1. Get the latest activity
    const latestActivity = await db.select({ id: mandiriKegiatan.id }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    const kegiatanId = latestActivity[0]?.id || "";

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataQuery = db
      .select({
        id: formPanitiaDanPengurus.id,
        nama: formPanitiaDanPengurus.nama,
        nomorUnik: formPanitiaDanPengurus.nomorUnik,
        jenisKelamin: formPanitiaDanPengurus.jenisKelamin,
        dapukan: formPanitiaDanPengurus.dapukan,
        noTelp: formPanitiaDanPengurus.noTelp,
        foto: formPanitiaDanPengurus.foto,
        createdAt: formPanitiaDanPengurus.createdAt,
        desaKota: sql<string>`COALESCE(${mandiriDesa.kota}, 'N/A')`,
        desaNama: sql<string>`COALESCE(${mandiriDesa.nama}, 'N/A')`,
        isHadir: sql<number>`CASE WHEN ${mandiriAbsensi.id} IS NOT NULL THEN 1 ELSE 0 END`,
        waktuHadir: mandiriAbsensi.timestamp,
      })
      .from(formPanitiaDanPengurus)
      .leftJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
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
    const { id, dapukan } = body;

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    await db.update(formPanitiaDanPengurus)
      .set({ dapukan, updatedAt: sql`(datetime('now'))` })
      .where(eq(formPanitiaDanPengurus.id, id));

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
