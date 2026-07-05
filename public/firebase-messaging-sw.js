/* eslint-disable no-undef */
importScripts("/firebase-app-compat.js");
importScripts("/firebase-messaging-compat.js");

// Parse Firebase configuration from the registration URL query parameters
const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get("apiKey");
const messagingSenderId = urlParams.get("messagingSenderId");
const appId = urlParams.get("appId");
const projectId = urlParams.get("projectId") || "gencar-340ef";

if (apiKey && messagingSenderId && appId) {
  firebase.initializeApp({
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    messagingSenderId,
    appId,
  });

  const messaging = firebase.messaging();

  // Handle background notifications
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);
    const notificationTitle = payload.notification.title || "Notifikasi Gencar";
    const notificationOptions = {
      body: payload.notification.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        click_action: "/mandiri/katalog",
      },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn("[firebase-messaging-sw.js] Missing config parameters in URL query string.");
}

// Handle notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(clickAction) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
