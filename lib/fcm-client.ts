import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gencar-340ef",
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gencar-340ef"}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// prompt=false: jangan memunculkan dialog izin otomatis (harus lewat klik pengguna).
export async function registerFCM(phone: string, prompt = true) {
  if (typeof window === "undefined") return;

  // Lewati jika konfigurasi Firebase belum diisi di environment
  if (!firebaseConfig.apiKey || !firebaseConfig.appId || !firebaseConfig.messagingSenderId) {
    return;
  }

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
    if (permission === "default" && prompt) {
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

    // Saat aplikasi sedang dibuka, FCM tidak menampilkan apa pun otomatis: tampilkan manual.
    if (!(window as any).__fcmForegroundBound) {
      (window as any).__fcmForegroundBound = true;
      onMessage(messaging, (payload) => {
        const d: any = payload.data || {};
        const title = d.title || payload.notification?.title;
        if (!title) return;
        registration.showNotification(title, {
          body: d.body || payload.notification?.body || "",
          icon: "/img/logo-jb2.png",
          badge: "/img/logo-jb2.png",
          tag: d.tag || undefined,
          data: { click_action: d.link || "/mandiri/katalog" },
        } as NotificationOptions);
      });
    }

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
