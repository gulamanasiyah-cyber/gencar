"use client";

import { useState, useEffect } from "react";
import { Lock, User, ShieldCheck, Calendar } from "lucide-react";
import Swal from "sweetalert2";

export default function KatalogLoginPage() {
  const [unik, setUnik] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "error" | "waiting">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const verify = async () => {
    if (!unik.trim()) return;
    setStatus("verifying");
    setErrorMsg("");

    let deviceId = localStorage.getItem("mandiri_device_id");
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("mandiri_device_id", deviceId);
    }

    try {
      const p = new URLSearchParams();
      p.set("nomorUnik", unik.trim());
      p.set("deviceId", deviceId);
      const qs = p.toString();
      
      const res = await fetch(`/api/public/mandiri/katalog/check-status?${qs}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Unexpected response: ${res.status}`);
      }

      const resData = await res.json();

      if (resData.status === "attended" || resData.status === "waiting") {
        localStorage.setItem("attended_nomor_unik", resData.nomorUnik || unik.trim());
        localStorage.setItem("attended_session_token", resData.sessionToken);
        localStorage.setItem("attended_nomor_urut_peserta", resData.nomorUrut);
        localStorage.setItem("attended_role", resData.role || "Peserta");

        if (typeof window !== "undefined" && resData.noTelp) {
          import("@/lib/fcm-client").then(({ registerFCM }) => {
            registerFCM(resData.noTelp);
          }).catch((e) => console.error("FCM login registration failed:", e));
        }

        Swal.fire({ title: `Selamat Datang, ${resData.nama}!`, text: "Berhasil masuk ke Katalog Peserta.", icon: "success", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
        
        setTimeout(() => {
          window.location.href = "/mandiri/katalog";
        }, 1500);
      } else if (resData.status === "multi_login") {
        setErrorMsg("Nomor Unik ini sudah digunakan di perangkat lain (Single Session).");
        setStatus("error");
      } else if (resData.status === "not_found") {
        setErrorMsg("Nomor Unik tidak ditemukan. Pastikan Anda sudah terdaftar.");
        setStatus("error");
      } else {
        setErrorMsg(resData.error || "Terjadi kesalahan saat verifikasi.");
        setStatus("error");
      }
    } catch (e: any) {
      console.error("verify error:", e);
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setErrorMsg("Gagal terhubung ke server. Periksa koneksi internet Anda.");
      } else {
        setErrorMsg("Terjadi kesalahan. Coba lagi dalam beberapa saat.");
      }
      setStatus("error");
    }
  };

  return (
    <div className="login-backdrop">
      <div className="lm-box">
        <div className="lm-header">
          <div className="lm-icon-badge">
            <Lock size={28} className="text-blue-500" />
          </div>
          <h2>Login Katalog</h2>
          <p>Masukkan Nomor Unik atau Nomor Peserta Anda</p>
        </div>

        <div className="lm-body">
          <div className="input-field">
            <User size={18} className="input-icon" />
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="Contoh: MND123456 atau PNB123456"
              value={unik}
              onChange={(e) => setUnik(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              autoFocus
            />
          </div>

          <button
            className={`login-btn ${status === "verifying" ? "loading" : ""}`}
            onClick={verify}
            disabled={status === "verifying" || !unik.trim()}
          >
            {status === "verifying" ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="spinner-small"></span> Memproses...
              </span>
            ) : "Masuk"}
          </button>

          {status === "error" && (
            <div className="error-alert">
              <ShieldCheck size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === "waiting" && (
            <div className="warning-alert">
              <Calendar size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .login-backdrop {
          min-height: 100vh;
          background: #f1f5f9;
          background-image:
            radial-gradient(at 0% 0%, rgba(59,130,246,0.1) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(236,72,153,0.1) 0px, transparent 50%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .lm-box {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.5);
          animation: modalFadeIn 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes modalFadeIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        .lm-header { text-align:center; margin-bottom:32px; display: block; }
        .lm-icon-badge { width:64px; height:64px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; border-radius:20px; margin:0 auto 20px; box-shadow:inset 0 0 0 1px rgba(59,130,246,0.1); }
        h2 { font-size:26px; font-weight:800; color:#1e293b; margin-bottom:8px; letter-spacing:-0.025em; }
        p { color:#64748b; font-size:15px; margin:0; line-height:1.5; }
        .lm-body { display:flex; flex-direction:column; gap:20px; }
        .input-field { position:relative; }
        .input-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#94a3b8; }
        input {
          width:100%; background:#f8fafc; border:2px solid #e2e8f0; border-radius:16px;
          font-size:16px; font-weight:600; transition:all 0.2s; color:#1e293b;
          padding: 16px 16px 16px 44px; box-sizing: border-box;
        }
        input:focus { background:white; border-color:#3b82f6; box-shadow:0 0 0 4px rgba(59,130,246,0.1); outline:none; }
        .login-btn { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; padding:16px; border-radius:16px; font-size:16px; font-weight:700; cursor:pointer; transition:all 0.3s; display:flex; align-items:center; justify-content:center; width:100%; }
        .login-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 20px -5px rgba(59,130,246,0.4); }
        .login-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .error-alert { padding:14px; background:#fef2f2; border-radius:12px; color:#b91c1c; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; border:1px solid #fee2e2; }
        .warning-alert { padding:14px; background:#fffbeb; border-radius:12px; color:#92400e; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; border:1px solid #fef3c7; }
        .spinner-small { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
