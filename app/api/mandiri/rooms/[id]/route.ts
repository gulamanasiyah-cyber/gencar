
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriRooms, mandiriPemilihan, mandiriKunjungan, mandiriKegiatan, mandiriAbsensi, settings, generus, mandiri, timGambuh, mandiriDesa, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roomId = params.id;
        const body = await request.json();
        const { pemilihanId, action, timGambuhId, operatorCompanionId } = body;

        // If user is tim_pnkb_gambuh, they can only perform start/clear on rooms assigned to them
        if (session.role === "tim_pnkb_gambuh" && (action === "start" || action === "clear")) {
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });
            const isAssigned = room && (
                room.assignedGuardId === operatorCompanionId ||
                room.assignedCallerId === operatorCompanionId ||
                room.assignedCaller2Id === operatorCompanionId
            );
            if (!isAssigned) {
                return NextResponse.json({ error: "Anda tidak ditugaskan di ruangan ini." }, { status: 403 });
            }
        }

        if (action === "update_details") {
            const { nama, assignedCallerId, assignedCaller2Id, assignedGuardId } = body;
            
            const updateFields: any = {
                updatedAt: sql`(datetime('now'))`
            };
            
            if (nama !== undefined) {
                updateFields.nama = nama;
            }
            if (assignedCallerId !== undefined) {
                updateFields.assignedCallerId = assignedCallerId;
            }
            if (assignedCaller2Id !== undefined) {
                updateFields.assignedCaller2Id = assignedCaller2Id;
            }
            if (assignedGuardId !== undefined) {
                updateFields.assignedGuardId = assignedGuardId;
            }

            await db.update(mandiriRooms)
                .set(updateFields)
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            const updatedRoom = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });
            await pusherServer.trigger("romantic-room", "room-updated", { roomId, room: updatedRoom });

            return NextResponse.json({ success: true });
        }

        if (action === "assign_staff") {
            const { assignedCallerId, assignedCaller2Id, assignedGuardId } = body;
            
            const updateFields: any = {
                updatedAt: sql`(datetime('now'))`
            };
            
            if (assignedCallerId !== undefined) {
                updateFields.assignedCallerId = assignedCallerId;
            }
            if (assignedCaller2Id !== undefined) {
                updateFields.assignedCaller2Id = assignedCaller2Id;
            }
            if (assignedGuardId !== undefined) {
                updateFields.assignedGuardId = assignedGuardId;
            }

            await db.update(mandiriRooms)
                .set(updateFields)
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            const updatedRoom = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });
            await pusherServer.trigger("romantic-room", "room-updated", { roomId, room: updatedRoom });

            return NextResponse.json({ success: true });
        }

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
            const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
            const kegiatanId = activeSetting[0]?.value || "";

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
                    return NextResponse.json({ error: "Salah satu peserta sudah logout/pulang and tidak dapat masuk ruangan." }, { status: 400 });
                }
            }

            if (timGambuhId) {
                // Check if this tim_pnkb_gambuh member is already active/busy in another room
                const busyRoom = await db.select({ id: mandiriRooms.id })
                    .from(mandiriRooms)
                    .where(and(
                        eq(mandiriRooms.timGambuhId, timGambuhId),
                        eq(mandiriRooms.status, "Terisi"),
                        sql`${mandiriRooms.id} != ${roomId}`
                    ))
                    .limit(1);

                if (busyRoom.length > 0) {
                    return NextResponse.json({ error: "Anggota Tim Gambuh ini sedang bertugas di ruangan lain." }, { status: 400 });
                }
            }

            // Auto-assign staff based on participants' daerah+desa
            let assignedCallerId: string | null = null;
            let assignedCaller2Id: string | null = null;
            let assignedGuardId: string | null = null;
            let callerNama: string | null = null;
            let caller2Nama: string | null = null;
            let guardNama: string | null = null;

            if (kegiatanId) {
                try {
                    // Helper: resolve mandiriDesaId for a generusId (check generus, fallback to formPanitiaDanPengurus)
                    const resolveDesaId = async (generusId: string): Promise<number | null> => {
                        const [gRow] = await db.select({ mandiriDesaId: generus.mandiriDesaId })
                            .from(generus).where(eq(generus.id, generusId)).limit(1);
                        if (gRow?.mandiriDesaId) return gRow.mandiriDesaId;
                        const [pRow] = await db.select({ mandiriDesaId: formPanitiaDanPengurus.mandiriDesaId })
                            .from(formPanitiaDanPengurus).where(eq(formPanitiaDanPengurus.generusId, generusId)).limit(1);
                        return pRow?.mandiriDesaId ?? null;
                    };
                    const resolveDaerahId = async (desaId: number): Promise<number | null> => {
                        const [dRow] = await db.select({ mandiriDaerahId: mandiriDesa.mandiriDaerahId })
                            .from(mandiriDesa).where(eq(mandiriDesa.id, desaId)).limit(1);
                        return dRow?.mandiriDaerahId ?? null;
                    };

                    const pengirimDesaId = await resolveDesaId(pemilihan.pengirimId);
                    const pengirimDaerahId = pengirimDesaId ? await resolveDaerahId(pengirimDesaId) : null;
                    const penerimaDesaId = await resolveDesaId(pemilihan.penerimaId);
                    const penerimaDaerahId = penerimaDesaId ? await resolveDaerahId(penerimaDesaId) : null;

                    console.log(`[RoomAssign] pengirimDesaId=${pengirimDesaId} pengirimDaerahId=${pengirimDaerahId} | penerimaDesaId=${penerimaDesaId} penerimaDaerahId=${penerimaDaerahId}`);

                    // Fetch all active staff for this kegiatan
                    const allStaff = await db.select({
                        id: timGambuh.id,
                        nama: timGambuh.nama,
                        tipe: timGambuh.tipe,
                        daerahId: timGambuh.daerahId,
                        desaId: timGambuh.desaId,
                    })
                    .from(timGambuh)
                    .where(eq(timGambuh.kegiatanId, kegiatanId));

                    // Get busy staff IDs from other occupied rooms
                    const occupiedRoomStaff = await db.select({
                        assignedCallerId: mandiriRooms.assignedCallerId,
                        assignedCaller2Id: mandiriRooms.assignedCaller2Id,
                        assignedGuardId: mandiriRooms.assignedGuardId,
                    })
                    .from(mandiriRooms)
                    .where(and(eq(mandiriRooms.status, "Terisi"), sql`${mandiriRooms.id} != ${roomId}`));

                    const busyIds = new Set<string>(
                        occupiedRoomStaff.flatMap(r => [r.assignedCallerId, r.assignedCaller2Id, r.assignedGuardId].filter(Boolean) as string[])
                    );

                    // Pick best candidate: prefer not busy, pick randomly among free.
                    // If the narrow pool is exhausted by exclusions (e.g. everyone in it
                    // is already assigned to another role in this room), widen the search
                    // to the full staff roster before ever reusing an excluded person —
                    // only reuse someone as an absolute last resort when truly no one else exists.
                    const pickBest = (pool: typeof allStaff, excludeIds: Set<string> = new Set()): string | null => {
                        if (pool.length === 0) return null;
                        const pickFrom = (candidatesPool: typeof allStaff) => {
                            const eligible = candidatesPool.filter(s => !excludeIds.has(s.id));
                            if (eligible.length === 0) return null;
                            const free = eligible.filter(s => !busyIds.has(s.id));
                            const candidates = free.length > 0 ? free : eligible;
                            return candidates[Math.floor(Math.random() * candidates.length)].id;
                        };
                        return pickFrom(pool) ?? pickFrom(allStaff) ?? pool[0]?.id ?? null;
                    };

                    // Normalise IDs to numbers to avoid type-mismatch (SQLite can return mixed types)
                    const pgDesa = pengirimDesaId != null ? Number(pengirimDesaId) : null;
                    const pgDaerah = pengirimDaerahId != null ? Number(pengirimDaerahId) : null;
                    const pnDesa = penerimaDesaId != null ? Number(penerimaDesaId) : null;
                    const pnDaerah = penerimaDaerahId != null ? Number(penerimaDaerahId) : null;

                    const matchDesa = (s: typeof allStaff[0], desaId: number | null, daerahId: number | null) =>
                        desaId != null && daerahId != null &&
                        Number(s.desaId) === desaId && Number(s.daerahId) === daerahId;
                    const matchDaerah = (s: typeof allStaff[0], daerahId: number | null) =>
                        daerahId != null && Number(s.daerahId) === daerahId;

                    // Caller 1: PNKB from pengirim's daerah+desa → daerah-only → any PNKB
                    const pnkbStaff = allStaff.filter(s => s.tipe === 'PNKB');
                    const pnkbExact = pnkbStaff.filter(s => matchDesa(s, pgDesa, pgDaerah));
                    const pnkbDaerah = pnkbStaff.filter(s => matchDaerah(s, pgDaerah));
                    const caller1Pool = pnkbExact.length > 0 ? pnkbExact : pnkbDaerah.length > 0 ? pnkbDaerah : pnkbStaff;
                    assignedCallerId = pickBest(caller1Pool);

                    // Caller 2: Ibu Gambuh from penerima's daerah+desa → daerah-only → any Ibu Gambuh
                    const gambuhStaff = allStaff.filter(s => s.tipe === 'Ibu Gambuh');
                    const gambuhExact = gambuhStaff.filter(s => matchDesa(s, pnDesa, pnDaerah));
                    const gambuhDaerah = gambuhStaff.filter(s => matchDaerah(s, pnDaerah));
                    const caller2Pool = gambuhExact.length > 0 ? gambuhExact : gambuhDaerah.length > 0 ? gambuhDaerah : gambuhStaff;
                    assignedCaller2Id = pickBest(caller2Pool, new Set([assignedCallerId].filter(Boolean) as string[]));

                    console.log(`[RoomAssign] pgDesa=${pgDesa} pgDaerah=${pgDaerah} pnDesa=${pnDesa} pnDaerah=${pnDaerah}`);
                    console.log(`[RoomAssign] pnkbExact=${pnkbExact.length} pnkbDaerah=${pnkbDaerah.length} gambuhExact=${gambuhExact.length} gambuhDaerah=${gambuhDaerah.length}`);
                    console.log(`[RoomAssign] gambuhStaff:`, gambuhStaff.map(s => `${s.nama}(daerah=${s.daerahId},desa=${s.desaId})`));

                    // Guard: any tipe from either participant's daerah+desa, not already chosen
                    const chosenIds = new Set<string>([assignedCallerId, assignedCaller2Id].filter(Boolean) as string[]);
                    const guardCandidates = (() => {
                        const exactMatch = allStaff.filter(s =>
                            matchDesa(s, pgDesa, pgDaerah) || matchDesa(s, pnDesa, pnDaerah)
                        );
                        if (exactMatch.length > 0) return exactMatch;
                        const daerahMatch = allStaff.filter(s =>
                            matchDaerah(s, pgDaerah) || matchDaerah(s, pnDaerah)
                        );
                        return daerahMatch.length > 0 ? daerahMatch : allStaff;
                    })();
                    assignedGuardId = pickBest(guardCandidates, chosenIds);

                    callerNama = allStaff.find(s => s.id === assignedCallerId)?.nama ?? null;
                    caller2Nama = allStaff.find(s => s.id === assignedCaller2Id)?.nama ?? null;
                    guardNama = allStaff.find(s => s.id === assignedGuardId)?.nama ?? null;
                } catch (staffErr) {
                    console.error("Staff auto-assignment error:", staffErr);
                }
            }

            if (pemilihan) {
                // Insert history for both pengirim and penerima
                await db.insert(mandiriKunjungan).values([
                    {
                        id: crypto.randomUUID(),
                        generusId: pemilihan.pengirimId,
                        roomId: roomId,
                        pemilihanId: pemilihanId,
                        kegiatanId: kegiatanId
                    },
                    {
                        id: crypto.randomUUID(),
                        generusId: pemilihan.penerimaId,
                        roomId: roomId,
                        pemilihanId: pemilihanId,
                        kegiatanId: kegiatanId
                    }
                ]);
            }

            // 1. Update selection status + persist staff assignment on pemilihan
            await db.update(mandiriPemilihan)
                .set({
                    status: "Diterima",
                    assignedCallerId: assignedCallerId || null,
                    assignedCaller2Id: assignedCaller2Id || null,
                    assignedGuardId: assignedGuardId || null,
                })
                .where(eq(mandiriPemilihan.id, pemilihanId));

            // 2. Update room info
            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId, 
                    timGambuhId: timGambuhId || null,
                    assignedCallerId: assignedCallerId || null,
                    assignedCaller2Id: assignedCaller2Id || null,
                    assignedGuardId: assignedGuardId || null,
                    status: "Terisi",
                    startedAt: null,
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            try {
                const { alias } = await import("drizzle-orm/sqlite-core");
                const g1 = alias(generus, "g1");
                const g2 = alias(generus, "g2");
                const m1 = alias(mandiri, "m1");
                const m2 = alias(mandiri, "m2");
                const uCaller = alias(timGambuh, "uCaller");
                const uCaller2 = alias(timGambuh, "uCaller2");
                const uGuard = alias(timGambuh, "uGuard");

                const rDetails = await db.select({
                    roomNama: mandiriRooms.nama,
                    timGambuhNama: timGambuh.nama,
                    pengirimNama: g1.nama,
                    pengirimNoUrut: m1.nomorUrut,
                    penerimaNama: g2.nama,
                    penerimaNoUrut: m2.nomorUrut,
                    assignedCallerId: mandiriRooms.assignedCallerId,
                    assignedCallerNama: uCaller.nama,
                    assignedCaller2Id: mandiriRooms.assignedCaller2Id,
                    assignedCaller2Nama: uCaller2.nama,
                    assignedGuardId: mandiriRooms.assignedGuardId,
                    assignedGuardNama: uGuard.nama,
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
                .where(eq(mandiriRooms.id, roomId))
                .limit(1);

                const rd = rDetails[0];

                await pusherServer.trigger("taaruf-channel", "room-changed", {
                    roomId,
                    action: "assign",
                    pemilihanId,
                    roomNama: rd?.roomNama || "",
                    timGambuhNama: rd?.timGambuhNama || "Belum ditentukan",
                    pengirimNama: rd?.pengirimNama || "",
                    pengirimNoUrut: rd?.pengirimNoUrut || "",
                    penerimaNama: rd?.penerimaNama || "",
                    penerimaNoUrut: rd?.penerimaNoUrut || "",
                    assignedCallerId: rd?.assignedCallerId || null,
                    assignedCallerNama: rd?.assignedCallerNama || null,
                    assignedCaller2Id: rd?.assignedCaller2Id || null,
                    assignedCaller2Nama: rd?.assignedCaller2Nama || null,
                    assignedGuardId: rd?.assignedGuardId || null,
                    assignedGuardNama: rd?.assignedGuardNama || null,
                });
            } catch (pusherErr) {
                console.error("Pusher trigger error:", pusherErr);
            }

            // 3. Send WhatsApp notifications to both participants via Fonnte
            try {
                // Fetch room name
                const roomDetails = await db.query.mandiriRooms.findFirst({
                    where: eq(mandiriRooms.id, roomId)
                });
                const roomName = roomDetails?.nama || "Ruang Taaruf";

                // Fetch pengirim (pemilih) details
                const pengirimData = await db.select({
                    nama: generus.nama,
                    noTelp: generus.noTelp,
                    nomorUrut: mandiri.nomorUrut
                })
                .from(generus)
                .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                .where(eq(generus.id, pemilihan.pengirimId))
                .limit(1);

                // Fetch penerima (terpilih) details
                const penerimaData = await db.select({
                    nama: generus.nama,
                    noTelp: generus.noTelp,
                    nomorUrut: mandiri.nomorUrut
                })
                .from(generus)
                .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                .where(eq(generus.id, pemilihan.penerimaId))
                .limit(1);

                const pengirim = pengirimData[0];
                const penerima = penerimaData[0];

                if (pengirim && penerima) {

                    const msgToPengirim = `Amal sholihnya untuk *${pengirim.nama}* (*#${pengirim.nomorUrut || '-'}*), dimintai amal sholih untuk ke *${roomName}* dengan *${penerima.nama}* (*#${penerima.nomorUrut || '-'}*).`;
                    const msgToPenerima = `Amal sholihnya untuk *${penerima.nama}* (*#${penerima.nomorUrut || '-'}*), dimintai amal sholih untuk ke *${roomName}* dengan *${pengirim.nama}* (*#${pengirim.nomorUrut || '-'}*).`;

                    if (pengirim.noTelp) {
                        sendWhatsApp(pengirim.noTelp, msgToPengirim);
                    }
                    if (penerima.noTelp) {
                        sendWhatsApp(penerima.noTelp, msgToPenerima);
                    }
                }
            } catch (notifyErr) {
                console.error("Failed to send room assignment WA notification:", notifyErr);
            }

            return NextResponse.json({
                success: true,
                assignedCallerId,
                assignedCallerNama: callerNama,
                assignedCaller2Id,
                assignedCaller2Nama: caller2Nama,
                assignedGuardId,
                assignedGuardNama: guardNama,
            });
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

                // Clean up matched participants if both chose 'Lanjut'
                try {
                    const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                    await handleMatchCleanup(room.pemilihanId);
                } catch (cleanupErr) {
                    console.error("Failed to run match cleanup:", cleanupErr);
                }
            }

            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId: null, 
                    timGambuhId: null,
                    status: "Kosong",
                    startedAt: null,
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            try {
                await pusherServer.trigger("taaruf-channel", "room-changed", {
                    roomId,
                    action: "clear",
                });
            } catch (pusherErr) {
                console.error("Pusher trigger error:", pusherErr);
            }

            return NextResponse.json({ success: true });
        } else if (action === "undo") {
            // Only admin, admin_romantic_room, and tim_pnkb are allowed to undo
            if (!["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
                return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk mengembalikan pasangan ke antrean." }, { status: 403 });
            }

            // Find current pemilihanId
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

            if (room?.startedAt) {
                return NextResponse.json({ error: "Sesi sudah dimulai, tidak dapat dikembalikan ke antrean." }, { status: 400 });
            }

            if (room?.pemilihanId) {
                // 1. Reset selection status to "Menunggu" and statusTunggu to "antrean"
                await db.update(mandiriPemilihan)
                    .set({ status: "Menunggu", statusTunggu: "antrean" })
                    .where(eq(mandiriPemilihan.id, room.pemilihanId));

                // 2. Delete kunjungan records for this specific pemilihan
                await db.delete(mandiriKunjungan)
                    .where(eq(mandiriKunjungan.pemilihanId, room.pemilihanId));
            }

            // 3. Clear the room
            await db.update(mandiriRooms)
                .set({ 
                    pemilihanId: null, 
                    timGambuhId: null,
                    status: "Kosong",
                    startedAt: null,
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            try {
                await pusherServer.trigger("taaruf-channel", "room-changed", {
                    roomId,
                    action: "undo",
                });
            } catch (pusherErr) {
                console.error("Pusher trigger error:", pusherErr);
            }

            return NextResponse.json({ success: true });
        } else if (action === "start") {
            await db.update(mandiriRooms)
                .set({
                    startedAt: sql`(datetime('now'))`,
                    updatedAt: sql`(datetime('now'))`
                })
                .where(eq(mandiriRooms.id, roomId));

            // Trigger Pusher update
            try {
                await pusherServer.trigger("taaruf-channel", "room-changed", {
                    roomId,
                    action: "start",
                });
            } catch (pusherErr) {
                console.error("Pusher trigger error:", pusherErr);
            }

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

        // Trigger Pusher update
        try {
            await pusherServer.trigger("taaruf-channel", "room-changed", {
                roomId: params.id,
                action: "delete-room",
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE room error:", error);
        return NextResponse.json({ error: "Gagal menghapus ruangan" }, { status: 500 });
    }
}
