"use client";
export const runtime = "edge";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>JB2.ID</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen JB2</p>
          </div>
        </div>

        <div style={{ padding: "20px 0" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 64, height: 64, color: "#f59e0b", margin: "0 auto 16px" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ fontSize: 24, marginBottom: 12, color: "#0f172a" }}>Menunggu Persetujuan</h2>
          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
            Akun Anda telah berhasil didaftarkan dan saat ini sedang dalam proses peninjauan oleh Admin. 
            Anda akan dapat mengakses sistem setelah peran "Generus" diberikan kepada akun Anda.
          </p>
        </div>

        <button 
          className="btn btn-secondary btn-full btn-lg" 
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? "Keluar..." : "Keluar dari Akun"}
        </button>
      </div>
    </div>
  );
}
