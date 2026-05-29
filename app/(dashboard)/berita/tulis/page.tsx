"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";


export default function TulisBeritaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ judul: "", ringkasan: "", konten: "", coverImage: "", tipe: "berita" });
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
      const res = await fetch("/api/berita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
      
      setSuccess(true);
      
      // SweetAlert2 Success
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Berita Anda berhasil diajukan dan sedang menunggu persetujuan admin.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });

      router.push("/berita");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Tulis Berita" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Tulis Berita Baru</h2>
            <p>Berita kejadian atau kegiatan akan diajukan ke admin untuk dipublikasikan</p>
          </div>
          <button className="btn btn-secondary" onClick={() => router.back()}>← Kembali</button>
        </div>

        <div className="card" style={{ maxWidth: 860 }}>
          <div className="card-body">
            {success && (
              <div className="alert alert-success">
                ✅ Berita berhasil diajukan! Menunggu persetujuan admin...
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="form-group">
                  <label className="form-label">Judul Berita <span className="required">*</span></label>
                  <input name="judul" className="form-control" style={{ fontSize: 18, fontWeight: 600, padding: "10px 12px" }} value={form.judul} onChange={handleChange} required placeholder="Judul berita yang menarik..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Ringkasan</label>
                  <textarea name="ringkasan" className="form-control" rows={3} value={form.ringkasan} onChange={handleChange} placeholder="Ringkasan singkat berita (opsional)..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Konten Berita <span className="required">*</span></label>
                  <textarea
                    name="konten"
                    className="form-control"
                    value={form.konten}
                    onChange={handleChange}
                    required
                    placeholder="Laporan berita selengkapnya..."
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
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>📌 Tips Menulis Berita</h4>
                    <ul style={{ fontSize: 12, color: "#64748b", paddingLeft: 16 }}>
                      <li>Gunakan judul yang informatif dan faktual.</li>
                      <li>Jelaskan 5W1H (Siapa, Apa, Kapan, Dimana, Mengapa).</li>
                      <li>Gunakan kalimat yang jelas dan bahasa jurnalistik ringan.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 flex gap-2" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Mengajukan..." : "Ajukan Berita"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="alert alert-info" style={{ maxWidth: 760, marginTop: 16 }}>
          ℹ️ Berita yang diajukan akan masuk status <strong>pending</strong> dan perlu disetujui oleh admin sebelum dipublikasikan.
        </div>
      </div>
    </div>
  );
}
