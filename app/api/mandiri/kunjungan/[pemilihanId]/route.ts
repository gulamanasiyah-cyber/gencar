
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKunjungan, mandiriPemilihan } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "admin_romantic_room"];

// PATCH — edit hasil pemilih & terpilih
export async function PATCH(
  request: NextRequest,
  { params }: { params: { pemilihanId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasilPengirim, hasilPenerima, roomId } = await request.json();

    const valid = ["Lanjut", "Ragu-ragu", "Tidak Lanjut"];
    if (!valid.includes(hasilPengirim) || !valid.includes(hasilPenerima)) {
      return NextResponse.json({ error: "Nilai hasil tidak valid" }, { status: 400 });
    }

    await db.update(mandiriPemilihan)
      .set({ hasilPengirim, hasilPenerima })
      .where(eq(mandiriPemilihan.id, params.pemilihanId));

    // Clean up matched participants if both chose 'Lanjut'
    try {
      const { handleMatchCleanup } = await import("@/lib/matchCleanup");
      await handleMatchCleanup(params.pemilihanId);
    } catch (cleanupErr) {
      console.error("Failed to run match cleanup in kunjungan:", cleanupErr);
    }

    if (roomId) {
      await db.update(mandiriKunjungan)
        .set({ roomId })
        .where(eq(mandiriKunjungan.pemilihanId, params.pemilihanId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH kunjungan error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

// DELETE — hapus permanen: kunjungan + pemilihan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { pemilihanId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hapus semua kunjungan terkait pemilihan ini
    await db.delete(mandiriKunjungan)
      .where(eq(mandiriKunjungan.pemilihanId, params.pemilihanId));

    // Hapus pemilihan itu sendiri
    await db.delete(mandiriPemilihan)
      .where(eq(mandiriPemilihan.id, params.pemilihanId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE kunjungan error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
