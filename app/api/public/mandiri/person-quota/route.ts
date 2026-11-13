export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getMandiriPersonPerempuanQuotaStatus } from "@/lib/mandiriNomorUrut";
import { getSettingRows } from "@/lib/cached-queries";

export async function GET() {
  try {
    const activeSetting = await getSettingRows("mandiri_active_kegiatan_id");
    const kegiatanId = activeSetting[0]?.value || "";

    const quota = await getMandiriPersonPerempuanQuotaStatus(db, kegiatanId);

    return NextResponse.json({
      kegiatanId,
      ...quota,
    });
  } catch (error) {
    console.error("Person quota GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data kuota person" }, { status: 500 });
  }
}
