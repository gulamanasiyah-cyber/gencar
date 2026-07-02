export const sendOneSignalNotification = async ({
  headings,
  contents,
  externalUserIds,
  url
}: {
  headings: string;
  contents: string;
  externalUserIds?: string[];
  url?: string;
}) => {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "71a59cfc-3709-444a-8622-146294e947be";
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!apiKey || apiKey === "your_onesignal_rest_api_key_here") {
    console.warn("OneSignal REST API Key is missing or default placeholder. Skipping push notification.");
    return;
  }

  try {
    const payload: any = {
      app_id: appId,
      headings: { en: headings, id: headings },
      contents: { en: contents, id: contents },
    };

    if (url) {
      payload.url = url;
    }

    if (externalUserIds && externalUserIds.length > 0) {
      // Clean and normalize target external IDs (phone numbers)
      const cleanIds = externalUserIds
        .map(id => id.replace(/\D/g, "").trim())
        .map(id => {
          if (id.startsWith("0")) {
            return "62" + id.slice(1);
          }
          return id;
        })
        .filter(Boolean);

      if (cleanIds.length > 0) {
        payload.include_aliases = {
          external_id: cleanIds
        };
        payload.target_channel = "push";
      } else {
        payload.included_segments = ["Subscribed Users"];
      }
    } else {
      payload.included_segments = ["Subscribed Users"];
    }

    console.log("=== sendOneSignalNotification Triggered ===");
    console.log(`- Target External User IDs: ${JSON.stringify(externalUserIds)}`);

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("OneSignal push API result:", data);
    return data;
  } catch (error) {
    console.error("Failed to send OneSignal push notification:", error);
  }
};
