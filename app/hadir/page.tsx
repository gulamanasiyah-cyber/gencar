"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

function HadirContent() {
  const searchParams = useSearchParams();
  const kegiatanId = searchParams.get("kegiatanId");
  
  const [loadingKegiatan, setLoadingKegiatan] = useState(true);
  const [kegiatan, setKegiatan] = useState<any>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ nama: string } | null>(null);

  useEffect(() => {
    // Fetch Profil
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setProfile(data);
        }
        setLoadingProfile(false);
      })
      .catch(() => {
        setLoadingProfile(false);
      });

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || !profile.nomorUnik || !kegiatanId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kegiatanId, nomorUnik: profile.nomorUnik }),
      });
      const data = await res.json();

      if (res.status === 409) {
        Swal.fire({
          icon: "info",
          title: "Sudah Hadir",
          text: "Anda sudah tercatat hadir untuk kegiatan ini.",
        });
        setSuccess({ nama: profile.nama });
      } else if (!res.ok) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error || "Gagal mencatat absensi.",
        });
      } else {
        setSuccess({ nama: data.generusNama || profile.nama });
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

  if (loadingKegiatan || loadingProfile) {
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
          </div>
        ) : (
          <div>
            {!profile ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <p style={{ marginBottom: 16 }}>Silakan masuk ke akun Anda terlebih dahulu untuk mencatat kehadiran.</p>
                <a href="/login" className="btn btn-primary btn-full">
                  Login untuk Absen
                </a>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ marginBottom: 24 }}>
                  Masuk sebagai: <br />
                  <strong style={{ fontSize: 18, color: "var(--navy)" }}>{profile.nama}</strong>
                </p>
                <button 
                  onClick={() => handleSubmit()} 
                  className="btn btn-primary btn-full" 
                  disabled={submitting}
                >
                  {submitting ? "Memproses..." : "Konfirmasi Kehadiran Saya"}
                </button>
              </div>
            )}
          </div>
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
