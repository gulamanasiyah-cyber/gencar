import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, generus, mandiri, mandiriRooms, settings } from "@/lib/schema";
import { eq, and, or, desc, sql, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { pusherServer } from "@/lib/pusher";
import { getSession } from "@/lib/auth";
import { HASIL_BELUM_DIJAWAB } from "@/lib/autoFinalizeRooms";

export const dynamic = "force-dynamic";

const RESULTS_ADMIN_ROLES = ["admin", "kmm_daerah", "pengurus_daerah", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"];

async function resolveResultsIdentity(request: NextRequest) {
    const session = await getSession();
    const sessionGenerusId = session?.generusId || null;
    const isAdmin = !!session && RESULTS_ADMIN_ROLES.includes(session.role);

    if (sessionGenerusId) {
        return { generusId: sessionGenerusId, isAdmin };
    }

    const nomorUnik = request.headers.get("x-nomor-unik");
    const token = request.headers.get("x-session-token");
    if (nomorUnik && token) {
        const participant = await db.select({ generusId: mandiri.generusId })
            .from(mandiri)
            .innerJoin(generus, eq(mandiri.generusId, generus.id))
            .where(and(eq(generus.nomorUnik, nomorUnik), eq(mandiri.lastSessionToken, token)))
            .limit(1);
        if (participant.length > 0) {
            return { generusId: participant[0].generusId, isAdmin };
        }
    }

    return { generusId: null, isAdmin };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedGenerusId = searchParams.get("generusId");
        const identity = await resolveResultsIdentity(request);
        const generusId = identity.isAdmin ? requestedGenerusId : identity.generusId;

        if (!generusId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!identity.isAdmin && requestedGenerusId && requestedGenerusId !== identity.generusId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const activeSetting = await db.select({ value: settings.value })
            .from(settings)
            .where(eq(settings.key, "mandiri_active_kegiatan_id"))
            .limit(1);
        const activeKegiatanId = activeSetting[0]?.value;
        if (!activeKegiatanId) {
            return NextResponse.json([]);
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
        .leftJoin(mPengirim, and(
            eq(gPengirim.id, mPengirim.generusId),
            eq(mPengirim.kegiatanId, activeKegiatanId)
        ))
        .leftJoin(mPenerima, and(
            eq(gPenerima.id, mPenerima.generusId),
            eq(mPenerima.kegiatanId, activeKegiatanId)
        ))
        .where(
            and(
                eq(mandiriPemilihan.kegiatanId, activeKegiatanId),
                or(
                    eq(mandiriPemilihan.status, "Diterima"),
                    eq(mandiriPemilihan.status, "Selesai")
                ),
                or(
                    eq(mandiriPemilihan.pengirimId, generusId),
                    eq(mandiriPemilihan.penerimaId, generusId),
                    eq(mandiriPemilihan.assignedGuardId, generusId),
                    eq(mandiriPemilihan.assignedCallerId, generusId),
                    eq(mandiriPemilihan.assignedCaller2Id, generusId),
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
        const { id, hasil, untuk } = await request.json();
        if (!id || !hasil) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const validResults = ["Lanjut", "Ragu-ragu", "Ragu-Ragu", "Tidak Lanjut"];
        if (!validResults.includes(hasil)) {
            return NextResponse.json({ error: "Hasil tidak valid" }, { status: 400 });
        }

        const identity = await resolveResultsIdentity(request);
        const generusId = identity.generusId;
        if (!generusId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const record = await db.query.mandiriPemilihan.findFirst({
            where: eq(mandiriPemilihan.id, id)
        });

        if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Sesi "Selesai" hanya menerima jawaban susulan dari yang dicatat "Belum Dijawab" oleh sistem
        if (record.status !== "Diterima" && record.status !== "Selesai") {
            return NextResponse.json({ error: "Sesi ini tidak lagi menerima hasil" }, { status: 409 });
        }

        // Sisi mana yang diisi: peserta mengisi miliknya sendiri; panitia yang bertugas
        // di sesi ini boleh mengisikan jawaban "Belum Dijawab" atas nama peserta.
        let side: "pengirim" | "penerima";
        if (record.pengirimId === generusId) {
            side = "pengirim";
        } else if (record.penerimaId === generusId) {
            side = "penerima";
        } else {
            const room = await db.query.mandiriRooms.findFirst({ where: eq(mandiriRooms.pemilihanId, id) });
            const assigned = [record.assignedGuardId, record.assignedCallerId, record.assignedCaller2Id,
                room?.assignedGuardId, room?.assignedCallerId, room?.assignedCaller2Id];
            if ((untuk !== "pengirim" && untuk !== "penerima") || !assigned.includes(generusId)) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
            const current = untuk === "pengirim" ? record.hasilPengirim : record.hasilPenerima;
            if (current !== HASIL_BELUM_DIJAWAB) {
                return NextResponse.json({ error: "Panitia hanya dapat mengisi jawaban yang berstatus Belum Dijawab" }, { status: 409 });
            }
            side = untuk;
        }
        const resultColumn = side === "pengirim" ? mandiriPemilihan.hasilPengirim : mandiriPemilihan.hasilPenerima;

        const updatedByParticipant = await db.update(mandiriPemilihan)
            .set(side === "pengirim" ? { hasilPengirim: hasil } : { hasilPenerima: hasil })
            .where(and(
                eq(mandiriPemilihan.id, id),
                or(
                    and(eq(mandiriPemilihan.status, "Diterima"), or(isNull(resultColumn), eq(resultColumn, ""), eq(resultColumn, HASIL_BELUM_DIJAWAB))),
                    and(eq(mandiriPemilihan.status, "Selesai"), eq(resultColumn, HASIL_BELUM_DIJAWAB))
                )
            ))
            .returning({ id: mandiriPemilihan.id });

        if (updatedByParticipant.length === 0) {
            return NextResponse.json({ error: "Hasil Anda sudah pernah dikirim" }, { status: 409 });
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

        const wasLate = record.status === "Selesai";
        if (wasLate) {
            // Jawaban susulan: sesi sudah selesai & ruangan sudah kosong; cukup jalankan cleanup bila jadi match
            try {
                const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                await handleMatchCleanup(id);
            } catch (cleanupErr) {
                console.error("Failed to run match cleanup:", cleanupErr);
            }
        } else if (hasFinished) {
            // 1. Mark the pemilihan as "Selesai"
            const finalized = await db.update(mandiriPemilihan)
                .set({ status: "Selesai" })
                .where(and(eq(mandiriPemilihan.id, id), eq(mandiriPemilihan.status, "Diterima")))
                .returning({ id: mandiriPemilihan.id });

            // 2. Clean up matches if both chose "Lanjut"
            if (finalized.length > 0) {
                try {
                    const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                    await handleMatchCleanup(id);
                } catch (cleanupErr) {
                    console.error("Failed to run match cleanup:", cleanupErr);
                }
            }

            // 3. Find if this selection is in any active room and clear the room
            const room = finalized.length > 0 ? await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.pemilihanId, id)
            }) : null;

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
                        pengirimId: record.pengirimId,
                        penerimaId: record.penerimaId,
                        assignedGuardId: room.assignedGuardId,
                        assignedCallerId: room.assignedCallerId,
                        assignedCaller2Id: room.assignedCaller2Id
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
