
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
        let userRole: string | undefined = session?.role;
        let userId: string | undefined = (session as any)?.id || (session as any)?.user?.id;

        if (!session || !["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
            const token = request.headers.get("Authorization")?.replace("Bearer ", "");
            if (token) {
                const participant = await db.query.mandiri.findFirst({
                    where: eq(mandiri.lastSessionToken, token)
                });
                if (participant) {
                    userRole = "peserta_atau_panitia";
                    userId = participant.generusId;
                } else {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                }
            } else {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const roomId = params.id;
        const body = await request.json();
        const { pemilihanId, action, timGambuhId, operatorCompanionId, hasilPengirim, hasilPenerima } = body;

        // If user is tim_pnkb_gambuh or peserta_atau_panitia, they can only perform start/clear on rooms assigned to them
        if ((userRole === "tim_pnkb_gambuh" || userRole === "peserta_atau_panitia") && (action === "start" || action === "clear")) {
            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });
            const sel = room?.pemilihanId ? await db.query.mandiriPemilihan.findFirst({
                where: eq(mandiriPemilihan.id, room.pemilihanId)
            }) : null;
            
            const isAssigned = room && (
                room.assignedGuardId === (operatorCompanionId || userId) ||
                room.assignedCallerId === (operatorCompanionId || userId) ||
                room.assignedCaller2Id === (operatorCompanionId || userId) ||
                sel?.pengirimId === userId ||
                sel?.penerimaId === userId
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

            // Retrieve current room staff assignment so we don't overwrite manual selections
            const currentRoom = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

            let assignedCallerId: string | null = currentRoom?.assignedCallerId || null;
            let assignedCaller2Id: string | null = currentRoom?.assignedCaller2Id || null;
            let assignedGuardId: string | null = currentRoom?.assignedGuardId || null;
            let callerNama: string | null = null;
            let caller2Nama: string | null = null;
            let guardNama: string | null = null;

            if (assignedCallerId || assignedCaller2Id || assignedGuardId) {
                const staffList = await db.select({
                    id: timGambuh.id,
                    nama: timGambuh.nama
                }).from(timGambuh);
                
                callerNama = staffList.find(s => s.id === assignedCallerId)?.nama ?? null;
                caller2Nama = staffList.find(s => s.id === assignedCaller2Id)?.nama ?? null;
                guardNama = staffList.find(s => s.id === assignedGuardId)?.nama ?? null;
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

                    const msgToPengirim = `*PANGGILAN TAARUF*\n\nKepada: *${pengirim.nama}* (#${pengirim.nomorUrut || '-'})\nInstruksi: Amal shalihnya segera merapat ke *Titik Tunggu Utama*.\n\nCatatan: Mohon tetap berada di titik tunggu agar memudahkan panitia untuk menjemput dan mengarahkan Anda menuju ruang taaruf.\n\nAlhamdulillah jazakumullahu khaira.`;
                    const msgToPenerima = `*PANGGILAN TAARUF*\n\nKepada: *${penerima.nama}* (#${penerima.nomorUrut || '-'})\nInstruksi: Amal shalihnya segera merapat ke *Titik Tunggu Utama*.\n\nCatatan: Mohon tetap berada di titik tunggu agar memudahkan panitia untuk menjemput dan mengarahkan Anda menuju ruang taaruf.\n\nAlhamdulillah jazakumullahu khaira.`;

                    const waPromises: Promise<any>[] = [];
                    if (pengirim?.noTelp) {
                        waPromises.push(sendWhatsApp(pengirim.noTelp, msgToPengirim));
                    }
                    if (penerima?.noTelp) {
                        waPromises.push(sendWhatsApp(penerima.noTelp, msgToPenerima));
                    }
                    await Promise.allSettled(waPromises);
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

            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

            if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

            if (userRole === "peserta_atau_panitia") {
                // Peserta and Panitia can only update results, not clear the room
                const sel = await db.query.mandiriPemilihan.findFirst({
                    where: eq(mandiriPemilihan.id, room.pemilihanId || "")
                });

                if (sel) {
                    const isPengirim = sel.pengirimId === userId;
                    const isPenerima = sel.penerimaId === userId;
                    const isAssignedPanitia = room.assignedGuardId === userId || room.assignedCallerId === userId || room.assignedCaller2Id === userId;
                    
                    const isPanitiaThirdParty = await db.query.formPanitiaDanPengurus.findFirst({
                        where: eq(formPanitiaDanPengurus.generusId, userId || "")
                    });

                    if (!isPengirim && !isPenerima && !isAssignedPanitia && !isPanitiaThirdParty) {
                        return NextResponse.json({ error: "Anda tidak ditugaskan di ruangan ini." }, { status: 403 });
                    }
                    
                    if (isPengirim || isPenerima) {
                        if (isPengirim && hasilPengirim) {
                            await db.update(mandiriPemilihan).set({ hasilPengirim }).where(eq(mandiriPemilihan.id, sel.id));
                        }
                        if (isPenerima && hasilPenerima) {
                            await db.update(mandiriPemilihan).set({ hasilPenerima }).where(eq(mandiriPemilihan.id, sel.id));
                        }

                        // Check if both results are now filled
                        const updatedSel = await db.query.mandiriPemilihan.findFirst({
                            where: eq(mandiriPemilihan.id, sel.id)
                        });

                        const hasFinished = updatedSel && 
                            updatedSel.hasilPengirim && 
                            updatedSel.hasilPengirim !== "Menunggu" && 
                            updatedSel.hasilPenerima && 
                            updatedSel.hasilPenerima !== "Menunggu";

                        if (hasFinished) {
                            // 1. Mark the pemilihan as "Selesai"
                            await db.update(mandiriPemilihan)
                                .set({ status: "Selesai" })
                                .where(eq(mandiriPemilihan.id, sel.id));

                            // 2. Clean up matches if both chose "Lanjut"
                            try {
                                const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                                await handleMatchCleanup(sel.id);
                            } catch (cleanupErr) {
                                console.error("Failed to run match cleanup:", cleanupErr);
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

                            // 4. Trigger Pusher update
                            try {
                                await pusherServer.trigger("taaruf-channel", "room-changed", {
                                    roomId,
                                    action: "clear",
                                });
                            } catch (pusherErr) {
                                console.error("Pusher trigger error:", pusherErr);
                            }

                            return NextResponse.json({ success: true, finished: true, message: "Sesi selesai, ruangan dikosongkan" });
                        }

                        // If not finished yet, trigger Pusher taaruf-changed so the other party sees the update
                        try {
                            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                                type: "hasil-rr-updated",
                                pemilihanId: sel.id,
                                generusId: userId
                            });
                        } catch (pusherErr) {
                            console.error("Pusher hasil-rr trigger error:", pusherErr);
                        }

                        return NextResponse.json({ success: true, finished: false, message: "Hasil disimpan" });
                    } else if (isAssignedPanitia || isPanitiaThirdParty) {
                        const updates: any = {};
                        if (hasilPengirim) updates.hasilPengirim = hasilPengirim;
                        if (hasilPenerima) updates.hasilPenerima = hasilPenerima;
                        
                        if (Object.keys(updates).length > 0) {
                            await db.update(mandiriPemilihan).set(updates).where(eq(mandiriPemilihan.id, sel.id));
                        }
                        // Allow Panitia to fall through and clear the room
                    }
                }
                // If it was panitia, it will fall through to clear the room
            }

            if (room?.pemilihanId) {
                // Fetch existing pemilihan to preserve results if not provided
                const existingPemilihan = await db.query.mandiriPemilihan.findFirst({
                    where: eq(mandiriPemilihan.id, room.pemilihanId)
                });
                
                // Mark as Selesai and update results
                await db.update(mandiriPemilihan)
                    .set({ 
                        status: "Selesai",
                        hasilPengirim: hasilPengirim !== undefined ? (hasilPengirim || null) : (existingPemilihan?.hasilPengirim || null),
                        hasilPenerima: hasilPenerima !== undefined ? (hasilPenerima || null) : (existingPemilihan?.hasilPenerima || null)
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
            if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
                return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk mengembalikan pasangan ke antrean." }, { status: 403 });
            }

            const room = await db.query.mandiriRooms.findFirst({
                where: eq(mandiriRooms.id, roomId)
            });

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
