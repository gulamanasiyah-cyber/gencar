"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";


export default function TulisArtikelPage() {
  const router = useRouter();
  const [form, setForm] = useState({ judul: "", ringkasan: "", konten: "", coverImage: "", tipe: "artikel" });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, coverImage: data.url }));
      } else {
        setError(data.error || "Gagal upload gambar");
      }
    } catch {
      setError("Terjadi kesalahan saat upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = "/api/artikel";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
      
      // SweetAlert2 Success
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Artikel Anda berhasil diajukan dan sedang menunggu persetujuan admin.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });

      router.push("/artikel");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Tulis Artikel" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Tulis Artikel Baru</h2>
            <p>Artikel akan diajukan ke admin untuk dipublikasikan</p>
          </div>
          <button className="btn btn-secondary" onClick={() => router.back()}>← Kembali</button>
        </div>

        <div className="card" style={{ maxWidth: 860 }}>
          <div className="card-body">
            {success && (
              <div className="alert alert-success">
                ✅ Artikel berhasil diajukan! Menunggu persetujuan admin...
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="form-group">
                  <label className="form-label">Judul Artikel <span className="required">*</span></label>
                  <input name="judul" className="form-control" style={{ fontSize: 18, fontWeight: 600, padding: "10px 12px" }} value={form.judul} onChange={handleChange} required placeholder="Judul artikel yang menarik..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Ringkasan</label>
                  <textarea name="ringkasan" className="form-control" rows={3} value={form.ringkasan} onChange={handleChange} placeholder="Ringkasan singkat artikel (opsional)..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Konten Artikel <span className="required">*</span></label>
                  <textarea
                    name="konten"
                    className="form-control"
                    value={form.konten}
                    onChange={handleChange}
                    required
                    placeholder="Tulis konten artikel di sini..."
                    style={{ minHeight: 400, lineHeight: 1.8 }}
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="form-group">
                  <label className="form-label">Gambar Sampul</label>
                  <div className="upload-box" style={{ 
                    border: "2px dashed var(--border)", 
                    borderRadius: 8, 
                    padding: 16, 
                    textAlign: "center",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--bg)",
                    cursor: "pointer",
                    position: "relative"
                  }} onClick={() => document.getElementById("fileInput")?.click()}>
                    {form.coverImage ? (
                      <img src={form.coverImage} alt="Cover preview" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4 }} />
                    ) : (
                      <div className="text-muted">
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                        <div style={{ fontSize: 13 }}>Klik untuk upload gambar</div>
                      </div>
                    )}
                    {uploading && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div className="spinner"></div>
                      </div>
                    )}
                  </div>
                  <input id="fileInput" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
                  {form.coverImage && (
                    <button type="button" className="btn btn-sm btn-danger btn-full" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); setForm(p => ({...p, coverImage: ""})) }}>
                      Hapus Gambar
                    </button>
                  )}
                </div>

                <div className="sidebar-info card" style={{ marginTop: 20, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div className="card-body" style={{ padding: 12 }}>
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>📌 Tips Menulis Artikel</h4>
                    <ul style={{ fontSize: 12, color: "#64748b", paddingLeft: 16 }}>
                      <li>Gunakan judul yang ringkas dan padat.</li>
                      <li>Sertakan gambar berkualitas untuk menarik pembaca.</li>
                      <li>Gunakan ringkasan untuk memancing rasa penasaran.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 flex gap-2" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Mengajukan..." : "Ajukan Artikel"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="alert alert-info" style={{ maxWidth: 760, marginTop: 16 }}>
          ℹ️ Artikel yang diajukan akan masuk status <strong>pending</strong> dan perlu disetujui oleh admin sebelum dipublikasikan.
        </div>
      </div>
    </div>
  );
}
