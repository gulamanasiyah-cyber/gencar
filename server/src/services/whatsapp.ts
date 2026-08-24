/** Ported from lib/whatsapp.ts + lib/fcm.ts — Workers-safe via fetch + env param */
export async function sendFCMNotification(env: any, phone: string, title: string, body: string) {
  if (!phone) return;
  let cleanPhone = phone.trim().replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
  // dynamic import of jose already available; avoid top-level side effects
  const { default: _ } = {} as any;
  try {
    const { getDb } = await import("../utils/db");
    const { fcmTokens } = await import("../../../shared/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb(env);
    const tokensList: any[] = await db.select().from(fcmTokens).where(eq(fcmTokens.phone, cleanPhone));
    if (tokensList.length === 0) return;
    const accessToken = await getGoogleAccessToken(env);
    if (!accessToken) return;
    const projectId = env.FIREBASE_PROJECT_ID || "gencar-340ef";
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    await Promise.all(tokensList.map(async (item: any) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { token: item.token, notification: { title, body }, webpush: { notification: { icon: "/favicon.ico", badge: "/favicon.ico", click_action: "/mandiri/katalog" } } } }),
        });
        const data: any = await res.json();
        if (data.error) {
          if (data.error.status === "INVALID_ARGUMENT" || String(data.error.message).includes("UNREGISTERED") || data.error.details?.[0]?.errorCode === "UNREGISTERED") {
            await db.delete(fcmTokens).where(eq(fcmTokens.id, item.id));
          }
        }
      } catch {}
    }));
  } catch {}
}

let cachedAccessToken: string | null = null;
let tokenExpiryTime = 0;
async function getGoogleAccessToken(env: any): Promise<string | null> {
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  let privateKey: string | undefined = env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) return null;
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < tokenExpiryTime - 60) return cachedAccessToken;
  try {
    const jose = await import("jose");
    const jwt = await new jose.SignJWT({ iss: clientEmail, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now }).setProtectedHeader({ alg: "RS256" }).sign(await jose.importPKCS8(privateKey, "RS256"));
    const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
    const data: any = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    cachedAccessToken = data.access_token;
    tokenExpiryTime = now + (data.expires_in || 3600);
    return cachedAccessToken;
  } catch { return null; }
}

export async function sendWhatsApp(env: any, target: string, msg: string) {
  if (!target) return;
  let cleanTarget = target.replace(/\D/g, "");
  if (cleanTarget.startsWith("0")) cleanTarget = "62" + cleanTarget.slice(1);
  if (!cleanTarget.startsWith("62")) return;

  // FCM dual dispatch
  try {
    const cleanBody = msg.replace(/\*/g, "");
    sendFCMNotification(env, cleanTarget, "Panggilan Taaruf! 📢", cleanBody).catch(() => {});
  } catch {}

  const waApiKey = env.WHATSAPP_API_KEY;
  const waPhoneId = env.WHATSAPP_PHONE_NUMBER_ID || "1123675760836996";
  const waTemplateLang = env.WHATSAPP_TEMPLATE_LANG || "id";

  if (waApiKey && waPhoneId) {
    try {
      let nama = "";
      const kepadaMatch = msg.match(/Kepada:\s*\*([^*]+)\*/i);
      if (kepadaMatch) nama = kepadaMatch[1].trim();
      else {
        const m = msg.match(/\*([^*]+)\*/);
        if (m) nama = m[1].trim();
      }
      let nomorUrut = "";
      const noUrutMatch = msg.match(/\(\*#([^*]+)\*\)/) || msg.match(/\(#\s*([^)]+)\)/);
      if (noUrutMatch) nomorUrut = noUrutMatch[1].trim();
      let payload: any;
      if (nama && nomorUrut) {
        payload = { messaging_product: "whatsapp", recipient_type: "individual", to: cleanTarget, type: "template", template: { name: "panggilan_taaruf", language: { code: waTemplateLang }, components: [{ type: "body", parameters: [{ type: "text", text: nama }, { type: "text", text: nomorUrut }] }] } };
      } else {
        payload = { messaging_product: "whatsapp", recipient_type: "individual", to: cleanTarget, type: "text", text: { body: msg } };
      }
      const res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${waApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData: any = await res.json();
      if (res.ok && !resData.error && Array.isArray(resData.messages) && resData.messages.length > 0) return resData;
    } catch {}
  }

  const rawFonnteTokens = [env.FONNTE_TOKEN, env.FONNTE_TOKEN_2 || env.FONNTE_TOKEN_BACKUP || "nqYfKQbi3gemc59g4CqX", env.FONNTE_API_KEY].filter((t: any, i: number, arr: any[]) => Boolean(t) && arr.indexOf(t) === i) as string[];
  for (let i = 0; i < rawFonnteTokens.length; i++) {
    const token = rawFonnteTokens[i];
    try {
      const formData = new URLSearchParams();
      formData.append("target", cleanTarget);
      formData.append("message", msg);
      formData.append("countryCode", "62");
      const res = await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: token }, body: formData });
      const resData: any = await res.json();
      if (resData.status) return resData;
    } catch {}
  }
}
