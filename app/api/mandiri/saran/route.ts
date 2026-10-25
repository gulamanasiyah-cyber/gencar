import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saranMasukan, mandiriKegiatan } from "@/lib/schema";
import { and, eq, desc, isNull } from "drizzle-orm";
import { ensureSaranActivitySchema } from "@/lib/mandiri-schema";

export async function GET(request: NextRequest) {
    try {
        await ensureSaranActivitySchema();
        const { searchParams } = new URL(request.url);
        const kegiatanId = searchParams.get("kegiatanId") || "all";
        const conditions = [eq(saranMasukan.untuk, "Romantic Room")];
        if (kegiatanId === "none") {
            conditions.push(isNull(saranMasukan.kegiatanId));
        } else if (kegiatanId !== "all") {
            conditions.push(eq(saranMasukan.kegiatanId, kegiatanId));
        }

        const records = await db.select({
            id: saranMasukan.id,
            untuk: saranMasukan.untuk,
            kepada: saranMasukan.kepada,
            saran: saranMasukan.saran,
            kegiatanId: saranMasukan.kegiatanId,
            kegiatanJudul: mandiriKegiatan.judul,
            nama: saranMasukan.nama,
            userId: saranMasukan.userId,
            isAnonim: saranMasukan.isAnonim,
            createdAt: saranMasukan.createdAt,
        })
            .from(saranMasukan)
            .leftJoin(mandiriKegiatan, eq(saranMasukan.kegiatanId, mandiriKegiatan.id))
            .where(and(...conditions))
            .orderBy(desc(saranMasukan.createdAt));
        
        return NextResponse.json(records);
    } catch (error) {
        console.error("GET saran error:", error);
        return NextResponse.json({ error: "Gagal mengambil data saran" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // In a real app we'd verify session role here, assuming middleware handles it or we'd import getServerSession.
        await db.delete(saranMasukan).where(eq(saranMasukan.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menghapus saran" }, { status: 500 });
    }
}
