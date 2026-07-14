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

  // Check for WhatsApp Business API
  const waApiKey = process.env.WHATSAPP_API_KEY;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1123675760836996";
  const waTemplateLang = process.env.WHATSAPP_TEMPLATE_LANG || "id";

  if (!waApiKey || !waPhoneId) {
    console.error("WhatsApp Business API credentials (WHATSAPP_API_KEY or WHATSAPP_PHONE_NUMBER_ID) are missing.");
    return;
  }

  try {
    console.log("Using WhatsApp Business API (Meta Cloud API)...");
    
    // Extract name (first bold text) and nomor urut (first (*#...*) pattern)
    const nameMatch = msg.match(/\*([^*]+)\*/);
    const nomorUrutMatch = msg.match(/\(\*#([^*]+)\*\)/);
    
    let payload: any;
    
    if (nameMatch && nomorUrutMatch) {
      const nama = nameMatch[1].trim();
      const nomorUrut = nomorUrutMatch[1].trim();
      console.log(`Sending panggilan_taaruf template. Name: ${nama}, No Urut: ${nomorUrut}`);
      
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTarget,
        type: "template",
        template: {
          name: "panggilan_taaruf",
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
      console.log("No template pattern matched (missing name or nomorUrut). Sending as freeform text message.");
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
    }
    return resData;
  } catch (err) {
    console.error("Failed to send via WhatsApp Business API:", err);
  }
};
