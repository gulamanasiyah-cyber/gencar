"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Check, RefreshCw, Image as ImageIcon, Info } from "lucide-react";
import Swal from "sweetalert2";

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  maxSizeMb?: number;
}

export default function PhotoUpload({ value, onChange, label, helperText, maxSizeMb = 10 }: PhotoUploadProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setPreview(value);
    }
  }, [value]);

  const startCamera = async () => {
    try {
      // Check if secure context
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error("Akses kamera membutuhkan koneksi HTTPS.");
      }

      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(s);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      Swal.fire({
        icon: "error",
        title: "Kamera Tidak Diakses",
        text: err.message.includes("HTTPS")
          ? err.message
          : "Mohon izinkan akses kamera untuk mengambil foto. Jika tidak bisa, gunakan menu 'Pilih File' di bawah.",
        confirmButtonColor: "#3b82f6"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) {
      Swal.fire({ icon: "warning", title: "Kamera Belum Siap", text: "Tunggu sebentar lalu coba lagi.", confirmButtonColor: "#3b82f6" });
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    stopCamera();
    canvas.toBlob((blob) => {
      if (blob && blob.size > 100) {
        uploadFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      } else {
        Swal.fire({ icon: "error", title: "Gagal Ambil Foto", text: "Tidak dapat memproses gambar dari kamera. Coba gunakan Galeri Perangkat.", confirmButtonColor: "#3b82f6" });
      }
    }, "image/jpeg", 0.85);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading UI immediately if it's HEIC because conversion takes time
    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith(".heic") || fileName.endsWith(".heif") || file.type.includes("heic");

    setUploading(true);

    let fileToProcess = file;

    // Handle HEIC/HEIF conversion for iOS compatibility
    if (isHeic) {
      try {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });

        const blobArray = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        fileToProcess = new File([blobArray], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: "image/jpeg"
        });
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        // Fallback to original file, server might handle it
      }
    }

    // Validate format after possible conversion
    const allowedExts = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const fileExt = fileToProcess.name.split('.').pop()?.toLowerCase() || "";

    if (!allowedExts.includes(fileExt) && !fileToProcess.type.startsWith("image/")) {
      setUploading(false);
      Swal.fire({
        icon: "error",
        title: "Format Tidak Didukung",
        text: `Format file ${fileExt.toUpperCase()} tidak didukung. Mohon gunakan JPG, PNG, WEBP, atau HEIC.`,
        confirmButtonColor: "#3b82f6"
      });
      e.target.value = "";
      return;
    }

    // Max size check
    if (fileToProcess.size > maxSizeMb * 1024 * 1024) {
      setUploading(false);
      Swal.fire({
        icon: "error",
        title: "File Terlalu Besar",
        text: `Ukuran foto maksimal adalah ${maxSizeMb} MB.`,
        confirmButtonColor: "#3b82f6"
      });
      e.target.value = "";
      return;
    }

    uploadFile(fileToProcess);
    e.target.value = ""; // Reset
  };

  const toJpegFile = (source: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        const MAX_DIM = 800;
        let { width, height } = img;
        if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          } else {
            resolve(source);
          }
        }, "image/jpeg", 0.75);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(source); };
      img.src = url;
    });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const compressed = await toJpegFile(file);
      const fd = new FormData();
      fd.append("file", compressed);

      const res = await fetch("/api/upload", { method: "POST", body: fd });

      let json: any;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server error (${res.status}): ${text.substring(0, 200)}`);
      }

      if (json.url) {
        setPreview(json.url);
        onChange(json.url);
        Swal.fire({
          icon: 'success',
          title: 'Foto Berhasil Diunggah!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        throw new Error(json.error || "Gagal mengunggah foto");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setPreview(value || null);

      let errorMessage = err.message || "Terjadi kesalahan saat mengunggah foto.";
      Swal.fire({
        icon: "error",
        title: "Upload Gagal",
        text: errorMessage,
        confirmButtonColor: "#3b82f6"
      });
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="photo-upload-container" style={{ width: "100%" }}>
      {label && (
        <label className="form-label" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "var(--text)" }}>
          {label}
        </label>
      )}

      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "200px",
        height: "200px",
        margin: "0 auto",
        borderRadius: "20px",
        overflow: "hidden",
        background: "#f1f5f9",
        border: "2px dashed #cbd5e1",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: preview ? "0 10px 25px -5px rgba(0, 0, 0, 0.1)" : "none"
      }} onClick={() => !uploading && fileInputRef.current?.click()}>
        {preview ? (
          <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Photo Preview" />
        ) : (
          <>
            <ImageIcon size={48} color="#94a3b8" />
            <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: "12px", fontWeight: "500" }}>Pilih Foto Profil</p>
          </>
        )}

        {uploading && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(255, 255, 255, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backdropFilter: "blur(2px)"
          }}>
            <div className="spinner" style={{ border: "3px solid #f3f3f3", borderTop: "3px solid #3b82f6", borderRadius: "50%", width: "30px", height: "30px", animation: "spin 1s linear infinite" }}></div>
            <p style={{ marginTop: "12px", fontSize: "12px", fontWeight: "700", color: "#3b82f6" }}>Memproses...</p>
          </div>
        )}
      </div>

      <div style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        color: "#d97706",
        padding: "8px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        textAlign: "center",
        marginTop: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px"
      }}>
        <Info size={14} /> Perhatian: Ukuran maksimal foto {maxSizeMb} MB
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
        <button
          type="button"
          onClick={startCamera}
          disabled={uploading}
          className="btn-camera"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#eff6ff",
            color: "#2563eb",
            border: "none",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#dbeafe")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#eff6ff")}
        >
          <Camera size={18} /> Ambil Foto
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            color: "#475569",
            border: "1px solid #e2e8f0",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
        >
          <Upload size={18} /> Galeri Perangkat
        </button>

        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {helperText && (
        <p style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "12px",
          textAlign: "center",
          lineHeight: "1.5",
          maxWidth: "280px",
          margin: "12px auto 0"
        }}>
          {helperText}
        </p>
      )}

      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.95)", zIndex: 99999, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(8px)"
        }}>
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "500px",
            aspectRatio: "3/4",
            background: "#000",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />

            {/* Guide Overlay */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "75%",
              height: "65%",
              border: "2px dashed rgba(255,255,255,0.4)",
              borderRadius: "50%",
              pointerEvents: "none",
              boxShadow: "0 0 0 1000px rgba(0,0,0,0.3)"
            }}></div>

            <button
              type="button"
              onClick={stopCamera}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                border: "none",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                zIndex: 20
              }}>
              <X size={20} />
            </button>

            <div style={{
              position: "absolute",
              bottom: "30px",
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "24px",
              padding: "0 20px"
            }}>
              <button
                type="button"
                onClick={capturePhoto}
                style={{
                  background: "white",
                  color: "#1e293b",
                  border: "none",
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 0 30px rgba(255,255,255,0.4)",
                  transition: "transform 0.1s active"
                }}
              >
                <div style={{ width: "56px", height: "56px", border: "3px solid #1e293b", borderRadius: "50%" }}></div>
              </button>
            </div>
          </div>

          <p style={{ color: "white", marginTop: "24px", fontSize: "14px", fontWeight: "600", letterSpacing: "0.5px", background: "rgba(255,255,255,0.1)", padding: "8px 20px", borderRadius: "20px" }}>
            Posisikan wajah di dalam garis
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 767px) {
          .btn-camera {
            /* Keep it visible but potentially warn if not HTTPS */
          }
        }
      `}</style>

    </div>
  );
}
