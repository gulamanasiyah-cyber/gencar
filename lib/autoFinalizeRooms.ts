import { db } from "./db";
import { mandiriPemilihan, mandiriRooms } from "./schema";
import { eq, and, sql } from "drizzle-orm";
import { pusherServer } from "./pusher";

/** Nilai hasil yang dicatat sistem bila peserta/panitia tidak menjawab. */
export const HASIL_BELUM_DIJAWAB = "Belum Dijawab";

/**
 * Tenggang setelah durasi sesi habis sebelum sistem menyelesaikan ruangan
 * secara otomatis, supaya peserta masih sempat mengisi hasil.
 */
export const AUTO_FINALIZE_GRACE_MIN = 5;

type RoomLike = {
    id: string;
    status?: string | null;
    pemilihanId?: string | null;
    startedAt?: string | null;
    durasiMenit?: number | null;
};

function parseStartedAt(startedAt: string): number {
    // SQLite datetime('now') = "YYYY-MM-DD HH:mm:ss" (UTC)
    const iso = startedAt.includes(" ") ? startedAt.replace(" ", "T") + "Z" : startedAt;
    return new Date(iso).getTime();
}

export function isRoomExpired(room: RoomLike, now = Date.now()): boolean {
    if (room.status !== "Terisi" || !room.pemilihanId || !room.startedAt) return false;
    const start = parseStartedAt(room.startedAt);
    if (!Number.isFinite(start)) return false;
    const limitMs = ((room.durasiMenit || 15) + AUTO_FINALIZE_GRACE_MIN) * 60 * 1000;
    return now - start >= limitMs;
}

/**
 * Selesaikan otomatis ruangan yang sesinya sudah lewat batas waktu.
 * Sisi yang belum menjawab dicatat "Belum Dijawab", sesi menjadi "Selesai",
 * dan ruangan dikosongkan. Mengembalikan jumlah ruangan yang diselesaikan.
 */
export async function autoFinalizeExpiredRooms(rooms: RoomLike[]): Promise<number> {
    const expired = rooms.filter((r) => isRoomExpired(r));
    let finalized = 0;

    for (const room of expired) {
        try {
            const pemilihanId = room.pemilihanId as string;

            const updated = await db.update(mandiriPemilihan)
                .set({
                    hasilPengirim: sql`CASE WHEN ${mandiriPemilihan.hasilPengirim} IS NULL OR ${mandiriPemilihan.hasilPengirim} = '' THEN ${HASIL_BELUM_DIJAWAB} ELSE ${mandiriPemilihan.hasilPengirim} END`,
                    hasilPenerima: sql`CASE WHEN ${mandiriPemilihan.hasilPenerima} IS NULL OR ${mandiriPemilihan.hasilPenerima} = '' THEN ${HASIL_BELUM_DIJAWAB} ELSE ${mandiriPemilihan.hasilPenerima} END`,
                    status: "Selesai",
                })
                .where(and(eq(mandiriPemilihan.id, pemilihanId), eq(mandiriPemilihan.status, "Diterima")))
                .returning({
                    pengirimId: mandiriPemilihan.pengirimId,
                    penerimaId: mandiriPemilihan.penerimaId,
                });

            // Kosongkan ruangan hanya bila masih memegang sesi yang sama
            const cleared = await db.update(mandiriRooms)
                .set({
                    pemilihanId: null,
                    timGambuhId: null,
                    status: "Kosong",
                    startedAt: null,
                    updatedAt: sql`(datetime('now'))`,
                })
                .where(and(eq(mandiriRooms.id, room.id), eq(mandiriRooms.pemilihanId, pemilihanId)))
                .returning({
                    assignedGuardId: mandiriRooms.assignedGuardId,
                    assignedCallerId: mandiriRooms.assignedCallerId,
                    assignedCaller2Id: mandiriRooms.assignedCaller2Id,
                });

            if (cleared.length === 0 && updated.length === 0) continue; // sudah ditangani proses lain
            finalized++;

            try {
                await pusherServer.trigger("taaruf-channel", "room-changed", {
                    roomId: room.id,
                    action: "clear",
                    pengirimId: updated[0]?.pengirimId,
                    penerimaId: updated[0]?.penerimaId,
                    assignedGuardId: cleared[0]?.assignedGuardId,
                    assignedCallerId: cleared[0]?.assignedCallerId,
                    assignedCaller2Id: cleared[0]?.assignedCaller2Id,
                    auto: true,
                });
            } catch (pusherErr) {
                console.error("Pusher auto-finalize trigger error:", pusherErr);
            }
        } catch (err) {
            console.error("Auto-finalize room gagal:", room.id, err);
        }
    }

    return finalized;
}
