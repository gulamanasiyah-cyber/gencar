"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import GlobalLoading from "@/app/loading";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Keperluan Ulang',
          text: data.error || 'Terjadi kesalahan'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Password default telah dikirim ke email Anda. Silakan cek kotak masuk/spam Anda.',
      }).then(() => {
        window.location.href = "/login";
      });

    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Gagal menghubungi server.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {loading && <GlobalLoading />}
      <div className="auth-card">
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1, color: '#000' }}>GENCAR</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen JB2</p>
          </div>
        </div>

        <h2 className="auth-title">Lupa Password</h2>
        <p className="auth-subtitle">Masukkan email terdaftar Anda, dan kami akan mengirimkan password default ke email Anda.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Terdaftar <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="contoh@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "16px" }}
          >
            {loading ? "Memproses..." : "Kirim Password ke Email"}
          </button>
          
          <div className="auth-footer" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            Batal mengubah?{" "}
            <Link href="/login" style={{ fontWeight: 600 }}>
              Masuk kembali
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
