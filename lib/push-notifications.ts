import { desc, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { pushNotifications } from "./schema";
import { ensurePushNotificationSchema } from "./mandiri-schema";
import { sendFCMToTokens } from "./fcm";

/** Notifikasi admin dianggap masih berlaku untuk pendaftar baru selama N hari. */
const WELCOME_WINDOW_DAYS = 7;

export const NOTIF_LINK = "/mandiri/katalog";

/** Kirim notifikasi admin terbaru (yang masih berlaku) ke satu perangkat baru. */
export async function sendLatestNotificationToToken(device: { id: string; token: string }) {
  await ensurePushNotificationSchema();
  const db = getDb();
  const rows = await db
    .select()
    .from(pushNotifications)
    .where(gte(pushNotifications.createdAt, sql`datetime('now', ${`-${WELCOME_WINDOW_DAYS} days`})`))
    .orderBy(desc(pushNotifications.createdAt))
    .limit(1);
  const latest = rows[0];
  if (!latest) return;
  await sendFCMToTokens([device], {
    title: latest.judul,
    body: latest.deskripsi,
    link: NOTIF_LINK,
    tag: `notif-${latest.id}`,
  });
}
