import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { MOSQUE_PATH, MOSQUE_VIEWBOX } from "../public/mosquePath";
import { ArrowLeft, Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

function roleToHome(role: string | undefined | null) {
  const r = String(role ?? "").toLowerCase();
  if (!r) return "/";
  if (["admin_daerah", "admin_desa", "admin_kelompok"].includes(r)) return "/admin";
  return "/member";
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (!/^[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%/-]+$/.test(raw)) return null;
  return raw;
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = params.get("next") || null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password) {
      setErr("Email dan password wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      const role = (u as { role?: string } | null)?.role ?? user?.role;
      const isAdminLike = ["admin", "admin_daerah", "admin_desa", "admin_kelompok", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "admin_keuangan", "admin_kegiatan"].includes(String(role ?? "").toLowerCase());
      const sn = safeNext(next);
      let target: string;
      if (sn) {
        if (isAdminLike && sn.startsWith("/member")) {
          target = "/admin";
        } else if (!isAdminLike && sn.startsWith("/admin")) {
          target = "/member";
        } else {
          target = sn;
        }
      } else {
        target = roleToHome(role);
      }
      navigate(target, { replace: true });
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      if (msg.includes("401") || msg.toLowerCase().includes("salah") || msg.toLowerCase().includes("unauthorized")) {
        setErr("Email atau password salah. Pastikan akun sudah terdaftar.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split-layout">
      {/* ── Left / Top Brand Canvas (Editorial Dark Hero) ── */}
      <div className="auth-brand-pane">
        <div className="auth-brand-topo-bg" aria-hidden="true" />
        <div className="auth-brand-sun" aria-hidden="true" />
        
        <div className="auth-brand-mosque" aria-hidden="true">
          <svg viewBox={MOSQUE_VIEWBOX} fill="currentColor" preserveAspectRatio="xMidYMax meet">
            <path d={MOSQUE_PATH} />
          </svg>
        </div>

        <div className="auth-brand-inner">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="auth-brand-hero">
            <div className="auth-badge">
              <Sparkles size={12} />
              <span>Portal Terpadu Generus</span>
            </div>

            <h1 className="auth-brand-title">
              Satu Pintu untuk <em>Muda-Mudi</em> & Pengurus.
            </h1>

            <p className="auth-brand-desc">
              Masuk untuk mencatat presensi mandiri, mengajukan pembaruan biodata, serta mengelola agenda kegiatan dakwah se-Daerah Cengkareng.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <strong>Presensi Cepat & Terverifikasi</strong>
                  <span>Scan QR mandiri berbasis radius lokasi GPS lokasi acara.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Privasi Biodata Terjaga</strong>
                  <span>Pembaruan nomor kontak & alamat melewati kurasi pengurus daerah.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <span>© {new Date().getFullYear()} GENCAR · LDII Daerah Cengkareng</span>
          </div>
        </div>
      </div>

      {/* ── Right / Form Pane (Clean High-Contrast Card) ── */}
      <div className="auth-form-pane">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div className="auth-logo-badge">
              <img src="/logos/gencar.png" alt="Logo GENCAR" width={32} height={32} />
              <div className="auth-logo-text">
                <strong>GENCAR</strong>
                <span>Cengkareng</span>
              </div>
            </div>

            <h2>Masuk ke Akun</h2>
            <p>Masukkan email terdaftar dan kata sandi Anda untuk melanjutkan.</p>
          </div>

          {err && (
            <div className="auth-alert-box" role="alert">
              <div className="auth-alert-dot" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="auth-form-body">
            <div className="auth-field">
              <label htmlFor="email">Email Terdaftar</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gencar.id"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-head">
                <label htmlFor="password">Kata Sandi</label>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={busy}>
              {busy ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" /> Memverifikasi...
                </span>
              ) : (
                "Masuk Sekarang"
              )}
            </button>
          </form>

          <div className="auth-footer-help">
            <p>
              Belum memiliki akun atau lupa kata sandi? Hubungi tim pengurus kelompok atau desa masing-masing untuk aktivasi akun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

