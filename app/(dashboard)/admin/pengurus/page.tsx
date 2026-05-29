"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Plus, Trash2, Edit2, X, Upload, ArrowUp, ArrowDown } from "lucide-react";

interface PengurusItem {
  id: string;
  nama: string;
  dapukan: string;
  foto: string | null;
  urutan: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPengurusPage() {
  const [pengurusList, setPengurusList] = useState<PengurusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  
  // Form states
  const [nama, setNama] = useState("");
  const [dapukan, setDapukan] = useState("");
  const [foto, setFoto] = useState("");
  const [urutan, setUrutan] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Location states
  const [lokasiNama, setLokasiNama] = useState("");
  const [lokasiGmaps, setLokasiGmaps] = useState("");
  const [savingLokasi, setSavingLokasi] = useState(false);

  const fetchPengurus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pengurus");
      if (res.ok) {
        const data = await res.json();
        setPengurusList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPengurus();
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.lokasi_nama) setLokasiNama(data.lokasi_nama);
        if (data.lokasi_gmaps) setLokasiGmaps(data.lokasi_gmaps);
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, [fetchPengurus]);

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLokasi(true);
    
    try {
      const [res1, res2] = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "lokasi_nama", value: lokasiNama }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "lokasi_gmaps", value: lokasiGmaps }),
        })
      ]);

      if (res1.ok && res2.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pengaturan lokasi berhasil disimpan!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", "Gagal menyimpan pengaturan lokasi", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat menyimpan lokasi", "error");
    } finally {
      setSavingLokasi(false);
    }
  };

  const embedUrl = getEmbedUrl(lokasiGmaps, lokasiNama);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    Swal.fire({
      title: "Mengunggah Foto...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setFoto(data.url);
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Foto berhasil diunggah!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data.error || "Gagal mengunggah foto", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat mengunggah foto", "error");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setNama("");
    setDapukan("");
    setFoto("");
    setUrutan(0);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !dapukan.trim()) {
      Swal.fire("Peringatan", "Nama dan dapukan wajib diisi", "warning");
      return;
    }

    const payload = {
      id: editingId,
      nama,
      dapukan,
      foto: foto || null,
      urutan,
    };

    const method = isEditing ? "PUT" : "POST";
    
    try {
      const res = await fetch("/api/admin/pengurus", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: isEditing
            ? "Data pengurus berhasil diperbarui"
            : "Pengurus baru berhasil ditambahkan",
          timer: 1500,
          showConfirmButton: false,
        });
        resetForm();
        fetchPengurus();
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan data pengurus", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat menghubungi server", "error");
    }
  };

  const handleEdit = (item: PengurusItem) => {
    setNama(item.nama);
    setDapukan(item.dapukan);
    setFoto(item.foto || "");
    setUrutan(item.urutan);
    setIsEditing(true);
    setEditingId(item.id);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Hapus Pengurus?",
      text: "Data pengurus ini akan dihapus secara permanen dari sistem!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/pengurus?id=${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Terhapus",
            text: "Data pengurus berhasil dihapus",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchPengurus();
        } else {
          const data = await res.json();
          Swal.fire("Gagal", data.error || "Gagal menghapus pengurus", "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Terjadi kesalahan saat menghapus pengurus", "error");
      }
    }
  };

  return (
    <div>
      <Topbar title="Admin - Kelola Pengurus Organisasi" role={userRole} />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola Pengurus Organisasi</h2>
            <p>Tambah, edit, dan atur susunan pengurus untuk ditampilkan di halaman Organisasi</p>
          </div>
        </div>

        <div className="responsive-grid-2">
          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {isEditing ? "Edit Pengurus" : "Tambah Pengurus Baru"}
              </span>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama Lengkap Pengurus"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Dapukan / Jabatan
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Ketua, Sekretaris, Humas"
                    value={dapukan}
                    onChange={(e) => setDapukan(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Urutan (contoh: 1, 2, 3)"
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value))}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  />
                  <small className="text-muted" style={{ display: "block", marginTop: 4, fontSize: "11px" }}>
                    Angka lebih kecil akan tampil di urutan atas/pertama.
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Foto Profile
                  </label>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ width: "80px", height: "80px", border: "2px dashed var(--border)", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", background: "var(--bg)" }}>
                      {foto ? (
                        <img src={foto} alt="Preview Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="text-muted" style={{ fontSize: "11px" }}>No Photo</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="pengurus-photo-upload"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                      />
                      <label htmlFor="pengurus-photo-upload" className="btn btn-primary" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "13px" }}>
                        <Upload size={14} /> Unggah Foto
                      </label>
                      {foto && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setFoto("")}
                          style={{ marginLeft: 8, padding: "6px 12px", fontSize: "12px" }}
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {isEditing ? "Perbarui Data" : "Tambah Pengurus"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                      style={{ padding: "10px 16px" }}
                    >
                      <X size={16} /> Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Card */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">Daftar Pengurus</span>
              <span className="badge badge-blue">{pengurusList.length}</span>
            </div>
            
            <div className="card-body">
              {loading ? (
                <div className="loading" style={{ padding: "40px 0" }}><div className="spinner" /></div>
              ) : pengurusList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--gray)" }}>
                  Belum ada data pengurus organisasi.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pengurusList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "var(--bg)",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", background: "#fff", border: "2px solid var(--border)" }}>
                          {item.foto ? (
                            <img src={item.foto} alt={item.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-lt)", color: "var(--primary)", fontWeight: "bold", fontSize: "18px" }}>
                              {item.nama.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "15px" }}>{item.nama}</div>
                          <div style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 500 }}>{item.dapukan}</div>
                          <div style={{ fontSize: "11px", color: "var(--gray)", marginTop: 2 }}>Urutan: {item.urutan}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                          style={{ padding: "6px" }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Hapus"
                          style={{ padding: "6px" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Settings Card */}
        {userRole === "admin" && (
          <div className="card" style={{ marginTop: "24px" }}>
            <div className="card-header">
              <span className="card-title">Pengaturan Lokasi Organisasi</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveLocation} className="responsive-grid-2" style={{ gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Nama Tempat / Kantor
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Masjid Cengkareng"
                      value={lokasiNama}
                      onChange={(e) => setLokasiNama(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Link Google Maps
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
                      value={lokasiGmaps}
                      onChange={(e) => setLokasiGmaps(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={savingLokasi}>
                    {savingLokasi ? "Menyimpan..." : "Simpan Lokasi"}
                  </button>
                </div>

                {/* Map Preview */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>Preview Google Maps:</span>
                  <div style={{ width: "100%", height: "220px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)" }}>
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray)", fontSize: "13px" }}>
                        Masukkan nama tempat dan link Maps untuk melihat preview
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getEmbedUrl(mapsLink: string, placeName: string) {
  if (!mapsLink) {
    if (placeName) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    return "";
  }
  
  // If it's already an iframe source or output=embed
  if (mapsLink.includes("output=embed") || mapsLink.includes("google.com/maps/embed")) {
    return mapsLink;
  }

  // Check if it has coordinates (@lat,lng)
  const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = mapsLink.match(coordRegex);
  if (match) {
    const lat = match[1];
    const lng = match[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // Check if it's a search link with q=
  if (mapsLink.includes("q=")) {
    try {
      const urlObj = new URL(mapsLink);
      const q = urlObj.searchParams.get("q");
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // Fallback to place name or encode the whole link as query
  const query = placeName || mapsLink;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}
