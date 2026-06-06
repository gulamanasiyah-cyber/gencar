"use client";



import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import GlobalLoading from "@/app/loading";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    if (newPassword !== confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Konfirmasi password tidak cocok' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Reset Password',
          text: data.error || 'Terjadi kesalahan'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Password Diperbarui!',
        text: 'Password Anda telah berhasil diubah. Mengarahkan ke halaman login...',
        timer: 2000,
        showConfirmButton: false
      });
      
      setTimeout(() => {
        window.location.href = "/login?success=reset";
      }, 2000);

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

        <h2 className="auth-title">Atur Ulang Password</h2>
        <p className="auth-subtitle">Masukkan email terdaftar Anda dan buat password baru.</p>

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

          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">
              Password Baru <span className="required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Buat password baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-light)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Konfirmasi Password Baru <span className="required">*</span>
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="form-control"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "16px" }}
          >
            {loading ? "Menyimpan..." : "Ubah & Simpan Password"}
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
