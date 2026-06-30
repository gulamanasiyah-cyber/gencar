import { db } from "./db";
import { mandiriPemilihan, mandiriKunjungan, mandiriRooms } from "./schema";
import { eq, and, or, sql } from "drizzle-orm";
import { pusherServer } from "./pusher";

export async function handleMatchCleanup(pemilihanId: string) {
  try {
    // 1. Get election details
    const selection = await db.query.mandiriPemilihan.findFirst({
      where: eq(mandiriPemilihan.id, pemilihanId)
    });

    if (!selection) return;

    // 2. Check if both results are 'Lanjut'
    if (selection.hasilPengirim === "Lanjut" && selection.hasilPenerima === "Lanjut") {
      const p1 = selection.pengirimId;
      const p2 = selection.penerimaId;

      console.log(`[MATCH CLEANUP] Match detected! Reverting all other active queues/rooms for ${p1} and ${p2}`);

      // 3. Remove from queue (Daftar Antrean) for both participants
      // Find all other 'Menunggu' selections involving p1 or p2
      const activeQueues = await db.select()
        .from(mandiriPemilihan)
        .where(and(
          eq(mandiriPemilihan.status, "Menunggu"),
          sql`id != ${pemilihanId}`,
          or(
            eq(mandiriPemilihan.pengirimId, p1),
            eq(mandiriPemilihan.penerimaId, p1),
            eq(mandiriPemilihan.pengirimId, p2),
            eq(mandiriPemilihan.penerimaId, p2)
          )
        ));

      for (const q of activeQueues) {
        // Delete associated kunjungan records
        await db.delete(mandiriKunjungan)
          .where(eq(mandiriKunjungan.pemilihanId, q.id));

        // Delete the election itself
        await db.delete(mandiriPemilihan)
          .where(eq(mandiriPemilihan.id, q.id));

        // Broadcast Pusher update
        try {
          await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
            type: "delete",
            pengirimId: q.pengirimId,
            penerimaId: q.penerimaId,
          });
        } catch (pusherErr) {
          console.error("Pusher match cleanup delete trigger error:", pusherErr);
        }
      }

      // 4. Vacate any other rooms (Tunggu Dalam / Sedang Berjalan)
      const activeRooms = await db.select({
        roomId: mandiriRooms.id,
        pemilihanId: mandiriRooms.pemilihanId,
      })
      .from(mandiriRooms)
      .innerJoin(mandiriPemilihan, eq(mandiriRooms.pemilihanId, mandiriPemilihan.id))
      .where(and(
        eq(mandiriRooms.status, "Terisi"),
        sql`${mandiriRooms.pemilihanId} != ${pemilihanId}`,
        or(
          eq(mandiriPemilihan.pengirimId, p1),
          eq(mandiriPemilihan.penerimaId, p1),
          eq(mandiriPemilihan.pengirimId, p2),
          eq(mandiriPemilihan.penerimaId, p2)
        )
      ));

      for (const r of activeRooms) {
        if (r.pemilihanId) {
          // Mark the selection as "Selesai"
          await db.update(mandiriPemilihan)
            .set({ status: "Selesai" })
            .where(eq(mandiriPemilihan.id, r.pemilihanId));
        }

        // Vacate the room
        await db.update(mandiriRooms)
          .set({
            pemilihanId: null,
            timGambuhId: null,
            status: "Kosong",
            startedAt: null,
            updatedAt: sql`(datetime('now'))`
          })
          .where(eq(mandiriRooms.id, r.roomId));

        // Broadcast Pusher room update
        try {
          await pusherServer.trigger("taaruf-channel", "room-changed", {
            roomId: r.roomId,
            action: "clear",
          });
        } catch (pusherErr) {
          console.error("Pusher match cleanup room clear trigger error:", pusherErr);
        }
      }
    }
  } catch (error) {
    console.error("Failed handleMatchCleanup:", error);
  }
}
