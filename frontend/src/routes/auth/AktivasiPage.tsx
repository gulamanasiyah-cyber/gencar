import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function AktivasiPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get("token") || "").trim();

  const [valid, setValid] = useState<boolean | null>(null);
  const [generusId, setGenerusId] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      setVerifyErr("Link tidak lengkap (token hilang).");
      return;
    }
    let cancel = false;
    apiFetch<{ ok: boolean; generusId?: string }>(`/api/auth/magic/verify?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then((j) => {
        if (cancel) return;
        setValid(true);
        setGenerusId((j as { generusId?: string })?.generusId ?? null);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!token) { setErr("Token tidak tersedia."); return; }
    if (pw.length < 8) { setErr("Password minimal 8 karakter."); return; }
    if (pw !== pw2) { setErr("Konfirmasi password tidak cocok."); return; }
    setBusy(true);
    try {
      await apiFetch<{ success: boolean }>("/api/auth/magic/set-password", {
        method: "POST",
        body: JSON.stringify({ token, password: pw }),
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

  if (done) {
    return (
      <div className="auth-split-layout">
        <div className="auth-form-pane" style={{ placeItems: "center" }}>
          <div className="auth-form-inner" style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "#16a34a" }}><CheckCircle2 size={28} /></div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>Password berhasil dibuat</h1>
            <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>Akun kamu sudah aktif. Silakan login dengan password baru.</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16, width: "100%", padding: "10px 14px", borderRadius: 12 }} onClick={() => navigate("/login", { replace: true })}>Ke halaman login</button>
            {generusId && <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>{generusId.slice(0, 8)}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-layout">
      <div className="auth-form-pane">
        <div className="auth-form-inner" style={{ maxWidth: 460 }}>
          <Link to="/login" className="auth-back-link" style={{ marginBottom: 16 }}>← Kembali ke login</Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--primary, #d03804)", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <ShieldCheck size={14} /> Aktivasi Akses Login
          </div>
          <h1 className="auth-form-title" style={{ marginTop: 8 }}>Buat password pertamamu</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Link ini berlaku <b>15 menit</b> dan <b>sekali pakai</b>. Setelah password dibuat, link langsung hangus.
          </p>

          {valid === null && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }} className="muted">Memeriksa link…</div>
          )}
          {valid === false && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
              {verifyErr ?? "Link tidak valid."}
              <div style={{ marginTop: 10 }}><Link to="/login" className="btn btn-ghost" style={{ padding: "8px 12px" }}>Ke login</Link></div>
            </div>
          )}

          {valid === true && (
            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div className="field">
                <label>Password baru (min 8) *</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Sembunyikan" : "Tampilkan"} style={{ position: "absolute", right: 6, top: 6, width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="field">
                <label>Ulangi password *</label>
                <input type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </div>
              {err && <div style={{ padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>{err}</div>}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%", padding: "10px 14px", borderRadius: 12 }}>
                {busy ? "Menyimpan…" : "Simpan password & aktifkan"}
              </button>
              <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>Setelah ini kamu akan diarahkan ke login.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
