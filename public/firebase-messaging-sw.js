/* eslint-disable no-undef */
importScripts("/firebase-app-compat.js");
importScripts("/firebase-messaging-compat.js");

// Parse Firebase configuration from the registration URL query parameters
const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get("apiKey");
const messagingSenderId = urlParams.get("messagingSenderId");
const appId = urlParams.get("appId");
const projectId = urlParams.get("projectId") || "gencar-340ef";

// Pesan dikirim data-only ({title, body, link, tag}); tampilan dibuat di sini
// supaya konsisten dan tidak muncul ganda. Pesan lama berformat `notification`
// tetap didukung lewat fallback.
function buildNotification(payload) {
  const data = payload.data || {};
  const n = payload.notification || {};
  const title = data.title || n.title || "Notifikasi GENCAR";
  return {
    title,
    options: {
      body: data.body || n.body || "",
      icon: "/img/logo-jb2.png",
      badge: "/img/logo-jb2.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      lang: "id",
      actions: [{ action: "open", title: "Buka" }],
      data: { click_action: data.link || "/mandiri/katalog" },
    },
  };
}

if (apiKey && messagingSenderId && appId) {
  firebase.initializeApp({
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    messagingSenderId,
    appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // Pesan berformat `notification` sudah ditampilkan otomatis oleh FCM.
    if (payload.notification && !payload.data) return;
    const { title, options } = buildNotification(payload);
    self.registration.showNotification(title, options);
  });
} else {
  console.warn("[firebase-messaging-sw.js] Missing config parameters in URL query string.");
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.click_action || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === target && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
