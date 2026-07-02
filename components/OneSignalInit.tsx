"use client";

import { useEffect } from "react";

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!document.getElementById("onesignal-sdk")) {
        const script = document.createElement("script");
        script.id = "onesignal-sdk";
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
          const OneSignal = (window as any).OneSignal || [];
          OneSignal.push(async () => {
            await OneSignal.init({
              appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "71a59cfc-3709-444a-8622-146294e947be",
              allowLocalhostAsSecureDomain: true,
              notifyButton: {
                enable: true,
                position: "bottom-left",
              },
            });

            console.log("OneSignal Initialized. Permission status:", OneSignal.Notifications.permission);

            // Auto prompt for notification permission if not yet decided
            if (OneSignal.Notifications.permission === "default") {
              try {
                console.log("Requesting OneSignal notification permission...");
                await OneSignal.Notifications.requestPermission();
              } catch (e) {
                console.error("OneSignal permission request failed:", e);
              }
            }
          });
        };
      }
    }
  }, []);

  return null;
}
