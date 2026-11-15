export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { fcmTokens, pushNotifications } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { ensurePushNotificationSchema } from "@/lib/mandiri-schema";
import { broadcastFCM } from "@/lib/fcm";
import { NOTIF_LINK } from "@/lib/push-notifications";

const ALLOWED_ROLES = ["admin", "admin_romantic_room"];
const MAX_JUDUL = 65;
const MAX_DESKRIPSI = 240;

async function authorize() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) return null;
  return session;
}

export async function GET() {
  try {
    if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensurePushNotificationSchema();
    const [history, devices] = await Promise.all([
      db.select().from(pushNotifications).orderBy(desc(pushNotifications.createdAt)).limit(100),
      db.select({ total: sql<number>`count(*)`, users: sql<number>`count(distinct ${fcmTokens.phone})` }).from(fcmTokens),
    ]);
    return NextResponse.json({
      history,
      deviceCount: Number(devices[0]?.total || 0),
      userCount: Number(devices[0]?.users || 0),
    });
  } catch (error) {
    console.error("GET notifikasi error:", error);
    return NextResponse.json({ error: "Gagal mengambil notifikasi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authorize();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const judul = String(body?.judul || "").trim();
    const deskripsi = String(body?.deskripsi || "").trim();
    if (!judul || !deskripsi) {
      return NextResponse.json({ error: "Judul dan deskripsi wajib diisi" }, { status: 400 });
    }
    if (judul.length > MAX_JUDUL || deskripsi.length > MAX_DESKRIPSI) {
      return NextResponse.json({ error: `Maksimal ${MAX_JUDUL} karakter judul dan ${MAX_DESKRIPSI} karakter deskripsi` }, { status: 400 });
    }

    await ensurePushNotificationSchema();
    const id = uuidv4();
    // Simpan dulu: perangkat yang mendaftar setelah ini menerima notifikasi ini juga.
    await db.insert(pushNotifications).values({
      id,
      judul,
      deskripsi,
      createdBy: session.name || session.userId || null,
    });

    const result = await broadcastFCM({ title: judul, body: deskripsi, link: NOTIF_LINK, tag: `notif-${id}` });
    await db.update(pushNotifications)
      .set({ sentCount: result.sent, failedCount: result.failed })
      .where(eq(pushNotifications.id, id));

    return NextResponse.json({ success: true, id, ...result });
  } catch (error) {
    console.error("POST notifikasi error:", error);
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    await ensurePushNotificationSchema();
    await db.delete(pushNotifications).where(eq(pushNotifications.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE notifikasi error:", error);
    return NextResponse.json({ error: "Gagal menghapus notifikasi" }, { status: 500 });
  }
}
