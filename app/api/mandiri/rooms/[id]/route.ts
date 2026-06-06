
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriRooms, mandiriPemilihan, mandiriKunjungan, mandiriKegiatan, mandiriAbsensi } from "@/lib/schema";
import { eq, sql, and, desc } from "drizzle-orm";
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

            if (!pemilihan) {
                return NextResponse.json({ error: "Data Pemilihan tidak ditemukan" }, { status: 404 });
            }

            // 0.1 Check if either participant has logged out/gone home
            const latestActivity = await db.select({ id: mandiriKegiatan.id })
                .from(mandiriKegiatan)
                .orderBy(desc(mandiriKegiatan.tanggal))
                .limit(1);
            const kegiatanId = latestActivity[0]?.id;

            if (kegiatanId) {
                const checkAttendance = await db.select({
                    generusId: mandiriAbsensi.generusId,
                    keterangan: mandiriAbsensi.keterangan
                })
                .from(mandiriAbsensi)
                .where(and(
                    eq(mandiriAbsensi.kegiatanId, kegiatanId),
                    sql`${mandiriAbsensi.generusId} IN (${pemilihan.pengirimId}, ${pemilihan.penerimaId})`
                ));

                const goneHomeParticipant = checkAttendance.find(a => a.keterangan === "pulang");
                if (goneHomeParticipant) {
                    return NextResponse.json({ error: "Salah satu peserta sudah logout/pulang dan tidak dapat masuk ruangan." }, { status: 400 });
                }
            }

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
                    startedAt: null,
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
                    startedAt: null,
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
                    startedAt: null,
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            return NextResponse.json({ success: true });
        } else if (action === "start") {
            await db.update(mandiriRooms)
                .set({
                    startedAt: sql`(datetime('now'))`,
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
