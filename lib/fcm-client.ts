import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gencar-340ef",
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gencar-340ef"}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function registerFCM(phone: string) {
  if (typeof window === "undefined") return;

  // Check if browser supports notifications and service worker
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return;
  }
  if (!("serviceWorker" in navigator)) {
    console.warn("This browser does not support Service Workers.");
    return;
  }

  try {
    // Request notification permission if not granted
    let permission = Notification.permission;
    if (permission === "default") {
      console.log("Requesting browser notification permission...");
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Notification permission was denied.");
      return;
    }

    // Initialize Firebase client app
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    // Register custom service worker file for FCM background notifications with query params
    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey || "")}&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId || "")}&appId=${encodeURIComponent(firebaseConfig.appId || "")}&projectId=${encodeURIComponent(firebaseConfig.projectId || "")}`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: "/",
    });

    console.log("FCM Service Worker registered successfully scope:", registration.scope);

    // Retrieve FCM token
    console.log("Using VAPID Key:", process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log("Retrieved FCM Token:", token);
      
      // Send token to our server mapping
      const res = await fetch("/api/fcm/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, token }),
      });

      const resData = await res.json();
      if (resData.success) {
        console.log("FCM token successfully registered on server.");
      } else {
        console.error("Failed to register FCM token on server:", resData.error);
      }
    } else {
      console.warn("No FCM registration token available. Request permission to generate one.");
    }
  } catch (err) {
    console.error("Error during FCM registration:", err);
  }
}
