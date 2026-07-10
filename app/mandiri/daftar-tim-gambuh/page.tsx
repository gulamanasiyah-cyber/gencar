"use client";

import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Link from "next/link";

interface Daerah { id: number; nama: string; kota: string; }
interface Desa { id: number; nama: string; mandiriDaerahId: number; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }
interface RegisteredIdentity { id: string; nama: string; tipe: string; foto?: string | null; }

export default function DaftarTimGambuhPage() {
  const [form, setForm] = useState({
    nama: "",
    umur: "",
    noTelp: "",
    tipe: "PNKB",
    daerahId: "",
    desaId: "",
    kelompokId: "",
    foto: "",
  });

  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [filteredKelompokList, setFilteredKelompokList] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredIdentity, setRegisteredIdentity] = useState<RegisteredIdentity | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  // Live Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize and manage camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      if (!showCamera) return;
      try {
        setCameraError(null);
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Gagal membuka kamera:", err);
        setCameraError(
          "Gagal mengakses kamera. Silakan pastikan izin kamera diizinkan untuk situs ini."
        );
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);
    };
  }, [showCamera, facingMode]);

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the center square of the video frame
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleUsePhoto = async () => {
    if (!capturedImage) return;
    try {
      setUploadingFoto(true);
      setShowCamera(false);

      // Convert dataURL to Blob/File and upload
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });

      await handleFotoUpload(file);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal Menggunakan Foto", text: err.message });
    } finally {
      setCapturedImage(null);
    }
  };

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

  useEffect(() => {
    Promise.all([
      fetch("/api/public/mandiri/settings?key=mandiri_registration_status").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_daftar_tim_gambuh_status").then(r => r.json())
    ]).then(([regStat, timStat]) => {
      // If either the main registration is closed (0) or tim gambuh is explicitly closed
      if (regStat.value === "0" || timStat.value === "closed") {
        setIsClosed(true);
      }
    }).catch(console.error);

    Promise.all([
      fetch("/api/public/mandiri/daerah").then((r) => r.json()),
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok").then((r) => r.json()),
    ]).then(([daerahs, desas, kelompoks]) => {
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
      }
      if (Array.isArray(desas)) {
        setDesaList(desas);
      }
      if (Array.isArray(kelompoks)) {
        setKelompokList(kelompoks);
      }
    });
  }, []);

  useEffect(() => {
    if (form.daerahId) {
      setFilteredDesaList(desaList.filter(d => d.mandiriDaerahId === Number(form.daerahId)));
    } else {
      setFilteredDesaList([]);
    }
    setForm(prev => ({ ...prev, desaId: "", kelompokId: "" }));
  }, [form.daerahId, desaList]);

  useEffect(() => {
    if (form.desaId) {
      setFilteredKelompokList(kelompokList.filter(k => k.mandiriDesaId === Number(form.desaId)));
    } else {
      setFilteredKelompokList([]);
    }
    setForm(prev => ({ ...prev, kelompokId: "" }));
  }, [form.desaId, kelompokList]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoUpload = async (file?: File) => {
    if (!file) return;

    // Check size limit: 1 MB = 1048576 bytes
    const MAX_SIZE = 1 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      Swal.fire({
        icon: "error",
        title: "File Terlalu Besar",
        text: "Ukuran foto profil maksimal adalah 1 MB. Silakan pilih foto dengan ukuran lebih kecil.",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }

    setUploadingFoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Gagal mengupload foto");
      }

      setForm((prev) => ({ ...prev, foto: data.url }));
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.foto) {
        Swal.fire({ icon: "warning", title: "Foto Belum Diunggah", text: "Mohon unggah foto profil Anda terlebih dahulu." });
        setLoading(false);
        return;
      }

      if (!form.nama || !form.umur || !form.noTelp || !form.tipe || !form.daerahId || !form.desaId || !form.kelompokId) {
        Swal.fire({ icon: "warning", title: "Data Belum Lengkap", text: "Mohon isi semua data yang diperlukan." });
        setLoading(false);
        return;
      }
      
      if (form.noTelp.replace(/[^0-9]/g, "").length < 10) {
        Swal.fire({ icon: "warning", title: "Nomor Tidak Valid", text: "Nomor WhatsApp minimal 10 angka." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/daftar-tim-gambuh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      const identity = {
        id: String(data.id || "").trim(),
        nama: String(data.nama || form.nama).trim(),
        tipe: String(data.tipe || form.tipe).trim(),
        foto: data.foto || form.foto || null,
      };

      if (identity.id) {
        try {
          localStorage.setItem("my_tim_pnkb_gambuh_id", identity.id);
          localStorage.setItem("my_tim_pnkb_gambuh_nama", identity.nama);
          localStorage.setItem("my_tim_pnkb_gambuh_tipe", identity.tipe);
          if (identity.foto) {
            localStorage.setItem("my_tim_pnkb_gambuh_foto", identity.foto);
          }
        } catch (storageErr) {
          console.warn("Gagal menyimpan identitas Tim Gambuh di browser:", storageErr);
        }
        setRegisteredIdentity(identity);
      }

      setSuccess(true);
      Swal.fire({ icon: "success", title: "Berhasil!", text: `Anda telah terdaftar sebagai ${form.tipe}.` });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>👋</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Sukses!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Anda telah berhasil mendaftar sebagai <b>{form.tipe}</b>.
          </p>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
            {registeredIdentity?.foto && (
              <img
                src={registeredIdentity.foto}
                alt={registeredIdentity.nama}
                style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", marginBottom: "12px", border: "2px solid #dbeafe" }}
              />
            )}
            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#64748b" }}>Nama Terdaftar:</p>
            <h3 style={{ margin: 0, color: "#0f172a" }}>{registeredIdentity?.nama || form.nama}</h3>
          </div>
          <Link href="/mandiri/tim-gambuh" className="btn btn-primary btn-full" style={{ padding: "15px", fontSize: "16px", fontWeight: "700" }}>
            Buka Panel Tim Gambuh
          </Link>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>⌛</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Ditutup</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Pendaftaran Tim Gambuh saat ini sedang ditutup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: "500px" }}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Pendaftaran Tim Gambuh</p>
          </div>
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text)", marginBottom: "12px" }}>
            Pendaftaran Tim Gambuh
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Silakan masukkan nama Anda untuk mendaftar sebagai Tim Gambuh di Romantic Room.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ textAlign: "center" }}>
              <label className="form-label" style={{ textAlign: "left", display: "block" }}>Foto Profil <span className="required">*</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  fontSize: "28px",
                  fontWeight: 800,
                  border: "2px solid #dbeafe",
                  flexShrink: 0,
                }}>
                  {form.foto ? (
                    <img src={form.foto} alt="Foto profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (form.nama || "T").charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <label className="btn btn-secondary" style={{ cursor: uploadingFoto ? "not-allowed" : "pointer", display: "inline-flex", margin: 0 }}>
                      {uploadingFoto ? "Mengunggah..." : "Upload Foto"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        disabled={uploadingFoto}
                        onChange={(e) => handleFotoUpload(e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ cursor: uploadingFoto ? "not-allowed" : "pointer", display: "inline-flex", gap: "6px" }}
                      disabled={uploadingFoto}
                      onClick={() => {
                        setCapturedImage(null);
                        setShowCamera(true);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      Kamera Live
                    </button>
                    {form.foto && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setForm((prev) => ({ ...prev, foto: "" }))}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <small style={{ color: "var(--text-muted)", fontSize: "11px", display: "block" }}>Format JPG, PNG, WEBP. Maksimal 1MB.</small>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
            </div>

            <div className="form-group">
              <label className="form-label">Umur <span className="required">*</span></label>
              <input type="number" name="umur" className="form-control" value={form.umur} onChange={handleChange} required min="1" placeholder="Masukkan umur Anda" />
            </div>

            <div className="form-group">
              <label className="form-label">Nomor WhatsApp <span className="required">*</span></label>
              <input type="tel" name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required minLength={10} placeholder="Contoh: 081234567890" pattern="[0-9]*" inputMode="numeric" />
              <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>Minimal 10 angka.</small>
            </div>

            <div className="form-group">
              <label className="form-label">Tipe Tim Gambuh <span className="required">*</span></label>
              <select name="tipe" className="form-control" value={form.tipe} onChange={handleChange} required>
                <option value="PNKB">PNKB</option>
                <option value="Ibu Gambuh">Ibu Gambuh</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Daerah <span className="required">*</span></label>
              <select name="daerahId" className="form-control" value={form.daerahId} onChange={handleChange} required>
                <option value="">-- Pilih Daerah --</option>
                {daerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Desa <span className="required">*</span></label>
              <select name="desaId" className="form-control" value={form.desaId} onChange={handleChange} disabled={!form.daerahId} required>
                <option value="">-- Pilih Desa --</option>
                {filteredDesaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kelompok <span className="required">*</span></label>
              <select name="kelompokId" className="form-control" value={form.kelompokId} onChange={handleChange} disabled={!form.desaId} required>
                <option value="">-- Pilih Kelompok --</option>
                {filteredKelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || uploadingFoto}>
              {uploadingFoto ? "Menunggu Upload Foto..." : loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </div>
        </form>
      </div>

      {showCamera && (
        <div className="modal-overlay" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "16px",
          backdropFilter: "blur(4px)",
        }}>
          <div className="modal" style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            width: "100%",
            maxWidth: "480px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--border)",
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <h3 className="modal-title" style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Ambil Foto Live
              </h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setShowCamera(false);
                  setCapturedImage(null);
                }}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}>
              {cameraError ? (
                <div style={{
                  color: "#ef4444",
                  background: "#fef2f2",
                  padding: "16px",
                  borderRadius: "8px",
                  textAlign: "center",
                  fontSize: "14px",
                  width: "100%",
                }}>
                  {cameraError}
                </div>
              ) : (
                <div style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1/1",
                  background: "#000",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
                }}>
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Captured"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: facingMode === "user" ? "scaleX(-1)" : "none",
                        }}
                      />
                      {/* Grid guidelines overlay for face framing */}
                      <div style={{
                        position: "absolute",
                        inset: "15%",
                        border: "2px dashed rgba(255, 255, 255, 0.4)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                      }} />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}>
              <div>
                {!capturedImage && !cameraError && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSwitchCamera}
                    style={{ padding: "8px 12px", fontSize: "13px" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    Putar Kamera
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCamera(false);
                    setCapturedImage(null);
                  }}
                >
                  Batal
                </button>

                {capturedImage ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCapturedImage(null)}
                    >
                      Ulangi
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleUsePhoto}
                    >
                      Gunakan Foto
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!!cameraError || !cameraStream}
                    onClick={handleCapture}
                  >
                    Ambil Foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
