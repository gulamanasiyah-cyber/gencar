
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriRooms, mandiriPemilihan, generus, mandiri, settings, timGambuh, users } from "@/lib/schema";
import { eq, and, or, count, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { alias } from "drizzle-orm/sqlite-core";
import { pusherServer } from "@/lib/pusher";

export async function GET(request: NextRequest) {
    try {
        // Self-healing migration to automatically add new columns to database if missing
        try {
            await db.run(sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_caller_id TEXT`);
        } catch (e) {}
        try {
            await db.run(sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_caller2_id TEXT`);
        } catch (e) {}
        try {
            await db.run(sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_guard_id TEXT`);
        } catch (e) {}

        // Cleanup stale data
        try {
            await db.run(sql`UPDATE mandiri_rooms SET assigned_caller_id = NULL, assigned_caller2_id = NULL, assigned_guard_id = NULL WHERE status = 'Kosong'`);
        } catch (e) {}

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

        const { searchParams } = new URL(request.url);
        let kegiatanId = searchParams.get("kegiatanId") || "";

        if (!kegiatanId) {
            const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
            kegiatanId = activeSetting[0]?.value || "";
        }

        if (!kegiatanId) {
            return NextResponse.json([]);
        }

        const g1 = alias(generus, "g1");
        const g2 = alias(generus, "g2");
        const m1 = alias(mandiri, "m1");
        const m2 = alias(mandiri, "m2");
        const uCaller = alias(timGambuh, "uCaller");
        const uCaller2 = alias(timGambuh, "uCaller2");
        const uGuard = alias(timGambuh, "uGuard");

        const rooms = await db.select({
            id: mandiriRooms.id,
            nama: mandiriRooms.nama,
            status: mandiriRooms.status,
            pemilihanId: mandiriRooms.pemilihanId,
            timGambuhId: mandiriRooms.timGambuhId,
            timGambuhNama: timGambuh.nama,
            pengirimNama: g1.nama,
            pengirimNo: g1.nomorUnik,
            pengirimNomorUrut: m1.nomorUrut,
            penerimaNama: g2.nama,
            penerimaNo: g2.nomorUnik,
            penerimaNomorUrut: m2.nomorUrut,
            startedAt: mandiriRooms.startedAt,
            assignedCallerId: mandiriRooms.assignedCallerId,
            assignedCallerNama: uCaller.nama,
            assignedCaller2Id: mandiriRooms.assignedCaller2Id,
            assignedCaller2Nama: uCaller2.nama,
            assignedGuardId: mandiriRooms.assignedGuardId,
            assignedGuardNama: uGuard.nama,
            updatedAt: mandiriRooms.updatedAt,
        })
        .from(mandiriRooms)
        .leftJoin(mandiriPemilihan, eq(mandiriRooms.pemilihanId, mandiriPemilihan.id))
        .leftJoin(timGambuh, eq(mandiriRooms.timGambuhId, timGambuh.id))
        .leftJoin(g1, eq(mandiriPemilihan.pengirimId, g1.id))
        .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
        .leftJoin(m1, eq(g1.id, m1.generusId))
        .leftJoin(m2, eq(g2.id, m2.generusId))
        .leftJoin(uCaller, eq(mandiriRooms.assignedCallerId, uCaller.id))
        .leftJoin(uCaller2, eq(mandiriRooms.assignedCaller2Id, uCaller2.id))
        .leftJoin(uGuard, eq(mandiriRooms.assignedGuardId, uGuard.id))
        .where(eq(mandiriRooms.kegiatanId, kegiatanId))
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

        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const activeKegiatanId = activeSetting[0]?.value || "";

        if (!activeKegiatanId) {
            return NextResponse.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif" }, { status: 400 });
        }

        const id = uuidv4();
        await db.insert(mandiriRooms).values({
            id,
            nama,
            kegiatanId: activeKegiatanId,
            status: "Kosong"
        });

        // Trigger Pusher update
        try {
            await pusherServer.trigger("taaruf-channel", "room-changed", {
                roomId: id,
                action: "create-room",
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("POST room error:", error);
        return NextResponse.json({ error: "Gagal membuat ruangan" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const activeKegiatanId = activeSetting[0]?.value || "";

        if (!activeKegiatanId) {
            return NextResponse.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif" }, { status: 400 });
        }

        await db.delete(mandiriRooms).where(eq(mandiriRooms.kegiatanId, activeKegiatanId));

        // Trigger Pusher update
        try {
            await pusherServer.trigger("taaruf-channel", "room-changed", {
                action: "delete-all-rooms",
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE all rooms error:", error);
        return NextResponse.json({ error: "Gagal menghapus semua ruangan" }, { status: 500 });
    }
}
