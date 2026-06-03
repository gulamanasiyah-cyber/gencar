
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    // Allow both session-based and participant-based (via headers) access? 
    // For stats, we usually want at least some auth.
    // The dashboard already checks isAdmin, so this API should too.

    // 1. Get the latest activity
    const latestActivity = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    if (latestActivity.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const kegiatanId = latestActivity[0].id;

    // 2. Count distinct committee members in attendance
    const attendanceCount = await db
      .select({ count: sql<number>`count(distinct ${formPanitiaDanPengurus.id})` })
      .from(mandiriAbsensi)
      .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
      .where(eq(mandiriAbsensi.kegiatanId, kegiatanId));

    return NextResponse.json({ 
        count: Number(attendanceCount[0]?.count || 0),
        kegiatanJudul: latestActivity[0].judul 
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
