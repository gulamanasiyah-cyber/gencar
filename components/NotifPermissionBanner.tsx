"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "notif_banner_dismissed_at";
const DISMISS_DAYS = 3;

export default function NotifPermissionBanner({ phone }: { phone?: string | null }) {
  const [state, setState] = useState<"hidden" | "ask" | "denied">("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!phone || typeof window === "undefined" || !("Notification" in window)) return;

    // Izin sudah diberikan: cukup sinkronkan token tanpa menampilkan banner.
    if (Notification.permission === "granted") {
      import("@/lib/fcm-client").then(({ registerFCM }) => registerFCM(phone, false)).catch(() => {});
      return;
    }

    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < DISMISS_DAYS * 86400000) return;
    } catch {}

    setState(Notification.permission === "denied" ? "denied" : "ask");
  }, [phone]);

  if (state === "hidden") return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setState("hidden");
  };

  const enable = async () => {
    if (!phone) return;
    setBusy(true);
    try {
      const { registerFCM } = await import("@/lib/fcm-client");
      await registerFCM(phone, true);
    } finally {
      setBusy(false);
      if (Notification.permission === "granted") setState("hidden");
      else if (Notification.permission === "denied") setState("denied");
    }
  };

  return (
    <div
      role="alert"
      style={{
        position: "fixed", top: "max(12px, env(safe-area-inset-top))", left: 12, right: 12,
        margin: "0 auto", maxWidth: 480, zIndex: 100000,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "12px 14px",
        background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, color: "#7c2d12",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        animation: "notifBannerIn .35s ease-out",
      }}
    >
      <style>{`@keyframes notifBannerIn{from{transform:translateY(-120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <Bell size={20} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200, fontSize: 14, lineHeight: 1.4 }}>
        {state === "ask" ? (
          <>
            <strong>Aktifkan notifikasi</strong> agar tidak ketinggalan pengumuman dan info terbaru
            di perangkat Anda.
          </>
        ) : (
          <>
            <strong>Notifikasi diblokir.</strong> Buka pengaturan situs di browser (ikon gembok di
            samping alamat) lalu ubah Notifikasi menjadi <em>Izinkan</em>, kemudian muat ulang halaman.
          </>
        )}
      </div>
      {state === "ask" && (
        <button
          onClick={enable}
          disabled={busy}
          style={{
            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#ea580c", color: "white", fontWeight: 600, fontSize: 14,
          }}
        >
          {busy ? "Memproses..." : "Aktifkan"}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Tutup"
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 4 }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
