export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKelompok } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getAllKelompokWithDesa, invalidateWilayahCache } from "@/lib/cached-queries";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await getAllKelompokWithDesa();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { nama, mandiriDesaId } = await request.json();
    if (!nama || !mandiriDesaId) return NextResponse.json({ error: "Nama dan Desa wajib diisi" }, { status: 400 });
    await db.insert(mandiriKelompok).values({ nama, mandiriDesaId: Number(mandiriDesaId) });
    invalidateWilayahCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, nama, mandiriDesaId } = await request.json();
    if (!id || !nama || !mandiriDesaId) return NextResponse.json({ error: "ID, nama, dan Desa wajib diisi" }, { status: 400 });
    await db.update(mandiriKelompok).set({ nama, mandiriDesaId: Number(mandiriDesaId) }).where(eq(mandiriKelompok.id, Number(id)));
    invalidateWilayahCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    
    await db.delete(mandiriKelompok).where(eq(mandiriKelompok.id, Number(id)));
    invalidateWilayahCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
