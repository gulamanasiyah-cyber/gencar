
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriRooms, mandiriPemilihan, mandiriKunjungan } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roomId = params.id;
        const body = await request.json();
        const { pemilihanId, action } = body; // action can be 'assign' or 'clear'

        if (action === "assign") {
            if (!pemilihanId) return NextResponse.json({ error: "ID Pemilihan wajib diisi" }, { status: 400 });

            // 0. Get Pemilihan Details for History
            const pemilihan = await db.query.mandiriPemilihan.findFirst({
                where: eq(mandiriPemilihan.id, pemilihanId)
            });

            if (pemilihan) {
                // Insert history for both pengirim and penerima
                await db.insert(mandiriKunjungan).values([
                    {
                        id: crypto.randomUUID(),
                        generusId: pemilihan.pengirimId,
                        roomId: roomId,
                        pemilihanId: pemilihanId
                    },
                    {
                        id: crypto.randomUUID(),
                        generusId: pemilihan.penerimaId,
                        roomId: roomId,
                        pemilihanId: pemilihanId
                    }
                ]);
            }

            // 1. Update selection status
            await db.update(mandiriPemilihan)
                .set({ status: "Diterima" })
                .where(eq(mandiriPemilihan.id, pemilihanId));

            // 2. Update room info
            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId, 
                    status: "Terisi",
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            return NextResponse.json({ success: true });
        } else if (action === "clear") {
            const { hasilPengirim, hasilPenerima } = body;

            // Find current pemilihanId
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

            if (room?.pemilihanId) {
                // Mark as Selesai and update results
                await db.update(mandiriPemilihan)
                    .set({ 
                        status: "Selesai",
                        hasilPengirim: hasilPengirim || null,
                        hasilPenerima: hasilPenerima || null
                    })
                    .where(eq(mandiriPemilihan.id, room.pemilihanId));
            }

            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId: null, 
                    status: "Kosong",
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            return NextResponse.json({ success: true });
        } else if (action === "undo") {
            // Find current pemilihanId
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

            if (room?.pemilihanId) {
                // 1. Reset selection status to "Menunggu"
                await db.update(mandiriPemilihan)
                    .set({ status: "Menunggu" })
                    .where(eq(mandiriPemilihan.id, room.pemilihanId));

                // 2. Delete kunjungan records for this specific pemilihan
                await db.delete(mandiriKunjungan)
                    .where(eq(mandiriKunjungan.pemilihanId, room.pemilihanId));
            }

            // 3. Clear the room
            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId: null, 
                    status: "Kosong",
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
    } catch (error) {
        console.error("PATCH room error:", error);
        return NextResponse.json({ error: "Gagal memperbarui ruangan" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.delete(mandiriRooms).where(eq(mandiriRooms.id, params.id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE room error:", error);
        return NextResponse.json({ error: "Gagal menghapus ruangan" }, { status: 500 });
    }
}
