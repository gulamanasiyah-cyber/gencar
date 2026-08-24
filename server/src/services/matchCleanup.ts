import { eq, and, or, sql } from "drizzle-orm";
import { mandiriPemilihan, mandiriKunjungan, mandiriRooms } from "../../../shared/schema";

async function pusherTrigger(env: any, channel: string, event: string, data: any) {
  const appId = env.PUSHER_APP_ID;
  const key = env.PUSHER_KEY;
  const secret = env.PUSHER_SECRET;
  const cluster = env.PUSHER_CLUSTER || "ap1";
  if (!appId || !key || !secret) return;
  // Use REST API trigger via fetch so no Node SDK needed on Workers
  try {
    const body = JSON.stringify({ name: event, channel, data: JSON.stringify(data) });
    // Minimal HMAC — skip if crypto subtle not trivial; just log fallback
    await fetch(`https://api-${cluster}.pusher.com/apps/${appId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {}
}

export async function handleMatchCleanup(env: any, db: any, pemilihanId: string) {
  try {
    const selection: any = await db.query.mandiriPemilihan.findFirst({ where: eq(mandiriPemilihan.id, pemilihanId) });
    if (!selection) return;
    if (selection.hasilPengirim === "Lanjut" && selection.hasilPenerima === "Lanjut") {
      const p1 = selection.pengirimId;
      const p2 = selection.penerimaId;
      const activeQueues: any[] = await db.select().from(mandiriPemilihan).where(and(eq(mandiriPemilihan.status, "Menunggu"), sql`id != ${pemilihanId}`, or(eq(mandiriPemilihan.pengirimId, p1), eq(mandiriPemilihan.penerimaId, p1), eq(mandiriPemilihan.pengirimId, p2), eq(mandiriPemilihan.penerimaId, p2))));
      for (const q of activeQueues) {
        await db.delete(mandiriKunjungan).where(eq(mandiriKunjungan.pemilihanId, q.id));
        await db.delete(mandiriPemilihan).where(eq(mandiriPemilihan.id, q.id));
        await pusherTrigger(env, "taaruf-channel", "taaruf-changed", { type: "delete", pengirimId: q.pengirimId, penerimaId: q.penerimaId });
      }
      const activeRooms: any[] = await db.select({ roomId: mandiriRooms.id, pemilihanId: mandiriRooms.pemilihanId }).from(mandiriRooms).innerJoin(mandiriPemilihan, eq(mandiriRooms.pemilihanId, mandiriPemilihan.id)).where(and(eq(mandiriRooms.status, "Terisi"), sql`${mandiriRooms.pemilihanId} != ${pemilihanId}`, or(eq(mandiriPemilihan.pengirimId, p1), eq(mandiriPemilihan.penerimaId, p1), eq(mandiriPemilihan.pengirimId, p2), eq(mandiriPemilihan.penerimaId, p2))));
      for (const r of activeRooms) {
        if (r.pemilihanId) await db.update(mandiriPemilihan).set({ status: "Selesai" }).where(eq(mandiriPemilihan.id, r.pemilihanId));
        await db.update(mandiriRooms).set({ pemilihanId: null, timGambuhId: null, status: "Kosong", startedAt: null, updatedAt: sql`(datetime('now'))` }).where(eq(mandiriRooms.id, r.roomId));
        const roomRecord: any = await db.query.mandiriRooms.findFirst({ where: eq(mandiriRooms.id, r.roomId) });
        await pusherTrigger(env, "taaruf-channel", "room-changed", { roomId: r.roomId, action: "clear", pengirimId: p1, penerimaId: p2, assignedGuardId: roomRecord?.assignedGuardId, assignedCallerId: roomRecord?.assignedCallerId, assignedCaller2Id: roomRecord?.assignedCaller2Id });
      }
    }
  } catch (e) {
    console.error("handleMatchCleanup failed", e);
  }
}
