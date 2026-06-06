import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saranMasukan } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untuk, saran, nama, isAnonim } = body;

    if (!untuk || !untuk.trim()) {
      return NextResponse.json({ error: "Kolom 'untuk siapa' wajib diisi." }, { status: 400 });
    }

    if (!saran || !saran.trim()) {
      return NextResponse.json({ error: "Kolom 'saran/masukan' wajib diisi." }, { status: 400 });
    }

    const senderName = isAnonim ? "Anonim" : (nama?.trim() || "Anonim");

    await db.insert(saranMasukan).values({
      id: uuidv4(),
      untuk: untuk.trim(),
      saran: saran.trim(),
      nama: senderName,
      isAnonim: isAnonim ? 1 : 0,
    });

    return NextResponse.json({ success: true, message: "Saran/masukan berhasil dikirim!" });
  } catch (error: any) {
    console.error("Error saving saran/masukan:", error);
    return NextResponse.json(
      { error: "Gagal mengirim saran/masukan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
