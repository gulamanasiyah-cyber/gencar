export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getSettingsObject, getMandiriKegiatanList, invalidateSettingsCache } from "@/lib/cached-queries";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  console.log(`[API_SETTINGS] GET from IP: ${ip}, UA: ${userAgent}`);
  try {
    // Settings & daftar kegiatan dibaca dari cache memori (lib/cached-queries.ts):
    // endpoint ini dipanggil hampir di setiap halaman, jadi tidak perlu
    // round-trip ke database setiap kali.
    const [settingsObj, kegiatanList] = await Promise.all([
      getSettingsObject(),
      getMandiriKegiatanList(),
    ]);

    // Priority for Mandiri if Activity exists, otherwise latest kegiatan
    const activeKegiatanId = settingsObj["mandiri_active_kegiatan_id"];
    const activeKegiatan =
      (activeKegiatanId ? kegiatanList.find((k) => k.id === activeKegiatanId) : undefined) ||
      kegiatanList[0] ||
      null;

    if (activeKegiatan) {
      if (activeKegiatan.judul) {
        settingsObj["mandiri_registration_title"] = activeKegiatan.judul;
      }
      if (activeKegiatan.deskripsi) {
        settingsObj["mandiri_registration_description"] = activeKegiatan.deskripsi;
      }
    }

    return NextResponse.json(settingsObj, {
      headers: { 
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        "X-Debug-Status": "success"
      },
    });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    // Log more details if it's a Drizzle error
    if (error.name === "DrizzleQueryError") {
      console.error("Failed Query:", error.query);
      console.error("Params:", error.params);
    }
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan", details: error.message }, 
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "Key wajib diisi" }, { status: 400 });

    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });

    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
    invalidateSettingsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
