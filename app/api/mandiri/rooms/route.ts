
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriRooms, mandiriPemilihan, generus, mandiri } from "@/lib/schema";
import { eq, and, or, count, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { alias } from "drizzle-orm/sqlite-core";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        let authorized = !!session;

        if (!session) {
            const headerUnik = request.headers.get("x-nomor-unik");
            const headerToken = request.headers.get("x-session-token");

            if (headerUnik && headerToken) {
                 const m = await db.select({ id: mandiri.id })
                    .from(mandiri)
                    .innerJoin(generus, eq(mandiri.generusId, generus.id))
                    .where(and(eq(generus.nomorUnik, headerUnik), eq(mandiri.lastSessionToken, headerToken)))
                    .limit(1);
                if (m.length > 0) authorized = true;
            }
        }

        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const g1 = alias(generus, "g1");
        const g2 = alias(generus, "g2");
        const m1 = alias(mandiri, "m1");
        const m2 = alias(mandiri, "m2");

        const rooms = await db.select({
            id: mandiriRooms.id,
            nama: mandiriRooms.nama,
            status: mandiriRooms.status,
            pemilihanId: mandiriRooms.pemilihanId,
            pengirimNama: g1.nama,
            pengirimNo: g1.nomorUnik,
            pengirimNomorUrut: m1.nomorUrut,
            penerimaNama: g2.nama,
            penerimaNo: g2.nomorUnik,
            penerimaNomorUrut: m2.nomorUrut,
            startedAt: mandiriRooms.startedAt,
            updatedAt: mandiriRooms.updatedAt,
        })
        .from(mandiriRooms)
        .leftJoin(mandiriPemilihan, eq(mandiriRooms.pemilihanId, mandiriPemilihan.id))
        .leftJoin(g1, eq(mandiriPemilihan.pengirimId, g1.id))
        .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
        .leftJoin(m1, eq(g1.id, m1.generusId))
        .leftJoin(m2, eq(g2.id, m2.generusId))
        .orderBy(mandiriRooms.nama);

        return NextResponse.json(rooms);
    } catch (error) {
        console.error("GET rooms error:", error);
        return NextResponse.json({ error: "Gagal mengambil data ruangan" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { nama } = body;

        if (!nama) return NextResponse.json({ error: "Nama ruangan wajib diisi" }, { status: 400 });

        const id = uuidv4();
        await db.insert(mandiriRooms).values({
            id,
            nama,
            status: "Kosong"
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("POST room error:", error);
        return NextResponse.json({ error: "Gagal membuat ruangan" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.delete(mandiriRooms);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE all rooms error:", error);
        return NextResponse.json({ error: "Gagal menghapus semua ruangan" }, { status: 500 });
    }
}
