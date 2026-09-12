import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import {
  ShieldCheck, Eye, EyeOff, CheckCircle2, Printer, Download, ArrowRight,
  Mail, Lock, Sparkles, ArrowLeft
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { GoogleIcon } from "../../components/GoogleIcon";
import { requestGoogleAuth } from "../../lib/googleAuth";
import { Select } from "../../components/Select";
import { MOSQUE_PATH, MOSQUE_VIEWBOX } from "../public/mosquePath";

type InviteScope = {
  ok: boolean;
  scopeRole: string;
  desaId?: number | null;
  kelompokId?: number | null;
  desaNama?: string | null;
  kelompokNama?: string | null;
  expiresAt?: string | null;
  durationLabel?: string | null;
};

type RegisteredMember = {
  id: string;
  nama: string;
  nomorUnik: string;
  desa: string;
  kelompok: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get("invite") || "").trim();

  // Invite state
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteScope, setInviteScope] = useState<InviteScope | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  // Form state
  const [nama, setNama] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P">("L");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [noTelp, setNoTelp] = useState("");
  const [namaOrtu, setNamaOrtu] = useState("");
  const [noTelpOrtu, setNoTelpOrtu] = useState("");

  const [kategoriMudaMudi, setKategoriMudaMudi] = useState<"pribumi" | "perantauan">("pribumi");
  const [asalDaerah, setAsalDaerah] = useState("");
  const [domisiliAnak, setDomisiliAnak] = useState("");
  const [isOrtuSama, setIsOrtuSama] = useState(true);
  const [domisiliOrtu, setDomisiliOrtu] = useState("");

  const [pendidikan, setPendidikan] = useState("SMA");
  const [pekerjaan, setPekerjaan] = useState("");
  const [kategoriUsia, setKategoriUsia] = useState("Mandiri");

  // Wilayah pickers (if admin_daerah or admin_desa)
  const [desaOpts, setDesaOpts] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokOpts, setKelompokOpts] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const [pickedDesaId, setPickedDesaId] = useState<number | "">("");
  const [pickedKelompokId, setPickedKelompokId] = useState<number | "">("");

  // Kredensial
  const [email, setEmail] = useState("");
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Success result
  const [registered, setRegistered] = useState<RegisteredMember | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Resolve invite token
  useEffect(() => {
    if (!token) {
      setLoadingInvite(false);
      setInviteErr("Link pendaftaran tidak memiliki token undangan.");
      return;
    }
    let cancel = false;
    apiFetch<InviteScope>(`/api/auth/invite/resolve?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (cancel) return;
        setInviteScope(res);
        if (res.desaId) setPickedDesaId(res.desaId);
        if (res.kelompokId) setPickedKelompokId(res.kelompokId);
        setLoadingInvite(false);
      })
      .catch((e: unknown) => {
        if (cancel) return;
        const msg = e instanceof Error ? e.message : String(e);
        setInviteErr(msg || "Link pendaftaran tidak valid.");
        setLoadingInvite(false);
      });
    return () => { cancel = true; };
  }, [token]);

  // 2. Fetch wilayah options if scope allows picking
  useEffect(() => {
    if (inviteScope?.scopeRole === "admin_daerah" || inviteScope?.scopeRole === "admin_desa") {
      void apiFetch<{ id: number; nama: string }[]>("/api/auth/desa")
        .then((j: unknown) => {
          const arr = Array.isArray(j) ? j as { id: number; nama: string }[] : [];
          setDesaOpts(arr);
        }).catch(() => {});
      void apiFetch<{ id: number; nama: string; desaId: number }[]>("/api/auth/kelompok")
        .then((j: unknown) => {
          const arr = Array.isArray(j) ? j as { id: number; nama: string; desaId: number }[] : [];
          setKelompokOpts(arr);
        }).catch(() => {});
    }
  }, [inviteScope?.scopeRole]);

  // 3. Auto-print saat kartu pendaftaran selesai dibuat
  useEffect(() => {
    if (registered) {
      const timer = setTimeout(() => {
        try { window.print(); } catch {}
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [registered]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) { setErr("Token pendaftaran tidak tersedia."); return; }
    if (!nama.trim()) { setErr("Nama lengkap wajib diisi."); return; }
    if (!tempatLahir.trim()) { setErr("Tempat lahir wajib diisi."); return; }
    if (!tanggalLahir) { setErr("Tanggal lahir wajib diisi."); return; }
    if (!noTelp.trim()) { setErr("Nomor WhatsApp wajib diisi."); return; }
    if (kategoriMudaMudi === "perantauan" && !asalDaerah.trim()) {
      setErr("Asal daerah wajib diisi untuk kategori perantauan.");
      return;
    }
    if (!domisiliAnak.trim()) { setErr("Alamat domisili saat ini wajib diisi."); return; }
    if (!isOrtuSama && !domisiliOrtu.trim()) { setErr("Alamat domisili orang tua wajib diisi."); return; }
    if (!email.trim()) { setErr("Email Google / akun wajib diisi."); return; }
    if (pw.length < 8) { setErr("Kata sandi minimal 8 karakter."); return; }
    if (pw !== pw2) { setErr("Konfirmasi kata sandi tidak cocok."); return; }

    setBusy(true);
    try {
      const res = await apiFetch<{ success: boolean; token?: string; member: RegisteredMember }>("/api/auth/invite/register", {
        method: "POST",
        body: JSON.stringify({
          token,
          nama: nama.trim(),
          jenisKelamin,
          tempatLahir: tempatLahir.trim(),
          tanggalLahir,
          noTelp: noTelp.trim(),
          namaOrtu: namaOrtu.trim() || undefined,
          noTelpOrtu: noTelpOrtu.trim() || undefined,
          kategoriMudaMudi,
          asalDaerah: asalDaerah.trim() || undefined,
          domisiliAnak: domisiliAnak.trim(),
          isOrtuSama,
          domisiliOrtu: isOrtuSama ? undefined : domisiliOrtu.trim(),
          alamat: domisiliAnak.trim(),
          pendidikan,
          pekerjaan: pekerjaan.trim() || undefined,
          kategoriUsia,
          email: email.trim().toLowerCase(),
          password: pw,
          desaId: pickedDesaId || undefined,
          kelompokId: pickedKelompokId || undefined,
        }),
      });

      if (res.token) {
        try { localStorage.setItem("token", res.token); } catch {}
      }
      setRegistered(res.member);
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg || "Gagal melakukan pendaftaran. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadCardPng() {
    if (!cardRef.current || !registered) return;
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
      a.download = `kartu-anggota-${(registered.nama || "member").toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    } catch {
      alert("Gagal mengunduh gambar kartu. Anda dapat menggunakan tombol Cetak.");
    } finally {
      setDownloading(false);
    }
  }

  // ── 1. Tampilan Sukses (Kartu Anggota + QR + Cetak) ──
  if (registered) {
    const qrValue = `gencar-auth|${registered.email}|${registered.password}`;
    return (
      <div className="aktivasi-print-page">
        <div className="aktivasi-card-container">
          <div className="no-print" style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "grid", placeItems: "center", margin: "0 auto 10px", color: "#16a34a" }}>
              <CheckCircle2 size={26} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--ink)" }}>Pendaftaran Berhasil &amp; Akun Aktif!</h1>
            <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Selamat bergabung! Kartu anggota resmi Anda siap dicetak. Simpan kartu ini sebagai bukti identitas dan akses login.
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
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7561", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nama Anggota</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#1b0f0a", marginTop: 2 }}>{registered.nama}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6 }}>
                    ID: {registered.nomorUnik}
                  </span>
                  {registered.desa && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: 6 }}>
                      Desa {registered.desa}
                    </span>
                  )}
                  {registered.kelompok && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#ecfdf5", color: "#065f46", padding: "2px 8px", borderRadius: 6 }}>
                      Kelompok {registered.kelompok}
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
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Email Akun</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", wordBreak: "break-all" }}>{registered.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Kata Sandi</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#d03804", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                    {registered.password}
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
                  QR Kredensial Login &amp; Identitas Anggota
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

          {/* Actions */}
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
              onClick={() => navigate("/member", { replace: true })}
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

  // ── 2. Tampilan Form Pendaftaran ──
  return (
    <div className="auth-split-layout">
      {/* ── Brand Pane (Left) ── */}
      <div className="auth-brand-pane no-print">
        <div className="auth-brand-topo-bg" aria-hidden="true" />
        <div className="auth-brand-sun" aria-hidden="true" />

        <div className="auth-brand-mosque" aria-hidden="true">
          <svg viewBox={MOSQUE_VIEWBOX} fill="currentColor" preserveAspectRatio="xMidYMax meet">
            <path d={MOSQUE_PATH} />
          </svg>
        </div>

        <div className="auth-brand-inner">
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Kembali ke Login</span>
          </Link>

          <div className="auth-brand-hero">
            <div className="auth-badge">
              <Sparkles size={12} />
              <span>Pendaftaran Mandiri</span>
            </div>

            <h1 className="auth-brand-title">
              Gabung Bersama <em>Generus</em> Cengkareng.
            </h1>

            <p className="auth-brand-desc">
              Daftarkan diri Anda melalui tautan resmi pengurus untuk mendapatkan ID Anggota, pencatatan presensi kegiatan, serta akses portal mandiri.
            </p>
          </div>

          <div className="auth-brand-footer">
            <span>© {new Date().getFullYear()} GENCAR · LDII Daerah Cengkareng</span>
          </div>
        </div>
      </div>

      {/* ── Form Pane (Right) ── */}
      <div className="auth-form-pane" style={{ overflowY: "auto" }}>
        <div className="auth-form-inner" style={{ maxWidth: 520, padding: "32px 16px 64px" }}>
          <Link to="/login" className="auth-back-link no-print" style={{ marginBottom: 16 }}>
            ← Kembali ke login
          </Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--primary, #d03804)", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <ShieldCheck size={14} /> Formulir Pendaftaran Anggota
          </div>
          <h1 className="auth-form-title" style={{ marginTop: 8 }}>Registrasi Anggota Baru</h1>

          {loadingInvite && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }} className="muted">
              Memverifikasi link undangan pendaftaran…
            </div>
          )}

          {inviteErr && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
              {inviteErr}
              <div style={{ marginTop: 10 }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: "8px 12px" }}>Ke halaman login</Link>
              </div>
            </div>
          )}

          {inviteScope && !registered && (
            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 16 }}>
              {/* Scope Info Card */}
              <div style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--surface-sunken, #f8fafc)",
                border: "1.5px solid var(--line, #e2e8f0)",
                fontSize: 13,
                display: "grid",
                gap: 4,
              }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)" }}>Wilayah Pendaftaran Resmi:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="pill pill-slate" style={{ fontSize: 11 }}>Daerah Cengkareng</span>
                  {inviteScope.desaNama && <span className="pill pill-emerald" style={{ fontSize: 11 }}>Desa {inviteScope.desaNama}</span>}
                  {inviteScope.kelompokNama && <span className="pill pill-amber" style={{ fontSize: 11 }}>Kelompok {inviteScope.kelompokNama}</span>}
                </div>
                {inviteScope.durationLabel && (
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Masa aktif link: <b>{inviteScope.durationLabel}</b>
                  </div>
                )}
              </div>

              {/* SECTION 1: IDENTITAS DIRI */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                  1. Identitas Diri
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 800 }}>Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap sesuai KTP/identitas"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Jenis Kelamin *</label>
                    <Select
                      value={jenisKelamin}
                      onChange={(v) => setJenisKelamin(v as "L" | "P")}
                      options={[
                        { value: "L", label: "Laki-laki (Muda)" },
                        { value: "P", label: "Perempuan (Mudi)" },
                      ]}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Kategori Usia *</label>
                    <Select
                      value={kategoriUsia}
                      onChange={(v) => setKategoriUsia(v)}
                      options={[
                        { value: "Mandiri", label: "Usia Mandiri" },
                        { value: "Remaja", label: "Remaja (SMA/SMK)" },
                        { value: "Pra-remaja", label: "Pra-Remaja (SMP)" },
                        { value: "Kuliah", label: "Kuliah" },
                        { value: "Bekerja", label: "Bekerja" },
                      ]}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Tempat Lahir *</label>
                    <input
                      type="text"
                      required
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      placeholder="Kota lahir"
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Tanggal Lahir *</label>
                    <input
                      type="date"
                      required
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>No. WhatsApp / HP *</label>
                    <input
                      type="tel"
                      required
                      value={noTelp}
                      onChange={(e) => setNoTelp(e.target.value)}
                      placeholder="081234567890"
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Nama Orang Tua</label>
                    <input
                      type="text"
                      value={namaOrtu}
                      onChange={(e) => setNamaOrtu(e.target.value)}
                      placeholder="Nama ayah / ibu"
                    />
                  </div>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 800 }}>No. WhatsApp Orang Tua</label>
                  <input
                    type="tel"
                    value={noTelpOrtu}
                    onChange={(e) => setNoTelpOrtu(e.target.value)}
                    placeholder="081234567890"
                  />
                </div>
              </div>

              {/* SECTION 2: STATUS & DOMISILI */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                  2. Status &amp; Domisili
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 800 }}>Status Keberadaan *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setKategoriMudaMudi("pribumi")}
                      style={{
                        padding: "10px",
                        borderRadius: 10,
                        border: kategoriMudaMudi === "pribumi" ? "2px solid var(--primary)" : "1px solid var(--line)",
                        background: kategoriMudaMudi === "pribumi" ? "#fff1e6" : "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                        color: kategoriMudaMudi === "pribumi" ? "var(--primary)" : "var(--ink)",
                      }}
                    >
                      Pribumi (Asli)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKategoriMudaMudi("perantauan")}
                      style={{
                        padding: "10px",
                        borderRadius: 10,
                        border: kategoriMudaMudi === "perantauan" ? "2px solid var(--primary)" : "1px solid var(--line)",
                        background: kategoriMudaMudi === "perantauan" ? "#fff1e6" : "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                        color: kategoriMudaMudi === "perantauan" ? "var(--primary)" : "var(--ink)",
                      }}
                    >
                      Perantauan
                    </button>
                  </div>
                </div>

                {kategoriMudaMudi === "perantauan" && (
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Asal Daerah / Kota *</label>
                    <input
                      type="text"
                      required
                      value={asalDaerah}
                      onChange={(e) => setAsalDaerah(e.target.value)}
                      placeholder="Contoh: Solo, Kediri, Lampung"
                    />
                  </div>
                )}

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 800 }}>Alamat Domisili Saat Ini *</label>
                  <textarea
                    required
                    value={domisiliAnak}
                    onChange={(e) => setDomisiliAnak(e.target.value)}
                    placeholder="Alamat lengkap tempat tinggal / kos sekarang"
                    rows={2}
                    style={{ padding: 10, borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="is-ortu-sama"
                    checked={isOrtuSama}
                    onChange={(e) => setIsOrtuSama(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="is-ortu-sama" style={{ fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Tinggal bersama orang tua
                  </label>
                </div>

                {!isOrtuSama && (
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Alamat Domisili Orang Tua *</label>
                    <textarea
                      required
                      value={domisiliOrtu}
                      onChange={(e) => setDomisiliOrtu(e.target.value)}
                      placeholder="Alamat tempat tinggal orang tua"
                      rows={2}
                      style={{ padding: 10, borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13 }}
                    />
                  </div>
                )}

                {/* Sub-pickers for admin_daerah */}
                {inviteScope.scopeRole === "admin_daerah" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label style={{ fontSize: 12, fontWeight: 800 }}>Pilih Desa</label>
                      <Select
                        value={String(pickedDesaId)}
                        onChange={(v) => {
                          const num = v ? Number(v) : "";
                          setPickedDesaId(num);
                          setPickedKelompokId("");
                        }}
                        options={[
                          { value: "", label: "Pilih Desa..." },
                          ...desaOpts.map((d) => ({ value: String(d.id), label: d.nama })),
                        ]}
                      />
                    </div>
                    <div className="field">
                      <label style={{ fontSize: 12, fontWeight: 800 }}>Pilih Kelompok</label>
                      <Select
                        value={String(pickedKelompokId)}
                        onChange={(v) => setPickedKelompokId(v ? Number(v) : "")}
                        options={[
                          { value: "", label: "Pilih Kelompok..." },
                          ...kelompokOpts.filter((k) => !pickedDesaId || k.desaId === Number(pickedDesaId)).map((k) => ({ value: String(k.id), label: k.nama })),
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-picker for admin_desa */}
                {inviteScope.scopeRole === "admin_desa" && !inviteScope.kelompokId && (
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Pilih Kelompok</label>
                    <Select
                      value={String(pickedKelompokId)}
                      onChange={(v) => setPickedKelompokId(v ? Number(v) : "")}
                      options={[
                        { value: "", label: "Pilih Kelompok di desa ini..." },
                        ...kelompokOpts.filter((k) => !inviteScope.desaId || k.desaId === Number(inviteScope.desaId)).map((k) => ({ value: String(k.id), label: k.nama })),
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* SECTION 3: PENDIDIKAN & PEKERJAAN */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                  3. Pendidikan &amp; Profesi
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Pendidikan Terakhir</label>
                    <Select
                      value={pendidikan}
                      onChange={(v) => setPendidikan(v)}
                      options={[
                        { value: "SD", label: "SD" },
                        { value: "SMP", label: "SMP" },
                        { value: "SMA", label: "SMA" },
                        { value: "SMK", label: "SMK" },
                        { value: "D3", label: "D3" },
                        { value: "S1", label: "S1" },
                        { value: "S2", label: "S2" },
                        { value: "Belum Sekolah", label: "Lainnya" },
                      ]}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Pekerjaan / Aktivitas</label>
                    <input
                      type="text"
                      value={pekerjaan}
                      onChange={(e) => setPekerjaan(e.target.value)}
                      placeholder="Contoh: Karyawan, Wirausaha, Mahasiswa"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: KREDENSIAL LOGIN */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                  4. Akun &amp; Kata Sandi Login
                </div>

                {/* Google SSO Button Option */}
                <div style={{
                  background: "#ffffff",
                  border: isGoogleLinked ? "1.5px solid #86efac" : "1.5px solid var(--line, #e2e8f0)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "grid",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <GoogleIcon size={18} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Kaitkan Akun Google</span>
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
                        Gunakan akun Google Anda agar email terisi otomatis dan login lebih cepat.
                      </p>
                      <button
                        type="button"
                        className="auth-google-btn"
                        onClick={handleGoogleConnect}
                        disabled={busy}
                        style={{ marginTop: 2 }}
                      >
                        <GoogleIcon size={18} />
                        <span>Pilih Akun Google</span>
                      </button>
                    </>
                  ) : (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{email}</div>
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

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 800 }}>Email Akun Login *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsGoogleLinked(false);
                      }}
                      placeholder="nama@gmail.com"
                      style={{ paddingLeft: 36, width: "100%" }}
                    />
                    <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: isGoogleLinked ? "#16a34a" : "var(--muted)" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Kata Sandi (Min 8) *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        placeholder="••••••••"
                        style={{ paddingLeft: 36, paddingRight: 36, width: "100%" }}
                      />
                      <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Sembunyikan" : "Tampilkan"}
                        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 800 }}>Ulangi Sandi *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        placeholder="••••••••"
                        style={{ paddingLeft: 36, width: "100%" }}
                      />
                      <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {err && (
                <div style={{ padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
                  {err}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy}
                style={{ width: "100%", padding: "14px", borderRadius: 14, fontWeight: 800, fontSize: 14, marginTop: 6 }}
              >
                {busy ? "Mendaftarkan & Menyiapkan Akun…" : "Daftar & Cetak Kartu Anggota"}
              </button>

              <p className="muted" style={{ fontSize: 11, textAlign: "center", margin: 0 }}>
                Data biodata akan langsung diverifikasi dan akun Anda langsung aktif.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
