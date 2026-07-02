/**
 * Shared utility for sending WhatsApp notifications using Evolution API or Fonnte
 */
export const sendWhatsApp = async (target: string, msg: string) => {
  if (!target) return;

  // Clean and normalize target phone number
  let cleanTarget = target.replace(/\D/g, "");
  if (cleanTarget.startsWith("0")) {
    cleanTarget = "62" + cleanTarget.slice(1);
  }

  console.log("=== sendWhatsApp Triggered ===");
  console.log(`- Target: ${target} -> Cleaned: ${cleanTarget}`);
  console.log(`- EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL}`);
  console.log(`- EVOLUTION_API_KEY: ${process.env.EVOLUTION_API_KEY ? "EXISTS" : "MISSING"}`);
  console.log(`- EVOLUTION_INSTANCE: ${process.env.EVOLUTION_INSTANCE}`);

  if (!cleanTarget.startsWith("62")) {
    console.error(`Invalid phone number target: ${target}`);
    return;
  }

  // Anti-spam measures
  // 1. Unique message suffix to bypass fingerprint template filters
  const uniqueRef = Math.random().toString(36).substring(2, 7).toUpperCase();
  const finalMsg = `${msg}\n\n_(Ref: ${uniqueRef})_`;

  // 2. Random delay (2 - 6 seconds) to prevent burst sending
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomSleep = Math.floor(Math.random() * 4000) + 2000;
  console.log(`[Anti-Spam] Sleeping for ${randomSleep}ms before sending...`);
  await sleep(randomSleep);

  // 1. Try Evolution API first if URL, API Key, and Instance are configured
  const evoUrl = process.env.SERVER_URL || process.env.EVOLUTION_API_URL;
  const evoKey = process.env.AUTHENTICATION_API_KEY || process.env.EVOLUTION_API_KEY;
  const evoInstance = process.env.EVOLUTION_INSTANCE || "gencar";

  if (evoUrl && evoKey) {
    try {
      const baseUrl = evoUrl.replace(/\/+$/, "");
      const url = `${baseUrl}/message/sendText/${evoInstance}`;
      
      // Randomize the API delay option (1.5 - 3 seconds)
      const apiDelay = Math.floor(Math.random() * 1500) + 1500;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": evoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleanTarget,
          text: finalMsg,
          options: {
            delay: apiDelay,
            presence: "composing",
            linkPreview: false,
          },
        }),
      });

      const text = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(text);
      } catch {
        throw new Error(`Evolution API returned non-JSON response: ${text.substring(0, 100)}`);
      }
      console.log(`Evolution API notification sent to ${cleanTarget}:`, resData);
      return resData;
    } catch (err) {
      console.error(`Failed to send WhatsApp notification via Evolution API to ${cleanTarget}:`, err);
    }
  }

  // 2. Fallback to Fonnte if FONNTE_TOKEN is configured
  const fonnteToken = process.env.FONNTE_TOKEN;
  if (fonnteToken) {
    try {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: cleanTarget,
          message: finalMsg,
        }),
      });

      const resData = await res.json();
      console.log(`Fonnte notification sent to ${cleanTarget}:`, resData);
      return resData;
    } catch (err) {
      console.error(`Failed to send WhatsApp notification via Fonnte to ${cleanTarget}:`, err);
    }
  }

  console.warn("No WhatsApp provider (Evolution API or Fonnte) is configured in environment variables.");
};
