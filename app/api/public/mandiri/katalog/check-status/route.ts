
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, generus, mandiri, mandiriDesa, formPanitiaDanPengurus, settings } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nomorUnik = searchParams.get("nomorUnik");
    const nomorPeserta = searchParams.get("nomorPeserta");
    const sessionToken = searchParams.get("sessionToken");
    const deviceId = searchParams.get("deviceId");

    if (!nomorUnik && !nomorPeserta) {
      return NextResponse.json({ error: "Nomor identitas diperlukan" }, { status: 400 });
    }

    // 1. Get the active kegiatan from settings
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    let kegiatanId = activeSetting[0]?.value || "";
    let activeKegiatan = null;

    if (kegiatanId) {
      const result = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
      if (result.length > 0) {
        activeKegiatan = result[0];
      }
    }

    if (!activeKegiatan) {
      // Get the latest activity fallback
      const fallbackActivity = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
      if (fallbackActivity.length === 0) {
        return NextResponse.json({ status: "no_activity" });
      }
      activeKegiatan = fallbackActivity[0];
      kegiatanId = activeKegiatan.id;
    }

    const latestActivity = [activeKegiatan];

    // 2. Find the generus by nomorPeserta OR nomorUnik
    let generusId = null;

    if (nomorPeserta) {
        // Search in mandiri table for the latest sequence number
        const m = await db.select({ generusId: mandiri.generusId })
            .from(mandiri)
            .where(eq(mandiri.nomorUrut, Number(nomorPeserta)))
            .orderBy(desc(mandiri.createdAt))
            .limit(1);
        if (m.length > 0) generusId = m[0].generusId;
    } else if (nomorUnik) {
        const u = await db.select({ id: generus.id })
            .from(generus)
            .where(eq(generus.nomorUnik, nomorUnik))
            .limit(1);
        if (u.length > 0) generusId = u[0].id;
    }

    if (!generusId) {
      return NextResponse.json({ status: "not_found" });
    }

    // 3. Check if attended the latest activity
    const attendance = await db.select()
      .from(mandiriAbsensi)
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ))
      .limit(1);

    if (attendance.length > 0) {
      // If currently "pulang" (went home/logged out), reset to "hadir" since they are entering/logging in again
      if (attendance[0].keterangan === "pulang") {
        await db.update(mandiriAbsensi)
          .set({ keterangan: "hadir", timestamp: new Date().toISOString() })
          .where(and(
            eq(mandiriAbsensi.kegiatanId, kegiatanId),
            eq(mandiriAbsensi.generusId, generusId)
          ));
      }

      // Find the user's name and last session token
      const user = await db.select({ 
          id: generus.id,
          nama: generus.nama,
          nomorUrut: mandiri.nomorUrut,
          nomorUnik: generus.nomorUnik,
          lastSessionToken: mandiri.lastSessionToken,
          deviceId: mandiri.deviceId,
          mandiriDesaNama: mandiriDesa.nama,
          mandiriDesaKota: mandiriDesa.kota,
          jenisKelamin: generus.jenisKelamin,
          role: formPanitiaDanPengurus.dapukan
      })
      .from(generus)
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId))
      .where(eq(generus.id, generusId))
      .limit(1);

      // Verify session token if provided (passive check for existing sessions)
      // This is what prevents multiple simultaneous sessions
      const isAdminRole = user[0]?.role === "Admin Romantic Room" || user[0]?.role === "admin_romantic_room";
      
      if (!isAdminRole && sessionToken && user[0]?.lastSessionToken && sessionToken !== user[0].lastSessionToken) {
          return NextResponse.json({ status: "multi_login" });
      }

      // If logging in via nomorPeserta or nomorUnik explicitly (without sessionToken)
      if (nomorPeserta || !sessionToken) {
        // Generate new token to invalidate other sessions (except for admins)
        const finalSessionToken = isAdminRole && user[0]?.lastSessionToken ? user[0].lastSessionToken : uuidv4();
        
        // Update both deviceId and lastSessionToken
        // For admins, we keep the lastSessionToken if it exists to allow multiple sessions sharing the same token
        await db.update(mandiri)
            .set({ 
              deviceId: deviceId || user[0]?.deviceId, 
              lastSessionToken: finalSessionToken 
            })
            .where(eq(mandiri.generusId, generusId));

        return NextResponse.json({ 
          status: "attended", 
          id: user[0]?.id,
          kegiatanId,
          kegiatanJudul: latestActivity[0].judul,
          nama: user[0]?.nama || "Peserta",
          nomorUrut: user[0]?.nomorUrut || "-",
          nomorUnik: user[0]?.nomorUnik || nomorUnik,
          mandiriDesaNama: user[0]?.mandiriDesaNama,
          mandiriDesaKota: user[0]?.mandiriDesaKota,
          jenisKelamin: user[0]?.jenisKelamin,
          role: user[0]?.role || "Peserta",
          sessionToken: finalSessionToken
        });
      }

      // If it's a passive check (sessionToken provided), we already verified it above.
      // If it's just a nomorUnik check without a token, return the current state
      // (This part might be used for initial loading)
      return NextResponse.json({ 
        status: "attended", 
        id: user[0]?.id,
        kegiatanId,
        kegiatanJudul: latestActivity[0].judul,
        nama: user[0]?.nama || "Peserta",
        nomorUrut: user[0]?.nomorUrut || "-",
        nomorUnik: user[0]?.nomorUnik || nomorUnik,
        mandiriDesaNama: user[0]?.mandiriDesaNama,
        mandiriDesaKota: user[0]?.mandiriDesaKota,
        jenisKelamin: user[0]?.jenisKelamin,
        role: user[0]?.role || "Peserta",
        sessionToken: sessionToken || user[0]?.lastSessionToken
      });
    }

    return NextResponse.json({ status: "waiting", kegiatanId });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
