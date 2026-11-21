import { NextRequest, NextResponse } from "next/server";

// Multi login: semua perangkat peserta berbagi satu token sesi, jadi keluar dari satu perangkat
// hanya menghapus data login di perangkat itu (dilakukan klien) dan TIDAK mencabut token di server;
// jika dicabut, perangkat lain milik peserta yang sama ikut terlempar.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.nomorUnik) {
      return NextResponse.json({ error: "Nomor unik diperlukan" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
