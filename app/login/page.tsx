"use client";




import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import GlobalLoading from "@/app/loading";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    // Initial logo fetch if not already in window
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "registered") {
      setSuccess("Registrasi berhasil! Silakan masuk dengan akun baru Anda.");
    } else if (success === "reset") {
      setSuccess("Password berhasil diubah! Silakan masuk dengan password baru Anda.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: data.error || "Email atau password salah"
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Selamat Datang!',
        text: 'Anda berhasil masuk ke sistem.',
        timer: 1500,
        showConfirmButton: false
      });

      if (data.user.role === "pending") {
        window.location.href = "/pending";
      } else if (["generus", "usia_mandiri"].includes(data.user.role)) {
        window.location.href = "/";
      } else if (data.user.role === "tim_gambuh") {
        window.location.href = "/mandiri/tim-gambuh";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
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
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen Generus Cengkareng</p>
          </div>
        </div>

        <h2 className="auth-title">Masuk ke Akun</h2>
        <p className="auth-subtitle">Masukkan email dan password Anda</p>

        {error && (
          <div className="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email <span className="required">*</span>
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
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
            <div style={{ textAlign: "right", marginTop: "8px" }}>
              <Link 
                href="/login/forgot-password" 
                style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}
              >
                Lupa Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="auth-footer">
          Belum punya akun?{" "}
          <Link href="/register" style={{ fontWeight: 600 }}>
            Daftar sekarang
          </Link>
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            <Link 
              href="/" 
              className="btn btn-secondary btn-full"
              style={{ fontSize: "12px", color: "var(--text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "4px" }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="loading"><div className="spinner" /></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
