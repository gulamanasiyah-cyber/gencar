import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fcmTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { phone, token } = await request.json();
    if (!phone || !token) {
      return NextResponse.json({ error: "Missing phone or token" }, { status: 400 });
    }

    // Clean and normalize phone number
    let cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const db = getDb();

    // Check if token already exists
    const existing = await db.query.fcmTokens.findFirst({
      where: eq(fcmTokens.token, token)
    });

    if (existing) {
      // Update phone if it changed
      if (existing.phone !== cleanPhone) {
        await db.update(fcmTokens)
          .set({ phone: cleanPhone })
          .where(eq(fcmTokens.id, existing.id));
        console.log(`Updated FCM token owner phone: ${existing.phone} -> ${cleanPhone}`);
      }
    } else {
      // Insert new token
      await db.insert(fcmTokens).values({
        id: uuidv4(),
        phone: cleanPhone,
        token
      });
      console.log(`Registered new FCM token for phone: ${cleanPhone}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("FCM registration error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
