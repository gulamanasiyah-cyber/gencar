export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kegiatan } from "@/lib/schema";
import { desc } from "drizzle-orm";
import {
  getSettingRows,
  getActiveMandiriKegiatanId,
  getMandiriKegiatanById,
  getLatestMandiriKegiatan,
} from "@/lib/cached-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "mandiri_registration_deadline";

    // Priority for Mandiri Kegiatan (Automatic): kegiatan aktif, lalu kegiatan terbaru.
    // Semua dibaca dari cache memori (lib/cached-queries.ts).
    const mandiriKegiatanField: Record<string, "judul" | "lokasi" | "deskripsi"> = {
      mandiri_registration_title: "judul",
      mandiri_registration_location: "lokasi",
      mandiri_registration_description: "deskripsi",
    };
    const field = mandiriKegiatanField[key];
    if (field) {
      const kegiatanId = await getActiveMandiriKegiatanId();
      const active = kegiatanId ? await getMandiriKegiatanById(kegiatanId) : undefined;
      if (active?.[field]) return NextResponse.json({ key, value: active[field] });
      const latest = await getLatestMandiriKegiatan();
      if (latest?.[field]) return NextResponse.json({ key, value: latest[field] });
    }

    const data = await getSettingRows(key);

    // Fallbacks for Mandiri if no Kegiatan found
    if (key === "mandiri_registration_title" && !data[0]?.value) {
      return NextResponse.json({ key, value: "Peserta Mandiri" });
    }

    if (key === "mandiri_registration_description" && !data[0]?.value) {
      return NextResponse.json({ key, value: "" });
    }

    // Fallbacks for Generus
    if (key === "generus_registration_title" && !data[0]?.value) {
      const latest = await db.select({ value: kegiatan.judul }).from(kegiatan).orderBy(desc(kegiatan.tanggal)).limit(1);
      return NextResponse.json({ key, value: latest[0]?.value || "Daftar Peserta" });
    }

    if (key === "generus_registration_description" && !data[0]?.value) {
      const latest = await db.select({ value: kegiatan.deskripsi }).from(kegiatan).orderBy(desc(kegiatan.tanggal)).limit(1);
      return NextResponse.json({ key, value: latest[0]?.value || "" });
    }

    return NextResponse.json(data[0] || { key, value: "" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil settings" }, { status: 500 });
  }
}
