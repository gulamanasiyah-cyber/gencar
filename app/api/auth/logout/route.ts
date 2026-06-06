import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getSession();
    if (session && session.generusId) {
      const generusId = session.generusId;
      const latestActivity = await db.select({ id: mandiriKegiatan.id })
        .from(mandiriKegiatan)
        .orderBy(desc(mandiriKegiatan.tanggal))
        .limit(1);
      
      if (latestActivity.length > 0) {
        const kegiatanId = latestActivity[0].id;
        await db.update(mandiriAbsensi)
          .set({ keterangan: "pulang" })
          .where(and(
            eq(mandiriAbsensi.kegiatanId, kegiatanId),
            eq(mandiriAbsensi.generusId, generusId)
          ));
      }
    }
  } catch (error) {
    console.error("Failed to update status on session logout:", error);
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
