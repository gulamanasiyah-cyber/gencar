"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

function HadirContent() {
  const searchParams = useSearchParams();
  const kegiatanId = searchParams.get("kegiatanId");
  
  const [loadingKegiatan, setLoadingKegiatan] = useState(true);
  const [kegiatan, setKegiatan] = useState<any>(null);
  
  const [nomorUnik, setNomorUnik] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ nama: string } | null>(null);

  useEffect(() => {
    if (kegiatanId) {
      fetch(`/api/public/kegiatan/${kegiatanId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((data) => {
          setKegiatan(data);
          setLoadingKegiatan(false);
        })
        .catch(() => {
          setLoadingKegiatan(false);
        });
    } else {
      setLoadingKegiatan(false);
    }
  }, [kegiatanId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorUnik || !kegiatanId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kegiatanId, nomorUnik }),
      });
      const data = await res.json();

      if (res.status === 409) {
        Swal.fire({
          icon: "info",
          title: "Sudah Hadir",
          text: "Anda sudah tercatat hadir untuk kegiatan ini.",
        });
      } else if (!res.ok) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error || "Gagal mencatat absensi.",
        });
      } else {
        setSuccess({ nama: data.generusNama });
        setNomorUnik("");
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Kehadiran Anda berhasil dicatat!",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Terjadi kesalahan jaringan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingKegiatan) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!kegiatan) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Kegiatan Tidak Ditemukan</h2>
          <p className="text-muted">Pastikan Anda memindai QR Code yang valid dari panitia.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", padding: 20 }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: "var(--primary-light)", color: "var(--primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Absensi Kegiatan</h2>
          <div style={{ fontWeight: 600, fontSize: 18, color: "var(--primary)" }}>{kegiatan.judul}</div>
          <div className="text-sm text-muted" style={{ marginTop: 4 }}>
            {kegiatan.tanggal} {kegiatan.jam ? `• ${kegiatan.jam}` : ""}
          </div>
          {kegiatan.lokasi && (
            <div className="text-sm text-muted" style={{ marginTop: 4 }}>📍 {kegiatan.lokasi}</div>
          )}
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: 24, background: "rgba(22,163,74,0.1)", borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: "var(--success)" }}>Kehadiran Tercatat!</div>
            <div style={{ marginTop: 8 }}>Terima kasih, <strong>{success.nama}</strong>.</div>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 24 }} onClick={() => setSuccess(null)}>
              Input Peserta Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Masukkan Nomor Unik Anda</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: 123456"
                value={nomorUnik}
                onChange={(e) => setNomorUnik(e.target.value)}
                required
                style={{ textAlign: "center", fontSize: 18, letterSpacing: 2, padding: "12px 16px" }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting || !nomorUnik}>
              {submitting ? "Memproses..." : "Konfirmasi Kehadiran"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function HadirPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <HadirContent />
    </Suspense>
  );
}
