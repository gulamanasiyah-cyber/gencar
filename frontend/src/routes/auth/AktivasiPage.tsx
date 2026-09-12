import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { ShieldCheck, Eye, EyeOff, CheckCircle2, Printer, Download, ArrowRight, Mail, Lock, Sparkles } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { GoogleIcon } from "../../components/GoogleIcon";
import { requestGoogleAuth } from "../../lib/googleAuth";

interface CompletedData {
  nama: string;
  nomorUnik: string;
  desa: string;
  kelompok: string;
  email: string;
  password: string;
  token?: string;
}

export default function AktivasiPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get("token") || "").trim();

  const [valid, setValid] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; nama?: string; nomorUnik?: string; desa?: string; kelompok?: string } | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  const [done, setDone] = useState(false);
  const [completedData, setCompletedData] = useState<CompletedData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Verifikasi magic token
  useEffect(() => {
    if (!token) {
      setValid(false);
      setVerifyErr("Link tidak lengkap (token hilang).");
      return;
    }
    let cancel = false;
    apiFetch<{ ok: boolean; generusId?: string; email?: string; nama?: string; nomorUnik?: string; desa?: string; kelompok?: string }>(`/api/auth/magic/verify?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then((j) => {
        if (cancel) return;
        setValid(true);
        const fetchedEmail = j.email || "";
        setUserInfo({ email: fetchedEmail, nama: j.nama, nomorUnik: j.nomorUnik, desa: j.desa, kelompok: j.kelompok });
        setEmail(fetchedEmail);
      })
      .catch((e: unknown) => {
        if (cancel) return;
        const msg = e instanceof Error ? e.message : String(e);
        setValid(false);
        if (msg.toLowerCase().includes("sudah dipakai")) setVerifyErr("Link sudah dipakai (sekali pakai). Minta admin buat link baru.");
        else if (msg.toLowerCase().includes("kadaluarsa")) setVerifyErr("Link kadaluarsa (15 menit). Minta admin buat link baru.");
        else setVerifyErr(msg);
      });
    return () => { cancel = true; };
  }, [token]);

  // 2. Handler tombol hubungkan Google (Custom Design)
  function handleGoogleConnect() {
    setErr(null);
    requestGoogleAuth({
      onSuccess: ({ email: gEmail }) => {
        setEmail(gEmail);
        setIsGoogleLinked(true);
      },
      onError: (errMsg) => {
        setErr(errMsg);
      },
    });
  }

  // 3. Auto-print saat kartu selesai dibuat
  useEffect(() => {
    if (done && completedData) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [done, completedData]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) { setErr("Token tidak tersedia."); return; }
    if (!email.trim()) { setErr("Email Google wajib diisi."); return; }
    if (pw.length < 8) { setErr("Password minimal 8 karakter."); return; }
    if (pw !== pw2) { setErr("Konfirmasi password tidak cocok."); return; }
    setBusy(true);
    try {
      const res = await apiFetch<{ success: boolean; token?: string; email?: string }>("/api/auth/magic/set-password", {
        method: "POST",
        body: JSON.stringify({ token, password: pw, email: email.trim().toLowerCase() }),
      });
      if (res.token) {
        try { localStorage.setItem("token", res.token); } catch {}
      }
      setCompletedData({
        nama: userInfo?.nama || "Anggota Generus",
        nomorUnik: userInfo?.nomorUnik || "G-000000",
        desa: userInfo?.desa || "-",
        kelompok: userInfo?.kelompok || "-",
        email: res.email || email.trim().toLowerCase(),
        password: pw,
        token: res.token,
      });
      setDone(true);
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      if (msg.toLowerCase().includes("sudah dipakai")) setErr("Link sudah dipakai. Minta admin buat link baru.");
      else if (msg.toLowerCase().includes("kadaluarsa")) setErr("Link kadaluarsa (15 menit). Minta admin buat link baru.");
      else setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function downloadCardPng() {
    if (!cardRef.current || !completedData) return;
    setDownloading(true);
    try {
      const node = cardRef.current;
      const w = Math.ceil(node.offsetWidth);
      const h = Math.ceil(node.offsetHeight);
      const scale = 3;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: scale,
        width: w,
        height: h,
        canvasWidth: w * scale,
        canvasHeight: h * scale,
        backgroundColor: "#ffffff",
        style: { margin: "0", transform: "none", boxShadow: "none" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `kartu-anggota-${(completedData.nama || "member").toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    } catch {
      alert("Gagal mengunduh gambar kartu. Anda dapat menggunakan tombol Cetak.");
    } finally {
      setDownloading(false);
    }
  }

  function handleContinue() {
    navigate("/member", { replace: true });
  }

  // Tampilan Sukses: Kartu Anggota + QR Code + Opsi Print
  if (done && completedData) {
    const qrValue = `gencar-auth|${completedData.email}|${completedData.password}`;
    return (
      <div className="aktivasi-print-page">
        <div className="aktivasi-card-container">
          <div className="no-print" style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "grid", placeItems: "center", margin: "0 auto 10px", color: "#16a34a" }}>
              <CheckCircle2 size={26} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--ink)" }}>Akun & Password Berhasil Dibuat!</h1>
            <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Kartu anggota resmi Anda siap dicetak. Simpan kartu ini untuk login dari perangkat lain.
            </p>
          </div>

          {/* ── KARTU ANGGOTA (PRINTABLE) ── */}
          <div
            ref={cardRef}
            id="printable-member-card"
            className="printable-member-card"
            style={{
              width: "100%",
              maxWidth: 380,
              margin: "0 auto",
              background: "#ffffff",
              border: "2px solid #1b0f0a",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Header Kartu */}
            <div style={{
              background: "linear-gradient(135deg, #1b0f0a 0%, #2e170c 100%)",
              padding: "16px 20px",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "3px solid #d03804",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#d03804",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#ffffff",
                }}>G</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "0.02em", lineHeight: 1.1 }}>GENCAR</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Daerah Cengkareng
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                background: "rgba(255,255,255,0.12)",
                padding: "4px 8px",
                borderRadius: 6,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                border: "1px solid rgba(255,255,255,0.2)",
              }}>
                Kartu Anggota
              </div>
            </div>

            {/* Isi Profil & Kredensial */}
            <div style={{ padding: "20px 20px 16px", display: "grid", gap: 14 }}>
              {/* Profil Header */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7561", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nama Anggota</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#1b0f0a", marginTop: 2 }}>{completedData.nama}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6 }}>
                    ID: {completedData.nomorUnik}
                  </span>
                  {completedData.desa && completedData.desa !== "-" && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: 6 }}>
                      Desa {completedData.desa}
                    </span>
                  )}
                  {completedData.kelompok && completedData.kelompok !== "-" && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#ecfdf5", color: "#065f46", padding: "2px 8px", borderRadius: 6 }}>
                      Kelompok {completedData.kelompok}
                    </span>
                  )}
                </div>
              </div>

              {/* Box Kredensial Akun */}
              <div style={{
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: 12,
                padding: "12px 14px",
                display: "grid",
                gap: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                  Kredensial Akses Login
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Email Akun (Google)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", wordBreak: "break-all" }}>{completedData.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Kata Sandi</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#d03804", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                    {completedData.password}
                  </div>
                </div>
              </div>

              {/* QR Code Center */}
              <div style={{ display: "grid", justifyItems: "center", gap: 6, paddingTop: 4 }}>
                <div style={{
                  padding: 10,
                  background: "#ffffff",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  display: "inline-block",
                }}>
                  <QRCodeCanvas value={qrValue} size={150} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#1b0f0a" />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textAlign: "center" }}>
                  QR Kredensial Login & Identitas Anggota
                </div>
              </div>
            </div>

            {/* Footer Kartu */}
            <div style={{
              background: "#f1f5f9",
              borderTop: "1px dashed #cbd5e1",
              padding: "8px 16px",
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "#64748b",
            }}>
              Simpan kartu ini &bull; Digunakan saat login &amp; verifikasi data
            </div>
          </div>

          {/* Action Buttons (Hidden when printing) */}
          <div className="no-print" style={{ display: "grid", gap: 10, marginTop: 24, maxWidth: 380, marginInline: "auto" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ flex: 1, padding: "12px 14px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 800 }}
              >
                <Printer size={16} /> Cetak Kartu
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={downloadCardPng}
                disabled={downloading}
                style={{ flex: 1, padding: "12px 14px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 800 }}
              >
                <Download size={16} /> {downloading ? "Menyiapkan…" : "Unduh PNG"}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinue}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--ink, #1b0f0a)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontWeight: 800,
              }}
            >
              <span>Lanjut ke Beranda Member</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Form Aktivasi
  return (
    <div className="auth-split-layout">
      {/* ── Brand Pane (Left) ── */}
      <div className="auth-brand-pane no-print">
        <div className="auth-brand-topo-bg" aria-hidden="true" />
        <div className="auth-brand-sun" aria-hidden="true" />

        <div className="auth-brand-inner">
          <Link to="/login" className="auth-back-link">
            <span>← Kembali ke Login</span>
          </Link>

          <div className="auth-brand-hero">
            <div className="auth-badge">
              <Sparkles size={12} />
              <span>Aktivasi Akun Generus</span>
            </div>

            <h1 className="auth-brand-title">
              Atur Akun &amp; <em>Password</em> Resmi.
            </h1>

            <p className="auth-brand-desc">
              Hubungkan akun Google aktif Anda dan buat kata sandi untuk login mandiri di seluruh layanan GENCAR Cengkareng.
            </p>
          </div>

          <div className="auth-brand-footer">
            <span>© {new Date().getFullYear()} GENCAR · LDII Daerah Cengkareng</span>
          </div>
        </div>
      </div>

      {/* ── Form Pane (Right) ── */}
      <div className="auth-form-pane">
        <div className="auth-form-inner" style={{ maxWidth: 460 }}>
          <Link to="/login" className="auth-back-link no-print" style={{ marginBottom: 16 }}>
            ← Kembali ke login
          </Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--primary, #d03804)", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <ShieldCheck size={14} /> Aktivasi Akses Login
          </div>
          <h1 className="auth-form-title" style={{ marginTop: 8 }}>Set Email &amp; Password</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Link ini berlaku <b>15 menit</b> dan <b>sekali pakai</b>. Anda bisa menghubungkan akun Google Anda dan mengatur kata sandi.
          </p>

          {valid === null && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }} className="muted">
              Memeriksa link aktivasi…
            </div>
          )}

          {valid === false && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
              {verifyErr ?? "Link tidak valid."}
              <div style={{ marginTop: 10 }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: "8px 12px" }}>Ke login</Link>
              </div>
            </div>
          )}

          {valid === true && (
            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 14 }}>
              {userInfo && (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface-sunken, #f8fafc)", border: "1px solid var(--line)", fontSize: 13, display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>{userInfo.nama || "Anggota"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    ID Anggota: <b>{userInfo.nomorUnik}</b>
                    {userInfo.desa && <span> &bull; Desa {userInfo.desa}</span>}
                    {userInfo.kelompok && <span> &bull; {userInfo.kelompok}</span>}
                  </div>
                </div>
              )}

              {/* ── GOOGLE SSO CARD (CUSTOM DESIGN) ── */}
              <div style={{
                background: "#ffffff",
                border: isGoogleLinked ? "1.5px solid #86efac" : "1.5px solid var(--line, #e2e8f0)",
                borderRadius: 14,
                padding: "14px 16px",
                display: "grid",
                gap: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GoogleIcon size={18} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #1b0f0a)" }}>Akun Google Resmi</span>
                  </div>
                  {isGoogleLinked && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={12} /> Terhubung
                    </span>
                  )}
                </div>

                {!isGoogleLinked ? (
                  <>
                    <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                      Pilih akun Google Anda untuk mengisi email resmi akun secara otomatis.
                    </p>
                    <button
                      type="button"
                      className="auth-google-btn"
                      onClick={handleGoogleConnect}
                      disabled={busy}
                    >
                      <GoogleIcon size={18} />
                      <span>Hubungkan Akun Google</span>
                    </button>
                  </>
                ) : (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Email Google Terpilih</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>{email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGoogleLinked(false)}
                      style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#ffffff", border: "1px solid #bbf7d0", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}
                    >
                      Ganti
                    </button>
                  </div>
                )}
              </div>

              {/* ── INPUT EMAIL (READ-ONLY) ── */}
              <div className="field">
                <label style={{ fontSize: 12, fontWeight: 800 }}>Email Terdaftar (Otomatis dari Google) *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    name="email"
                    id="aktivasi-email"
                    autoComplete="email"
                    required
                    readOnly
                    value={email}
                    placeholder="nama@gmail.com"
                    style={{
                      paddingLeft: 36,
                      width: "100%",
                      background: "#f8fafc",
                      cursor: "not-allowed",
                      color: "#334155",
                      borderColor: isGoogleLinked ? "#86efac" : "var(--line)",
                    }}
                  />
                  <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: isGoogleLinked ? "#16a34a" : "var(--muted)" }} />
                </div>
                <span className="muted" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  {isGoogleLinked ? "✓ Email berhasil dikaitkan dengan Google SSO." : "Klik tombol Google di atas untuk menghubungkan email Google Anda."}
                </span>
              </div>

              {/* ── INPUT PASSWORD ── */}
              <div className="field">
                <label style={{ fontSize: 12, fontWeight: 800 }}>Password Baru (Min. 8 Karakter) *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    id="aktivasi-password"
                    required
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    style={{ paddingLeft: 36, paddingRight: 40, width: "100%" }}
                  />
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Sembunyikan" : "Tampilkan"}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* ── INPUT KONFIRMASI PASSWORD ── */}
              <div className="field">
                <label style={{ fontSize: 12, fontWeight: 800 }}>Ulangi Password Baru *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    name="password_confirm"
                    id="aktivasi-password-confirm"
                    required
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="Ulangi password di atas"
                    autoComplete="new-password"
                    style={{ paddingLeft: 36, width: "100%" }}
                  />
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                </div>
              </div>

              {err && (
                <div style={{ padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
                  {err}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, fontWeight: 800, marginTop: 4 }}
              >
                {busy ? "Menyimpan & Menyiapkan Kartu…" : "Simpan Akun & Cetak Kartu Anggota"}
              </button>

              <p className="muted" style={{ fontSize: 11, textAlign: "center", margin: 0 }}>
                Setelah tersimpan, kartu anggota otomatis dicetak dan Anda langsung dapat masuk.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
