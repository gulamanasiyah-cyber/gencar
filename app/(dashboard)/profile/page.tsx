"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { Sparkles, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  nomorUnik: string;
  nama: string;
  nomorUrut?: number | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string;
  kategoriUsia: string;
  alamat: string | null;
  noTelp: string | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  statusNikah: string;
  hobi?: string;
  makananMinumanFavorit?: string;
  suku?: string;
  foto?: string;
  status: string;
  desaNama: string | null;
  kelompokNama: string | null;
  role?: string;
  timGambuhId?: string;
  timGambuhDaerahId?: number;
  timGambuhDesaId?: number;
  timGambuhKelompokId?: number;
  timGambuhDaerahNama?: string;
  timGambuhDesaNama?: string;
  timGambuhKelompokNama?: string;
  timGambuhTipe?: string;
  instagram?: string | null;
  kota?: string | null;
  mandiriDesaNama?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isAuthorized] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: "",
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "L",
    kategoriUsia: "SMA",
    alamat: "",
    noTelp: "",
    pendidikan: "",
    pekerjaan: "",
    statusNikah: "Belum Menikah",
    hobi: "",
    makananMinumanFavorit: "",
    suku: "",
    foto: "",
    tgDaerahId: "",
    tgDesaId: "",
    timGambuhDaerahId: "",
    timGambuhDesaId: "",
    timGambuhKelompokId: "",
    tipeTimGambuh: "",
    umur: "",
  });
  const [daerahList, setDaerahList] = useState<any[]>([]);
  const [desaList, setDesaList] = useState<any[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [filteredKelompokList, setFilteredKelompokList] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idCardCanvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);


  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setEditForm({
          nama: json.nama || "",
          tempatLahir: json.tempatLahir || "",
          tanggalLahir: json.tanggalLahir || "",
          jenisKelamin: json.jenisKelamin || "L",
          kategoriUsia: json.kategoriUsia || "SMA",
          alamat: json.alamat || "",
          noTelp: json.noTelp || "",
          pendidikan: json.pendidikan || "",
          pekerjaan: json.pekerjaan || "",
          statusNikah: json.statusNikah || "Belum Menikah",
          hobi: json.hobi || "",
          makananMinumanFavorit: json.makananMinumanFavorit || "",
          suku: json.suku || "",
          foto: json.foto || "",
          tgDaerahId: "",
          tgDesaId: "",
          timGambuhDaerahId: "",
          timGambuhDesaId: "",
          timGambuhKelompokId: "",
          tipeTimGambuh: "",
          umur: "",
        });
        
      }
    } catch {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter desa based on selected daerah for edit form
  useEffect(() => {
    if (editForm.tgDaerahId) {
      setFilteredDesaList(desaList.filter(d => d.mandiriDaerahId === Number(editForm.tgDaerahId)));
    } else {
      setFilteredDesaList([]);
    }
  }, [editForm.tgDaerahId, desaList]);

  // Filter kelompok based on selected desa for edit form
  useEffect(() => {
    if (editForm.tgDesaId) {
      setFilteredKelompokList(kelompokList.filter(k => k.mandiriDesaId === Number(editForm.tgDesaId)));
    } else {
      setFilteredKelompokList([]);
    }
  }, [editForm.tgDesaId, kelompokList]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (data && (data?.role === "tim_pnkb_gambuh" || data?.role === "tim_pnkb") && data.timGambuhId) {
        if (!editForm.nama.trim() || !editForm.tipeTimGambuh || !editForm.timGambuhDaerahId || !editForm.timGambuhDesaId || !editForm.timGambuhKelompokId) {
          Swal.fire({
            icon: 'warning',
            title: 'Data Belum Lengkap',
            text: 'Nama, tipe tim, asal daerah, asal desa, dan asal kelompok wajib diisi.'
          });
          return;
        }

        const res = await fetch(`/api/admin/tim-gambuh/${data.timGambuhId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama: editForm.nama,
            tipe: editForm.tipeTimGambuh,
            daerahId: editForm.timGambuhDaerahId ? Number(editForm.timGambuhDaerahId) : null,
            desaId: editForm.timGambuhDesaId ? Number(editForm.timGambuhDesaId) : null,
            kelompokId: editForm.timGambuhKelompokId ? Number(editForm.timGambuhKelompokId) : null,
            noTelp: editForm.noTelp,
            foto: editForm.foto,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: json.error || "Gagal memperbarui data Tim PNKB & Ibu Gambuh"
          });
          return;
        }

        try {
          localStorage.setItem("my_tim_pnkb_gambuh_id", data.timGambuhId);
          localStorage.setItem("my_tim_pnkb_gambuh_nama", editForm.nama.trim());
          localStorage.setItem("my_tim_pnkb_gambuh_tipe", editForm.tipeTimGambuh);
          if (editForm.foto) {
            localStorage.setItem("my_tim_pnkb_gambuh_foto", editForm.foto);
          } else {
            localStorage.removeItem("my_tim_pnkb_gambuh_foto");
          }
        } catch {
          // Keep the visible state updated even when browser storage is unavailable.
        }

        setShowEditModal(false);
        await fetchProfile();
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Profil Tim PNKB & Ibu Gambuh berhasil diperbarui!',
          timer: 2000,
          showConfirmButton: false
        });
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        if (json.data) {
          setData(json.data);
          // Refresh router to update sidebar/layout with new session data
          router.refresh();
          setEditForm({
            nama: json.data.nama || "",
            tempatLahir: json.data.tempatLahir || "",
            tanggalLahir: json.data.tanggalLahir || "",
            jenisKelamin: json.data.jenisKelamin || "L",
            kategoriUsia: json.data.kategoriUsia || "SMA",
            alamat: json.data.alamat || "",
            noTelp: json.data.noTelp || "",
            pendidikan: json.data.pendidikan || "",
            pekerjaan: json.data.pekerjaan || "",
            statusNikah: json.data.statusNikah || "Belum Menikah",
            hobi: json.data.hobi || "",
            makananMinumanFavorit: json.data.makananMinumanFavorit || "",
            suku: json.data.suku || "",
            foto: json.data.foto || "",
            tgDaerahId: "",
            tgDesaId: "",
            timGambuhDaerahId: "",
            timGambuhDesaId: "",
            timGambuhKelompokId: "",
            tipeTimGambuh: "",
            umur: "",
          });
        } else {
          await fetchProfile();
        }
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Profil berhasil diperbarui!',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: json.error || "Gagal memperbarui profil"
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Gagal memperbarui profil"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (data && canvasRef.current && isAuthorized) {
      QRCode.toCanvas(canvasRef.current, data.nomorUnik, {
        width: 180,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    }
    if (data && idCardCanvasRef.current && isAuthorized) {
      QRCode.toCanvas(idCardCanvasRef.current, data.nomorUnik, {
        width: 150,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [data, isAuthorized]);

  if (!mounted) return <div className="loading"><div className="spinner" /></div>;
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  if (data.role === "tim_pnkb" || data.role === "tim_pnkb_gambuh") {
    router.push("/dashboard");
    return null;
  }

  const isTimGambuhProfile = (data?.role === "tim_pnkb_gambuh" || data?.role === "tim_pnkb");
  const filteredTimDesaList = editForm.timGambuhDaerahId
    ? desaList.filter((d) => d.mandiriDaerahId === Number(editForm.timGambuhDaerahId))
    : [];
  const filteredTimKelompokList = editForm.timGambuhDesaId
    ? kelompokList.filter((k) => k.mandiriDesaId === Number(editForm.timGambuhDesaId))
    : [];
  const isPanitiaProfile = data.role === "kmm_daerah" ||
    data.role === "admin" ||
    data.role === "tim_pnkb" ||
    data.role === "admin_romantic_room" ||
    isTimGambuhProfile;


  const idCardBg = data?.jenisKelamin?.toLowerCase() === 'p' 
    ? 'linear-gradient(135deg, #be185d, #ec4899)' 
    : 'linear-gradient(135deg, #1e40af, #3b82f6)';

  return (
    <div>
      <Topbar title="Profil Saya" role={data.role} className="no-print" userName={data.nama}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary icon-btn" onClick={handlePrint} title="Cetak Profil (PDF)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span className="btn-label">Cetak (PDF)</span>
          </button>
          <button className="btn btn-primary icon-btn" onClick={() => setShowEditModal(true)} title="Edit Profil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span className="btn-label">Edit Profil</span>
          </button>
        </div>
      </Topbar>

      <div className="page-content" ref={printRef}>
        {/* Hidden print header - removed in favor of ID Card design */}


        <div className="profile-container">
          <div className="card profile-header-card">
            <div className="profile-hero">
              <div className="profile-avatar-large" id="profile-avatar-main">
                {data.foto ? (
                  <img
                    src={data.foto}
                    alt={data.nama}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  (data?.nama || "??").charAt(0).toUpperCase()
                )}
                <button className="avatar-edit-trigger" onClick={() => setShowEditModal(true)} title="Ganti Foto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
              </div>
              <div className="profile-hero-info">
                <h2>{data.nama}</h2>
                <div className="text-muted">{data.nomorUnik}</div>
                <div className="badge badge-blue" style={{ marginTop: 8 }}>
                  {data.role === "pengurus_daerah" ? "Pengurus Daerah" : 
                   data.role === "kmm_daerah" ? "KMM Daerah" : 
                   data.role === "admin" ? "Administrator" :
                   data.role === "desa" ? "Pengurus Desa" :
                   data.role === "kelompok" ? "Pengurus Kelompok" :
                   isTimGambuhProfile ? "Tim PNKB & Ibu Gambuh" :
                   data.kategoriUsia}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-content-layout">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Data Diri</span>
              </div>
              <div className="card-body">
                <div className="data-grid">
                  {!isTimGambuhProfile && (
                    <div className="data-item">
                      <label>Tempat, Tanggal Lahir</label>
                      <div>{data.tempatLahir || "-"}, {data.tanggalLahir || "-"}</div>
                    </div>
                  )}
                  <div className="data-item">
                    <label>Jenis Kelamin</label>
                    <div>{data.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</div>
                  </div>
                  <div className="data-item">
                    <label>Desa / Kelompok</label>
                    <div>{data.desaNama} / {data.kelompokNama}</div>
                  </div>
                  <div className="data-item">
                    <label>Alamat</label>
                    <div>{data.alamat || "-"}</div>
                  </div>
                  <div className="data-item">
                    <label>Nomor Telepon</label>
                    <div>{data.noTelp || "-"}</div>
                  </div>

                  {isTimGambuhProfile && (
                    <>
                      <div className="data-item">
                        <label>Asal Daerah (Tim Gambuh)</label>
                        <div>{data.kota || "-"}</div>
                      </div>
                      <div className="data-item">
                        <label>Asal Desa (Tim Gambuh)</label>
                        <div>{data.mandiriDesaNama || "-"}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="card profile-qr-card">
              <div className="card-header">
                <span className="card-title">QR Code Identitas</span>
              </div>
              <div className="card-body" style={{ textAlign: "center" }}>
                <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
                <p className="text-sm text-muted" style={{ marginTop: 12 }}>
                  Gunakan QR Code ini untuk absensi setiap kegiatan.
                </p>
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.download = `QR_${data.nomorUnik}.png`;
                    link.href = canvasRef.current!.toDataURL();
                    link.click();
                  }}
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay fadeIn">
          <div className="modal modal-premium zoomIn">
            <div className="modal-header premium-header">
              <h3 className="modal-title flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Perbarui Profil Saya
              </h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="modal-body premium-body">
                <div className="premium-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Data profil ini akan ditampilkan pada sistem administrasi GENCAR.</span>
                </div>

                <div className="form-group" style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <div className="profile-avatar-large" style={{
                      margin: "0 auto 16px", overflow: "hidden",
                      border: "3px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                    }}>
                      {editForm.foto ? (
                        <img src={editForm.foto} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        editForm.nama.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center" }}>
                      <label className="btn btn-sm btn-secondary" style={{
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {uploading ? "Mengunggah..." : "Unggah Foto Profil"}
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          disabled={uploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              const json = await res.json();
                              if (json.url) setEditForm({ ...editForm, foto: json.url });
                            } catch (err) {
                              console.error("Upload error:", err);
                            } finally {
                              setUploading(false);
                            }
                          }}
                        />
                      </label>
                      {editForm.foto && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{
                            color: "#ef4444", width: 32, height: 32,
                            padding: 0, display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          onClick={async () => {
                            const res = await Swal.fire({
                              title: 'Hapus foto?',
                              text: "Hapus foto profil saat ini?",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#3b82f6',
                              cancelButtonColor: '#64748b',
                              confirmButtonText: 'Ya, hapus!',
                              cancelButtonText: 'Batal'
                            });
                            if (res.isConfirmed) setEditForm({ ...editForm, foto: "" });
                          }}
                          title="Hapus Foto"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: 8 }}>Format: JPG, PNG (Maks. 2MB)</p>
                  </div>
                </div>

                <div className="form-group floating-group">
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={editForm.nama}
                    placeholder=" "
                    onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                    required
                  />
                  <label className="floating-label">Nama Lengkap</label>
                </div>

                {isTimGambuhProfile && (
                  <div className="form-group">
                    <label className="form-label text-sm text-muted mb-2">Tipe Tim</label>
                    <div className="custom-select-wrapper">
                      <select
                        className="form-control premium-input custom-select"
                        value={editForm.tipeTimGambuh}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tipeTimGambuh: e.target.value,
                          jenisKelamin: e.target.value.includes("Ibu") ? "P" : "L",
                        })}
                      >
                        <option value="PNKB">PNKB (Laki-laki)</option>
                        <option value="Ibu Gambuh">Ibu Gambuh (Perempuan)</option>
                      </select>
                      <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                )}

                {!isTimGambuhProfile && (
                  <div className="form-row">
                    <div className="form-group floating-group">
                      <input
                        type="text"
                        className="form-control premium-input"
                        value={editForm.tempatLahir}
                        placeholder=" "
                        onChange={(e) => setEditForm({ ...editForm, tempatLahir: e.target.value })}
                      />
                      <label className="floating-label">Tempat Lahir</label>
                    </div>
                    <div className="form-group floating-group">
                      <input
                        type="date"
                        className="form-control premium-input"
                        value={editForm.tanggalLahir}
                        placeholder=" "
                        onChange={(e) => setEditForm({ ...editForm, tanggalLahir: e.target.value })}
                      />
                      <label className="floating-label" style={{ top: '-10px', fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>Tanggal Lahir</label>
                    </div>
                  </div>
                )}

                {isTimGambuhProfile && (
                  <div className="form-group floating-group">
                    <input
                      type="number"
                      className="form-control premium-input"
                      value={editForm.umur}
                      placeholder=" "
                      min="1"
                      onChange={(e) => setEditForm({ ...editForm, umur: e.target.value })}
                    />
                    <label className="floating-label">Umur (Khusus Tim)</label>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label text-sm text-muted mb-2">Jenis Kelamin</label>
                    <div className="custom-select-wrapper">
                      <select
                        className="form-control premium-input custom-select"
                        value={editForm.jenisKelamin}
                        onChange={(e) => setEditForm({ ...editForm, jenisKelamin: e.target.value })}
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                      <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-sm text-muted mb-2">Kategori Usia</label>
                    <div className="custom-select-wrapper">
                      <select
                        className="form-control premium-input custom-select"
                        value={editForm.kategoriUsia}
                        onChange={(e) => setEditForm({ ...editForm, kategoriUsia: e.target.value })}
                      >
                        <option value="SMA">SMA</option>
                        <option value="SMK">SMK</option>
                        <option value="Kuliah">Kuliah</option>
                        <option value="Bekerja">Bekerja</option>
                      </select>
                      <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="form-group floating-group">
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={editForm.alamat}
                    placeholder=" "
                    onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                  />
                  <label className="floating-label">Alamat Lengkap</label>
                </div>

                <div className="form-group floating-group">
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={editForm.noTelp}
                    placeholder=" "
                    onChange={(e) => setEditForm({ ...editForm, noTelp: e.target.value })}
                  />
                  <label className="floating-label">Nomor Telepon (WhatsApp)</label>
                </div>


              </div>
              <div className="modal-footer premium-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary btn-glow" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-small"></span>Menyimpan...</>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '6px' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pdkt-id-card-print">
        <div className={`id-card-comprehensive role-${
          data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "pengurus" : 
          isPanitiaProfile ? "panitia" : 
          "peserta"
        } gender-${data?.jenisKelamin?.toLowerCase()}`}>
          <div className="id-watermark-container">
            <div className="id-watermark wm-1">
              {data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "PENGURUS" : 
               isPanitiaProfile ? "PANITIA" : 
               "PESERTA"}
            </div>
            <div className="id-watermark wm-2">
              {data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "PENGURUS" : 
               isPanitiaProfile ? "PANITIA" : 
               "PESERTA"}
            </div>
            <div className="id-watermark wm-3">
              {data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "PENGURUS" : 
               isPanitiaProfile ? "PANITIA" : 
               "PESERTA"}
            </div>
          </div>
          <div className="id-card-header">
            <div className="id-logo-box">
              <Sparkles size={24} />
              <span>{data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "PENGURUS" : 
                    isPanitiaProfile ? "PANITIA" : 
                    "PESERTA"}</span>
            </div>
            <div className="id-org-name" style={{ textTransform: "uppercase" }}>
              {data.kota || "Jakarta Barat 2"} &bull; {data.mandiriDesaNama || data.desaNama || "Cengkareng"}
            </div>
          </div>

          <div className="id-card-main-content">
            <div className="id-photo-section">
              <div className="id-photo-frame">
                {data.foto ? <img src={data.foto} alt={data.nama} /> : <div className="id-initials">{(data.nama || "??").charAt(0).toUpperCase()}</div>}
                <div className="id-kategori-sticker">
                  {data.role === "pengurus_daerah" || data.role === "desa" || data.role === "kelompok" ? "Pengurus" : 
                   isPanitiaProfile ? "Panitia" : 
                   "Peserta"}
                </div>
              </div>
            </div>

            <div className="id-info-section">
              <h1 className="id-full-name">{data.nama}</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "5px" }}>
                <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {data.nomorUnik}</div>
                {isTimGambuhProfile && (
                  <div className="id-member-code" style={{ opacity: 1, color: "#064e3b", background: "rgba(255,255,255,0.75)", padding: "4px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: "900" }}>
                    {data.timGambuhTipe || "Tim PNKB & Ibu Gambuh"}
                  </div>
                )}
                {data.nomorUrut && (
                  <div className="id-member-code" style={{ opacity: 1, color: "var(--primary)", background: "rgba(0,0,0,0.03)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(0,0,0,0.1)", fontSize: "18px", fontWeight: "950" }}>
                    NO. URUT: {data.nomorUrut}
                  </div>
                )}
              </div>
              {isTimGambuhProfile && (
                <div className="id-detail-grid">
                  <div>
                    <label>WhatsApp</label>
                    <span>{data.noTelp || "-"}</span>
                  </div>
                  <div>
                    <label>Daerah</label>
                    <span>{data.timGambuhDaerahNama || "-"}</span>
                  </div>
                  <div>
                    <label>Desa</label>
                    <span>{data.timGambuhDesaNama || "-"}</span>
                  </div>
                  <div>
                    <label>Kelompok</label>
                    <span>{data.timGambuhKelompokNama || "-"}</span>
                  </div>
                </div>
              )}
              <div className="id-qr-box" style={{ padding: "15px", borderRadius: "20px", marginTop: "10px" }}>
                <canvas ref={idCardCanvasRef} style={{ width: '150px', height: '150px' }} />
                <div className="id-qr-label" style={{ fontSize: "11px", marginTop: "5px" }}>Verified QR Identifier</div>
              </div>
            </div>

            <div className="id-footer-section">
              <div className="id-address-section">
                <label>{isTimGambuhProfile ? "Identitas Tim PNKB & Ibu Gambuh" : "Identifier Verification"}</label>
                <p>
                  {isTimGambuhProfile
                    ? `${data.timGambuhDaerahNama || data.kota || "-"} / ${data.timGambuhDesaNama || data.desaNama || "-"} / ${data.timGambuhKelompokNama || data.kelompokNama || "-"}`
                    : `Digital Membership Identity - ${data.role === "pengurus_daerah" || data.role === "kmm_daerah" ? "Daerah Version" : "Mandiri Version"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="id-card-footer">
            <div className="id-loc-pill">
              <MapPin size={14} />
              <span>{data.desaNama || "Daerah"} &bull; {data.kelompokNama || "Jakarta Barat 2"}</span>
            </div>
            <div className="id-footer-right">
              GENCAR &copy; 2026
            </div>
          </div>
          <div className="id-card-seal" />
        </div>
      </div>


      <style jsx>{`
        .profile-hero { display: flex; align-items: center; gap: 24px; padding: 12px; }
        .profile-avatar-large {
          width: 80px; height: 80px; background: #3b82f6; color: white;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: bold;
          position: relative;
        }
        .profile-content-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          margin-top: 24px;
        }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .data-item label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
        .data-item div { font-weight: 500; font-size: 15px; }

        @media (max-width: 992px) {
          .profile-content-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .data-grid {
            grid-template-columns: 1fr;
          }
          .profile-hero {
            flex-direction: column;
            text-align: center;
          }
        }

        .profile-hero { display: flex; align-items: center; gap: 24px; padding: 12px; }
        .profile-avatar-large { 
          width: 80px; height: 80px; background: #3b82f6; color: white; 
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: bold;
          position: relative;
        }
        .profile-content-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          margin-top: 24px;
        }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .data-item label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
        .data-item div { font-weight: 500; font-size: 15px; }

        @media (max-width: 992px) {
          .profile-content-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .data-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ID Card Print Container */
        .pdkt-id-card-print {
          position: absolute; opacity: 0; pointer-events: none; top: -9999px;
        }

        .id-card-comprehensive {
          width: 10.5cm; height: 17cm; background: #2563eb; border: 1px solid #1e40af;
          border-radius: 12mm; position: relative; overflow: hidden; display: flex; flex-direction: column;
          margin: 0 auto; color: white;
        }

        .id-card-comprehensive.role-peserta {
          background: linear-gradient(180deg, #fce4ec 0%, #f48fb1 100%);
          border: 1px solid #f06292;
          color: #880e4f;
        }
        .id-card-comprehensive.role-peserta.gender-l {
          background: linear-gradient(180deg, #ffffff 0%, #ef4444 100%);
          border: 1px solid #dc2626;
          color: #7f1d1d;
        }
        .id-card-comprehensive.role-pengurus {
          background: linear-gradient(180deg, #e8f5e9 0%, #81c784 100%);
          border: 1px solid #4caf50;
          color: #1b5e20;
        }
        .id-card-comprehensive.role-panitia {
          background: linear-gradient(180deg, #e8f5e9 0%, #16a34a 100%);
          border: 1px solid #15803d;
          color: #064e3b;
        }

        .id-watermark-container {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          align-items: center;
          pointer-events: none;
          z-index: 1;
        }

        .id-watermark {
          font-size: 80px;
          font-weight: 950;
          opacity: 0.08;
          transform: rotate(-30deg);
          white-space: nowrap;
          letter-spacing: 10px;
          text-transform: uppercase;
        }
        .wm-1 { margin-top: 100px; margin-left: -50px; }
        .wm-2 { margin-left: 50px; }
        .wm-3 { margin-bottom: 100px; margin-left: -50px; }

        .role-panitia .id-watermark { opacity: 0.12; color: #064e3b; }
        .role-peserta .id-watermark { color: #880e4f; }
        .role-peserta.gender-l .id-watermark { color: #ef4444; opacity: 0.1; }
        .role-pengurus .id-watermark { color: #1b5e20; }

        .id-card-header {
           height: 2.5cm; padding: 0 30px; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px;
           background: rgba(0,0,0,0.1);
           position: relative;
           z-index: 5;
        }
        .role-peserta .id-card-header { background: linear-gradient(135deg, #be185d, #ec4899); }
        .role-peserta.gender-l .id-card-header { background: linear-gradient(135deg, #ef4444, #991b1b); }
        .role-pengurus .id-card-header { background: linear-gradient(135deg, #2e7d32, #4caf50); }
        .role-panitia .id-card-header { background: linear-gradient(135deg, #15803d, #16a34a); }

        .id-logo-box { display: flex; align-items: center; gap: 10px; }
        .id-logo-box span { font-weight: 950; font-size: 20px; letter-spacing: 2px; }
        .id-org-name { font-size: 11px; font-weight: 700; opacity: 0.9; text-transform: uppercase; }

        .id-card-main-content { flex: 1; display: flex; flex-direction: column; padding: 30px; align-items: center; gap: 20px; position: relative; z-index: 5; }
        .id-photo-section { display: flex; justify-content: center; margin-top: 10px; }
        .id-photo-frame {
          width: 4.5cm; height: 6cm; background: #f1f5f9; border-radius: 10mm;
          overflow: hidden; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); position: relative;
        }
        .id-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .id-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; font-size: 60px; font-weight: 950; }
        .id-kategori-sticker { 
          position: absolute; bottom: 0; left: 0; right: 0; 
          background: rgba(255,255,255,0.95); padding: 10px 5px; 
          text-align: center; font-size: 16px; font-weight: 950; 
          color: #1e40af; text-transform: uppercase;
          letter-spacing: 1px;
        }
        .role-peserta .id-kategori-sticker { color: #be185d; }
        .role-peserta.gender-l .id-kategori-sticker { color: #ef4444; }
        .role-pengurus .id-kategori-sticker { color: #2e7d32; }
        .role-panitia .id-kategori-sticker { color: #15803d; }

        .id-info-section { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 15px; }
        .id-full-name { font-size: 24px; font-weight: 950; line-height: 1.1; margin-bottom: 5px; }
        .role-peserta .id-full-name { color: #1e3a8a; }
        .role-peserta.gender-l .id-full-name { color: #7f1d1d; }
        .role-pengurus .id-full-name { color: #1b5e20; }
        .role-panitia .id-full-name { color: #064e3b; }

        .id-member-code { font-size: 14px; font-weight: 800; opacity: 0.7; font-family: monospace; }
        .role-panitia .id-member-code { color: #81c784; }

        .id-detail-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 6px;
        }
        .id-detail-grid div {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 10px;
          padding: 7px 9px;
          text-align: left;
        }
        .id-detail-grid label {
          display: block;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          opacity: 0.58;
          margin-bottom: 2px;
        }
        .id-detail-grid span {
          display: block;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.25;
        }

        .id-qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; background: white; padding: 10px; border-radius: 15px; margin: 10px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .id-qr-label { font-size: 9px; font-weight: 800; color: #1e40af; text-transform: uppercase; }

        .id-footer-section { width: 100%; margin-top: auto; }
        .id-address-section { padding: 15px 0; border-top: 2px dashed rgba(0,0,0,0.1); }
        .role-panitia .id-address-section { border-top-color: rgba(255,255,255,0.2); }

        .id-address-section label { display: block; font-size: 10px; font-weight: 800; opacity: 0.6; text-transform: uppercase; margin-bottom: 4px; }
        .id-address-section p { font-size: 13px; line-height: 1.5; font-weight: 600; }

        .id-card-footer {
          height: 2.2cm; padding: 0 30px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(0,0,0,0.05);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          position: relative; z-index: 5;
        }
        .role-peserta .id-card-footer { background: #1e3a8a; }
        .role-peserta.gender-l .id-card-footer { background: #991b1b; }
        .role-pengurus .id-card-footer { background: #1b5e20; }
        .role-panitia .id-card-footer { background: #15803d; }

        .id-loc-pill {
           display: flex; align-items: center; gap: 8px; color: white; padding: 8px 18px; border-radius: 30px; font-size: 13px; font-weight: 800;
           background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
        }
        .id-footer-right { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .id-card-seal { position: absolute; bottom: -40px; right: -40px; width: 150px; height: 150px; background: #cbd5e1; opacity: 0.1; border-radius: 50%; }

        @media print {
          @page { size: landscape; margin: 15mm; }
          .no-print { display: none !important; }
          .detail-pdkt-wrapper { background: white !important; padding: 0 !important; }
          .detail-bg, .detail-container, .detail-footer { display: none !important; }
          .pdkt-id-card-print {
            display: flex !important; opacity: 1 !important; position: static !important;
            justify-content: center !important; align-items: center !important; height: 100vh !important;
          }
          .id-card-comprehensive { break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        /* Loading & Auth Styles */
        .auth-fallback {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .auth-card-premium {
            background: white;
            padding: 40px;
            border-radius: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.05);
            text-align: center;
            max-width: 400px;
            border: 1px solid #f1f5f9;
        }
        .lock-icon-wrapper {
            width: 64px;
            height: 64px;
            background: #eff6ff;
            color: #3b82f6;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .auth-card-premium h2 { font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #111827; }
        .auth-card-premium p { color: #6b7280; margin-bottom: 24px; font-size: 15px; }
        .btn-pdkt-primary {
            width: 100%;
            padding: 14px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 16px;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15);
        }
        .btn-pdkt-primary:hover { background: #2563eb; transform: scale(1.02); }

        /* Premium Modal Styles */
        .fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .zoomIn { animation: zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0); } to { opacity: 1; backdrop-filter: blur(4px); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .modal-premium {
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border-radius: 20px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        .premium-header {
          background: linear-gradient(to right, #f8fafc, #ffffff);
          border-bottom: 1px solid #f1f5f9;
          padding: 24px 28px;
          flex-shrink: 0;
          border-radius: 20px 20px 0 0;
        }
        
        .modal-premium form {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        
        .premium-body {
          padding: 28px;
          overflow-y: auto;
          flex: 1;
        }

        .premium-footer {
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          padding: 20px 28px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-shrink: 0;
          border-radius: 0 0 20px 20px;
        }

        .premium-alert {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 12px 16px;
          border-radius: 6px;
          color: #1e3a8a;
          font-size: 13px;
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
          align-items: center;
        }

        .premium-alert svg {
          width: 20px; height: 20px; color: #3b82f6; flex-shrink: 0;
        }

        /* Floating Label Inputs */
        .floating-group {
          position: relative;
          margin-bottom: 24px;
        }
        
        .floating-label {
          position: absolute;
          left: 14px;
          top: 12px;
          color: #94a3b8;
          transition: all 0.2s ease;
          pointer-events: none;
          background: #ffffff;
          padding: 0 4px;
          font-size: 14px;
        }

        .premium-input {
          height: 48px;
          font-size: 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          padding: 0 16px;
          background: transparent;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .premium-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .premium-input:focus ~ .floating-label,
        .premium-input:not(:placeholder-shown) ~ .floating-label {
          top: -10px;
          left: 12px;
          font-size: 12px;
          color: #3b82f6;
          font-weight: 500;
        }

        /* Custom Select */
        .custom-select-wrapper {
          position: relative;
        }
        
        .custom-select {
          appearance: none;
          padding-right: 40px;
          color: #334155;
          font-weight: 500;
        }

        .select-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #64748b;
          pointer-events: none;
        }

        /* Buttons */
        .btn-ghost {
          background: transparent;
          color: #64748b;
          border: 1px solid transparent;
        }
        .btn-ghost:hover {
          background: #f1f5f9;
          color: #334155;
        }
        
        .btn-glow {
          box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
          transition: all 0.2s ease;
        }
        .btn-glow:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }
      `}</style>
    </div>
  );
}
