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
import { PEKERJAAN_GROUPS } from "../../../../shared/pekerjaan";
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

  // Stepper state (1: Identitas & Profesi, 2: Domisili & Akun, 3: Ringkasan & Konfirmasi)
  const [s, setS] = useState(1);

  // Invite state
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteScope, setInviteScope] = useState<InviteScope | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    nama: "",
    namaOrtu: "",
    tempatLahir: "",
    tanggalLahir: "",
    noTelp: "",
    noTelpOrtu: "",
    pendidikan: "SMA",
    pekerjaan: "",
    jenisKelamin: "L" as "L" | "P",
    kategoriMudaMudi: "pribumi" as "pribumi" | "perantauan",
    asalDaerah: "",
    domisiliAnak: "",
    isOrtuSama: true,
    domisiliOrtu: "",
    desa: "",
    kelompok: "",
  });

  // Pekerjaan selector state
  const [pekerjaanOpen, setPekerjaanOpen] = useState(false);
  const [pekerjaanFreeMode, setPekerjaanFreeMode] = useState(false);
  const pekerjaanRef = useRef<HTMLDivElement>(null);

  // Wilayah pickers (if admin_daerah or admin_desa)
  const [desaOpts, setDesaOpts] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokOpts, setKelompokOpts] = useState<{ id: number; nama: string; desaId: number }[]>([]);

  // Kredensial Akun
  const [email, setEmail] = useState("");
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

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
        if (res.desaNama) setForm((prev) => ({ ...prev, desa: res.desaNama || "" }));
        if (res.kelompokNama) setForm((prev) => ({ ...prev, kelompok: res.kelompokNama || "" }));
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
          if (arr.length > 0 && !form.desa) setForm((prev) => ({ ...prev, desa: arr[0].nama }));
        }).catch(() => {});
      void apiFetch<{ id: number; nama: string; desaId: number }[]>("/api/auth/kelompok")
        .then((j: unknown) => {
          const arr = Array.isArray(j) ? j as { id: number; nama: string; desaId: number }[] : [];
          setKelompokOpts(arr);
          if (arr.length > 0 && !form.kelompok) setForm((prev) => ({ ...prev, kelompok: arr[0].nama }));
        }).catch(() => {});
    }
  }, [inviteScope?.scopeRole]);

  // 3. Pekerjaan click outside listener
  useEffect(() => {
    if (!pekerjaanOpen) return;
    const handler = (e: MouseEvent) => {
      if (pekerjaanRef.current && !pekerjaanRef.current.contains(e.target as Node)) setPekerjaanOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pekerjaanOpen]);

  // 4. Auto-print saat kartu pendaftaran selesai dibuat
  useEffect(() => {
    if (registered) {
      const timer = setTimeout(() => {
        try { window.print(); } catch {}
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [registered]);

  const filteredKelompok = kelompokOpts.filter((k) => {
    const desa = desaOpts.find((d) => d.nama === form.desa);
    return desa ? k.desaId === desa.id : true;
  });

  function handleGoogleConnect() {
    setSaveErr(null);
    requestGoogleAuth({
      onSuccess: ({ email: gEmail }) => {
        setEmail(gEmail);
        setIsGoogleLinked(true);
      },
      onError: (errMsg) => {
        setSaveErr(errMsg);
      },
    });
  }

  // Validations per step
  const canNext1 = form.nama.trim().length >= 2 && form.tempatLahir.trim() && form.tanggalLahir && form.noTelp.trim().length >= 10 && form.pekerjaan.trim().length > 0;
  const needAsal = form.kategoriMudaMudi === "perantauan" && !form.asalDaerah.trim();
  const canNext2 = form.domisiliAnak.trim().length >= 3 && (form.isOrtuSama || form.domisiliOrtu.trim().length >= 3) && email.trim().length >= 5 && pw.length >= 8 && pw === pw2;

  async function handleRegister() {
    if (saving) return;
    if (!form.nama.trim() || !form.tempatLahir.trim() || !form.tanggalLahir || !form.noTelp.trim()) {
      setSaveErr("Nama, tempat lahir, tanggal lahir, dan no telp wajib diisi.");
      return;
    }
    if (form.kategoriMudaMudi === "perantauan" && !form.asalDaerah.trim()) {
      setSaveErr("Asal daerah wajib diisi jika perantauan.");
      return;
    }
    if (form.domisiliAnak.trim().length < 3) { setSaveErr("Domisili anak wajib (min 3 karakter)."); return; }
    if (!form.isOrtuSama && form.domisiliOrtu.trim().length < 3) { setSaveErr("Domisili ortu wajib jika ortu beda."); return; }
    if (!email.trim()) { setSaveErr("Email Google / akun wajib diisi."); return; }
    if (pw.length < 8) { setSaveErr("Kata sandi minimal 8 karakter."); return; }
    if (pw !== pw2) { setSaveErr("Konfirmasi kata sandi tidak cocok."); return; }

    setSaveErr(null);
    setSaving(true);
    try {
      let desaId: number | undefined;
      let kelompokId: number | undefined;
      if (desaOpts.length > 0 && form.desa) {
        const hitD = desaOpts.find((d) => d.nama.toLowerCase() === form.desa.toLowerCase());
        if (hitD) desaId = hitD.id;
      }
      if (kelompokOpts.length > 0 && form.kelompok) {
        const hitK = kelompokOpts.find((k) => k.nama.toLowerCase() === form.kelompok.toLowerCase());
        if (hitK) kelompokId = hitK.id;
      }

      const res = await apiFetch<{ success: boolean; token?: string; member: RegisteredMember }>("/api/auth/invite/register", {
        method: "POST",
        body: JSON.stringify({
          token,
          nama: form.nama.trim(),
          jenisKelamin: form.jenisKelamin,
          tempatLahir: form.tempatLahir.trim(),
          tanggalLahir: form.tanggalLahir,
          noTelp: form.noTelp.trim(),
          namaOrtu: form.namaOrtu.trim() || undefined,
          noTelpOrtu: form.noTelpOrtu.trim() || undefined,
          kategoriMudaMudi: form.kategoriMudaMudi,
          asalDaerah: form.asalDaerah.trim() || undefined,
          domisiliAnak: form.domisiliAnak.trim(),
          isOrtuSama: form.isOrtuSama ? 1 : 0,
          domisiliOrtu: form.isOrtuSama ? undefined : form.domisiliOrtu.trim(),
          alamat: form.domisiliAnak.trim(),
          pendidikan: form.pendidikan,
          pekerjaan: form.pekerjaan.trim() || undefined,
          email: email.trim().toLowerCase(),
          password: pw,
          desaId,
          kelompokId,
        }),
      });

      if (res.token) {
        try { localStorage.setItem("token", res.token); } catch {}
      }
      setRegistered(res.member);
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setSaveErr(msg || "Gagal melakukan pendaftaran. Silakan coba lagi.");
    } finally {
      setSaving(false);
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

  // ── 2. Tampilan Form Pendaftaran (Format Seperti Create Anggota) ──
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
          <h1 className="auth-form-title" style={{ marginTop: 8, marginBottom: 16 }}>Registrasi Anggota Baru</h1>

          {loadingInvite && (
            <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }} className="muted">
              Memverifikasi link undangan pendaftaran…
            </div>
          )}

          {inviteErr && (
            <div style={{ padding: 14, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
              {inviteErr}
              <div style={{ marginTop: 10 }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: "8px 12px" }}>Ke halaman login</Link>
              </div>
            </div>
          )}

          {inviteScope && !registered && (
            <div>
              {/* Stepper Dots */}
              <div className="stepper" style={{ marginBottom: 10 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`step-dot ${s >= n ? "on" : ""}`} />
                ))}
              </div>
              <div className="muted" style={{ marginBottom: 16, fontSize: 12 }}>
                Langkah {s}/3 &bull; {s === 1 ? "Identitas Diri & Profesi" : s === 2 ? "Domisili & Akun Login" : "Ringkasan & Konfirmasi"}
              </div>

              {/* Scope Info Card */}
              <div style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "var(--surface-sunken, #f8fafc)",
                border: "1px solid var(--line, #e2e8f0)",
                fontSize: 12,
                display: "grid",
                gap: 4,
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 800, color: "var(--ink)" }}>Wilayah Pendaftaran Resmi:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="pill pill-slate" style={{ fontSize: 10 }}>Daerah Cengkareng</span>
                  {inviteScope.desaNama && <span className="pill pill-emerald" style={{ fontSize: 10 }}>Desa {inviteScope.desaNama}</span>}
                  {inviteScope.kelompokNama && <span className="pill pill-amber" style={{ fontSize: 10 }}>Kelompok {inviteScope.kelompokNama}</span>}
                </div>
              </div>

              {/* ── STEP 1: IDENTITAS & PEKERJAAN (MIRIP CREATE ANGGOTA) ── */}
              {s === 1 && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="field">
                    <label>Nama Lengkap *</label>
                    <input
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      placeholder="Nama lengkap sesuai identitas"
                    />
                  </div>

                  <div className="field">
                    <label>Nama Orang Tua</label>
                    <input
                      value={form.namaOrtu}
                      onChange={(e) => setForm({ ...form, namaOrtu: e.target.value })}
                      placeholder="Nama ayah / ibu"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="field">
                      <label>Tempat Lahir *</label>
                      <input
                        value={form.tempatLahir}
                        onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                        placeholder="Kota lahir"
                      />
                    </div>
                    <div className="field">
                      <label>Tanggal Lahir *</label>
                      <input
                        type="date"
                        value={form.tanggalLahir}
                        onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="field">
                      <label>No. WhatsApp / HP *</label>
                      <input
                        value={form.noTelp}
                        onChange={(e) => setForm({ ...form, noTelp: e.target.value })}
                        placeholder="0812..."
                      />
                    </div>
                    <div className="field">
                      <label>Pendidikan *</label>
                      <Select
                        value={form.pendidikan}
                        onChange={(v) => setForm({ ...form, pendidikan: v })}
                        ariaLabel="Pendidikan"
                        options={[
                          { value: "SD", label: "SD" },
                          { value: "SMP", label: "SMP" },
                          { value: "SMA", label: "SMA" },
                          { value: "Sedang menempuh perguruan tinggi", label: "Sedang menempuh perguruan tinggi" },
                          { value: "Sarjana", label: "Sarjana" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Pekerjaan with Autocomplete dropdown (seperti create) */}
                  <div className="field" style={{ position: "relative" }} ref={(el) => { if (el) pekerjaanRef.current = el; }}>
                    <label>Pekerjaan *</label>
                    <div style={{ display: "flex", gap: 0 }}>
                      <input
                        data-pekerjaan-input
                        value={form.pekerjaan}
                        onChange={(e) => {
                          setForm({ ...form, pekerjaan: e.target.value });
                          setPekerjaanOpen(true);
                          setPekerjaanFreeMode(true);
                        }}
                        onFocus={() => setPekerjaanOpen(true)}
                        placeholder={pekerjaanFreeMode ? "Tulis pekerjaan…" : "Ketik atau pilih pekerjaan…"}
                        style={{ flex: 1, borderRadius: "12px 0 0 12px", borderRight: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => { setPekerjaanOpen((v) => !v); setPekerjaanFreeMode(true); }}
                        style={{ padding: "0 10px", borderRadius: "0 12px 12px 0", border: "1px solid var(--line)", background: "#f8fafc", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)" }}
                        aria-label="Tampilkan opsi pekerjaan"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                    {pekerjaanOpen && (() => {
                      const q = form.pekerjaan.toLowerCase().trim();
                      const groups = PEKERJAAN_GROUPS.map((g) => ({
                        ...g,
                        filtered: g.items.filter((it) => !q || it.toLowerCase().includes(q)),
                      })).filter((g) => g.filtered.length > 0 || !q);
                      return (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)", maxHeight: 240, overflowY: "auto", marginTop: 4 }}>
                          {groups.length === 0 && (
                            <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>Tidak ada yang cocok — lanjut ketik bebas</div>
                          )}
                          {groups.map((g) => (
                            <div key={g.label}>
                              <div style={{ padding: "6px 14px 2px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>{g.label}</div>
                              {g.filtered.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => { setForm({ ...form, pekerjaan: item }); setPekerjaanOpen(false); setPekerjaanFreeMode(false); }}
                                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", fontSize: 13, background: form.pekerjaan === item ? "#fff1e6" : "transparent", border: "none", cursor: "pointer", color: form.pekerjaan === item ? "var(--primary)" : "var(--ink)" }}
                                >{item}</button>
                              ))}
                              {!q && (
                                <button
                                  type="button"
                                  onClick={() => { setForm({ ...form, pekerjaan: "" }); setPekerjaanOpen(false); setPekerjaanFreeMode(true); setTimeout(() => { const inp = document.querySelector<HTMLInputElement>("[data-pekerjaan-input]"); inp?.focus(); }, 50); }}
                                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "transparent", border: "none", color: "var(--muted)", fontStyle: "italic" }}
                                >+ Lainnya (ketik sendiri)…</button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-grid-2">
                    <div className="field">
                      <label>Jenis Kelamin *</label>
                      <Select
                        value={form.jenisKelamin}
                        onChange={(v) => setForm({ ...form, jenisKelamin: v as "L" | "P" })}
                        ariaLabel="Jenis kelamin"
                        options={[
                          { value: "L", label: "Laki-laki (Muda)" },
                          { value: "P", label: "Perempuan (Mudi)" },
                        ]}
                      />
                    </div>
                    <div className="field">
                      <label>Kategori *</label>
                      <Select
                        value={form.kategoriMudaMudi}
                        onChange={(v) => setForm({ ...form, kategoriMudaMudi: v as any })}
                        ariaLabel="Kategori"
                        options={[
                          { value: "pribumi", label: "Pribumi" },
                          { value: "perantauan", label: "Perantauan" },
                        ]}
                      />
                    </div>
                  </div>

                  {form.kategoriMudaMudi === "perantauan" && (
                    <div className="field">
                      <label>Asal Daerah *</label>
                      <input
                        value={form.asalDaerah}
                        onChange={(e) => setForm({ ...form, asalDaerah: e.target.value })}
                        placeholder="Kabupaten / kota asal (misal: Solo, Kediri)"
                      />
                    </div>
                  )}

                  {/* Sub-selects if admin_daerah allows choosing */}
                  {inviteScope.scopeRole === "admin_daerah" && (
                    <div className="form-grid-2">
                      <div className="field">
                        <label>Desa</label>
                        <Select
                          value={form.desa}
                          onChange={(v) => setForm({ ...form, desa: v, kelompok: "" })}
                          ariaLabel="Desa"
                          options={desaOpts.map((d) => ({ value: d.nama, label: d.nama }))}
                        />
                      </div>
                      <div className="field">
                        <label>Kelompok</label>
                        <Select
                          value={form.kelompok}
                          onChange={(v) => setForm({ ...form, kelompok: v })}
                          ariaLabel="Kelompok"
                          options={filteredKelompok.map((k) => ({ value: k.nama, label: k.nama }))}
                        />
                      </div>
                    </div>
                  )}

                  {inviteScope.scopeRole === "admin_desa" && !inviteScope.kelompokId && (
                    <div className="field">
                      <label>Kelompok</label>
                      <Select
                        value={form.kelompok}
                        onChange={(v) => setForm({ ...form, kelompok: v })}
                        ariaLabel="Kelompok"
                        options={filteredKelompok.map((k) => ({ value: k.nama, label: k.nama }))}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canNext1 || needAsal}
                    onClick={() => setS(2)}
                    style={{ marginTop: 6 }}
                  >
                    Lanjut: Domisili &amp; Akun
                  </button>
                </div>
              )}

              {/* ── STEP 2: DOMISILI & AKUN LOGIN ── */}
              {s === 2 && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div className="field">
                    <label>Domisili Tempat Tinggal *</label>
                    <textarea
                      rows={2}
                      value={form.domisiliAnak}
                      onChange={(e) => setForm({ ...form, domisiliAnak: e.target.value })}
                      placeholder="Alamat tempat tinggal / kos saat ini"
                    />
                  </div>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.isOrtuSama}
                      onChange={(e) => setForm({ ...form, isOrtuSama: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                    />
                    Domisili orang tua sama dengan tempat tinggal saya
                  </label>

                  {!form.isOrtuSama && (
                    <div className="field">
                      <label>Domisili Orang Tua *</label>
                      <textarea
                        rows={2}
                        value={form.domisiliOrtu}
                        onChange={(e) => setForm({ ...form, domisiliOrtu: e.target.value })}
                        placeholder="Alamat orang tua jika berbeda"
                      />
                    </div>
                  )}

                  <div className="field">
                    <label>No. WhatsApp Orang Tua</label>
                    <input
                      value={form.noTelpOrtu}
                      onChange={(e) => setForm({ ...form, noTelpOrtu: e.target.value })}
                      placeholder="0812... (opsional)"
                    />
                  </div>

                  {/* Kredensial Akun Login */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: 14,
                    padding: "14px",
                    display: "grid",
                    gap: 10,
                    marginTop: 4,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase" }}>
                      Akun &amp; Kata Sandi Login
                    </div>

                    {/* Google SSO Button Option */}
                    <div style={{
                      background: isGoogleLinked ? "#f0fdf4" : "var(--surface-sunken, #f8fafc)",
                      border: isGoogleLinked ? "1px solid #86efac" : "1px solid var(--line)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <GoogleIcon size={16} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: isGoogleLinked ? "#166534" : "var(--ink)" }}>
                          {isGoogleLinked ? email : "Kaitkan Akun Google"}
                        </span>
                      </div>
                      {!isGoogleLinked ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleGoogleConnect}
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Pilih Akun Google
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsGoogleLinked(false)}
                          style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#ffffff", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}
                        >
                          Ganti
                        </button>
                      )}
                    </div>

                    <div className="field">
                      <label>Email Akun Login *</label>
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

                    <div className="form-grid-2">
                      <div className="field">
                        <label>Kata Sandi (Min 8) *</label>
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
                        <label>Ulangi Sandi *</label>
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

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setS(1)}>
                      Kembali
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={!canNext2}
                      onClick={() => setS(3)}
                    >
                      Lanjut: Ringkasan
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: RINGKASAN & KONFIRMASI ── */}
              {s === 3 && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div className="card" style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: 14, display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>
                      {form.nama || "(Nama)"} &bull; {form.pendidikan} &bull; {form.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {form.tempatLahir}, {form.tanggalLahir} &bull; {form.noTelp}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {form.pekerjaan} &bull; {form.kategoriMudaMudi === "perantauan" ? `Perantauan (Asal ${form.asalDaerah})` : "Pribumi"}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Wilayah: {form.desa ? `Desa ${form.desa}` : "Daerah"} {form.kelompok ? `· Kelompok ${form.kelompok}` : ""}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Domisili: {form.domisiliAnak} {form.isOrtuSama ? "(Tinggal bersama ortu)" : `&bull; Ortu: ${form.domisiliOrtu}`}
                    </div>
                    <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 6, marginTop: 4, fontSize: 12 }}>
                      Akun Login: <b>{email}</b>
                    </div>
                  </div>

                  {saveErr && (
                    <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>
                      {saveErr}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setS(2)}>
                      Kembali
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={saving}
                      onClick={() => void handleRegister()}
                    >
                      {saving ? "Menyimpan & Menyiapkan Akun…" : "Simpan & Buat Kartu Anggota"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
