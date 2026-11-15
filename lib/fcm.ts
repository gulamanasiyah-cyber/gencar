import * as jose from "jose";
import { getDb } from "./db";
import { fcmTokens } from "./schema";
import { eq } from "drizzle-orm";

// Cache the access token and expiration time to minimize token request overhead
let cachedAccessToken: string | null = null;
let tokenExpiryTime = 0;

async function getGoogleAccessToken() {
  const projectId = process.env.FIREBASE_PROJECT_ID || "gencar-340ef";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.warn("FCM config missing (FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY). Skipping push notification.");
    return null;
  }

  // Handle line breaks in private key if loaded as string from env
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < tokenExpiryTime - 60) {
    return cachedAccessToken;
  }

  try {
    const jwt = await new jose.SignJWT({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
      .setProtectedHeader({ alg: "RS256" })
      .sign(await jose.importPKCS8(privateKey, "RS256"));

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google OAuth2 error: ${data.error_description || data.error}`);
    }

    cachedAccessToken = data.access_token;
    tokenExpiryTime = now + (data.expires_in || 3600);
    return cachedAccessToken;
  } catch (err) {
    console.error("Failed to generate Google access token for FCM:", err);
    return null;
  }
}

export type PushContent = {
  title: string;
  body: string;
  /** Halaman yang dibuka saat notifikasi diklik. */
  link?: string;
  /** Notifikasi dengan tag sama saling menggantikan di perangkat. */
  tag?: string;
};

type TokenRow = { id: string; token: string };

const SEND_CONCURRENCY = 20;

/**
 * Kirim satu konten ke banyak token FCM. Pesan bersifat data-only sehingga
 * tampilan (ikon, getar, tombol) sepenuhnya dikontrol service worker dan tidak
 * muncul ganda. Token yang sudah tidak valid otomatis dihapus dari DB.
 */
export async function sendFCMToTokens(
  tokens: TokenRow[],
  content: PushContent
): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return { sent: 0, failed: tokens.length };

  const projectId = process.env.FIREBASE_PROJECT_ID || "gencar-340ef";
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const db = getDb();
  let sent = 0;
  let failed = 0;

  const sendOne = async (item: TokenRow) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: item.token,
            data: {
              title: content.title,
              body: content.body,
              link: content.link || "/mandiri/katalog",
              tag: content.tag || "",
            },
            webpush: { headers: { Urgency: "high", TTL: "86400" } },
          },
        }),
      });
      const resData: any = await res.json();
      if (resData.error) {
        failed++;
        const code = resData.error.details?.[0]?.errorCode;
        if (code === "UNREGISTERED" || resData.error.status === "NOT_FOUND") {
          await db.delete(fcmTokens).where(eq(fcmTokens.id, item.id));
        } else {
          console.error(`FCM send error for token ${item.id}:`, resData.error);
        }
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      console.error(`Failed to send FCM to token ID ${item.id}:`, err);
    }
  };

  // Batasi paralelisme agar aman di runtime Worker (batas subrequest/koneksi).
  for (let i = 0; i < tokens.length; i += SEND_CONCURRENCY) {
    await Promise.all(tokens.slice(i, i + SEND_CONCURRENCY).map(sendOne));
  }
  return { sent, failed };
}

export async function sendFCMNotification(phone: string, title: string, body: string) {
  if (!phone) return;

  let cleanPhone = phone.trim().replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }

  const db = getDb();
  const tokensList = await db.select({ id: fcmTokens.id, token: fcmTokens.token })
    .from(fcmTokens)
    .where(eq(fcmTokens.phone, cleanPhone));

  await sendFCMToTokens(tokensList, { title, body });
}

/** Kirim ke seluruh perangkat yang terdaftar (broadcast dari admin). */
export async function broadcastFCM(content: PushContent) {
  const db = getDb();
  const tokensList = await db.select({ id: fcmTokens.id, token: fcmTokens.token }).from(fcmTokens);
  return { total: tokensList.length, ...(await sendFCMToTokens(tokensList, content)) };
}
