import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, generus, mandiri, mandiriRooms } from "@/lib/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { pusherServer } from "@/lib/pusher";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const generusId = searchParams.get("generusId");

        if (!generusId) {
            return NextResponse.json({ error: "Missing generusId" }, { status: 400 });
        }

        const gPengirim = alias(generus, "g1");
        const gPenerima = alias(generus, "g2");
        const mPenerima = alias(mandiri, "m2");
        const mPengirim = alias(mandiri, "m1");

        const records = await db.select({
            id: mandiriPemilihan.id,
            roomId: mandiriRooms.id,
            roomNama: mandiriRooms.nama,
            status: mandiriPemilihan.status,
            pengirimId: mandiriPemilihan.pengirimId,
            penerimaId: mandiriPemilihan.penerimaId,
            hasilPengirim: mandiriPemilihan.hasilPengirim,
            hasilPenerima: mandiriPemilihan.hasilPenerima,
            pengirimNama: gPengirim.nama,
            penerimaNama: gPenerima.nama,
            pengirimNoUrut: mPengirim.nomorUrut,
            penerimaNoUrut: mPenerima.nomorUrut,
            createdAt: mandiriPemilihan.createdAt
        })
        .from(mandiriPemilihan)
        .leftJoin(mandiriRooms, eq(mandiriRooms.pemilihanId, mandiriPemilihan.id))
        .innerJoin(gPengirim, eq(mandiriPemilihan.pengirimId, gPengirim.id))
        .innerJoin(gPenerima, eq(mandiriPemilihan.penerimaId, gPenerima.id))
        .leftJoin(mPengirim, eq(gPengirim.id, mPengirim.generusId))
        .leftJoin(mPenerima, eq(gPenerima.id, mPenerima.generusId))
        .where(
            and(
                or(
                    eq(mandiriPemilihan.status, "Diterima"),
                    eq(mandiriPemilihan.status, "Selesai")
                ),
                or(
                    eq(mandiriPemilihan.pengirimId, generusId),
                    eq(mandiriPemilihan.penerimaId, generusId),
                    eq(mandiriRooms.assignedGuardId, generusId),
                    eq(mandiriRooms.assignedCallerId, generusId),
                    eq(mandiriRooms.assignedCaller2Id, generusId)
                )
            )
        )
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json(records);
    } catch (e) {
        console.error("GET hasil-rr error:", e);
        return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { id, generusId, hasil } = await request.json();
        if (!id || !generusId || !hasil) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const record = await db.query.mandiriPemilihan.findFirst({
            where: eq(mandiriPemilihan.id, id)
        });

        if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (record.pengirimId === generusId) {
            await db.update(mandiriPemilihan).set({ hasilPengirim: hasil }).where(eq(mandiriPemilihan.id, id));
        } else if (record.penerimaId === generusId) {
            await db.update(mandiriPemilihan).set({ hasilPenerima: hasil }).where(eq(mandiriPemilihan.id, id));
        } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if both results are now filled
        const updatedRecord = await db.query.mandiriPemilihan.findFirst({
            where: eq(mandiriPemilihan.id, id)
        });

        const hasFinished = updatedRecord && 
            updatedRecord.hasilPengirim && 
            updatedRecord.hasilPengirim !== "Menunggu" && 
            updatedRecord.hasilPenerima && 
            updatedRecord.hasilPenerima !== "Menunggu";

        if (hasFinished) {
            // 1. Mark the pemilihan as "Selesai"
            await db.update(mandiriPemilihan)
                .set({ status: "Selesai" })
                .where(eq(mandiriPemilihan.id, id));

            // 2. Clean up matches if both chose "Lanjut"
            try {
                const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                await handleMatchCleanup(id);
            } catch (cleanupErr) {
                console.error("Failed to run match cleanup:", cleanupErr);
            }

            // 3. Find if this selection is in any active room and clear the room
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.pemilihanId, id)
            });

            if (room) {
                await db.update(mandiriRooms)
                    .set({
                        pemilihanId: null,
                        timGambuhId: null,
                        status: "Kosong",
                        startedAt: null,
                        updatedAt: sql`(datetime('now'))`
                    })
                    .where(eq(mandiriRooms.id, room.id));

                // 4. Trigger Pusher room clear event
                try {
                    await pusherServer.trigger("taaruf-channel", "room-changed", {
                        roomId: room.id,
                        action: "clear",
                    });
                } catch (pusherErr) {
                    console.error("Pusher trigger error:", pusherErr);
                }
            }
        }

        try {
            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                type: "hasil-rr-updated",
                pemilihanId: id,
                generusId
            });
        } catch (pusherErr) {
            console.error("Pusher hasil-rr trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true, finished: !!hasFinished });
    } catch (e) {
        console.error("POST hasil-rr error:", e);
        return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
    }
}
