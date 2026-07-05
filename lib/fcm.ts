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

export async function sendFCMNotification(phone: string, title: string, body: string) {
  if (!phone) return;

  // Normalize phone
  let cleanPhone = phone.trim().replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }

  const db = getDb();

  // Find all tokens for this phone number
  const tokensList = await db.select()
    .from(fcmTokens)
    .where(eq(fcmTokens.phone, cleanPhone));

  if (tokensList.length === 0) {
    console.log(`No active FCM device tokens found for phone: ${cleanPhone}`);
    return;
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || "gencar-340ef";
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  console.log(`Sending FCM push notification to ${tokensList.length} device(s) for phone: ${cleanPhone}`);

  // Send notifications in parallel
  const sendPromises = tokensList.map(async (item) => {
    try {
      const payload = {
        message: {
          token: item.token,
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              click_action: "/mandiri/katalog",
            }
          }
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (resData.error) {
        console.error(`FCM send error for token ${item.id}:`, resData.error);
        // If token is invalid or unregistered, clean it from DB
        if (
          resData.error.status === "INVALID_ARGUMENT" ||
          resData.error.message?.includes("UNREGISTERED") ||
          resData.error.details?.[0]?.errorCode === "UNREGISTERED"
        ) {
          await db.delete(fcmTokens).where(eq(fcmTokens.id, item.id));
          console.log(`Deleted unregistered FCM token ID: ${item.id}`);
        }
      } else {
        console.log(`FCM notification sent successfully to token ID: ${item.id}`);
      }
    } catch (err) {
      console.error(`Failed to send FCM to token ID ${item.id}:`, err);
    }
  });

  await Promise.all(sendPromises);
}
