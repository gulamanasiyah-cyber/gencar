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

  if (!cleanTarget.startsWith("62")) {
    console.error(`Invalid phone number target: ${target}`);
    return;
  }

  // Trigger FCM push notification concurrently (double/backup)
  try {
    const { sendFCMNotification } = await import("./fcm");
    const cleanBody = msg.replace(/\*/g, "");
    sendFCMNotification(cleanTarget, "Panggilan Taaruf! 📢", cleanBody)
      .catch((err) => console.error("Background FCM sending error:", err));
  } catch (fcmErr) {
    console.error("Failed to import FCM utility:", fcmErr);
  }

  // Check for WhatsApp Business API first
  const waApiKey = process.env.WHATSAPP_API_KEY;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1123675760836996";
  const waTemplateName = process.env.WHATSAPP_TEMPLATE_NAME || "panggilan_taaruf";
  const waTemplateLang = process.env.WHATSAPP_TEMPLATE_LANG || "en";

  if (waApiKey && waPhoneId) {
    try {
      console.log("Using WhatsApp Business API (Meta Cloud API)...");
      
      // Parse template parameters if applicable
      // Pattern: Amal sholihnya untuk *<NAMA>* (*#<NOMOR_URUT>*)...
      const match = msg.match(/Amal sholihnya untuk \*([^*]+)\* \(\*#([^*]+)\*\)/);
      
      let payload: any;
      
      if (match) {
        const nama = match[1].trim();
        const nomorUrut = match[2].trim();
        console.log(`Matched panggilan template pattern. Name: ${nama}, No Urut: ${nomorUrut}`);
        
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTarget,
          type: "template",
          template: {
            name: waTemplateName,
            language: {
              code: waTemplateLang
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: nama
                  },
                  {
                    type: "text",
                    text: nomorUrut
                  }
                ]
              }
            ]
          }
        };
      } else {
        console.log("No template pattern matched. Sending as freeform text message.");
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTarget,
          type: "text",
          text: {
            body: msg
          }
        };
      }

      const res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      console.log("WhatsApp Business API response:", JSON.stringify(resData, null, 2));
      
      if (resData.error) {
        console.error("WhatsApp Business API error details:", resData.error);
        // If it fails, we fall back to Evolution API/Fonnte
      } else {
        return resData;
      }
    } catch (err) {
      console.error("Failed to send via WhatsApp Business API:", err);
      // Fall through to other methods on error
    }
  }

  console.log(`- EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL}`);
  console.log(`- EVOLUTION_API_KEY: ${process.env.EVOLUTION_API_KEY ? "EXISTS" : "MISSING"}`);
  console.log(`- EVOLUTION_INSTANCE: ${process.env.EVOLUTION_INSTANCE}`);

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
  }  console.warn("No WhatsApp provider (WhatsApp Business API or Evolution API) is configured in environment variables or sending failed.");
};
