export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDaerah } from "@/lib/schema";

export async function GET() {
  try {
    const data = await db.select().from(mandiriDaerah).orderBy(mandiriDaerah.nama);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data daerah" }, { status: 500 });
  }
}
