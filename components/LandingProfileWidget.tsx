"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { X } from "lucide-react";
import PhotoUpload from "@/components/mandiri/PhotoUpload";

export default function LandingProfileWidget({ session }: { session: any }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [editProfileForm, setEditProfileForm] = useState<any>({
    nama: "",
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "",
    kategori: "Generus",
    kategoriUsia: "",
    namaOrtu: "",
    noTelp: "",
    noTelpOrtu: "",
    desaId: "",
    kelompokId: "",
    alamat: "",
    foto: "",
  });

  const [desaList, setDesaList] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);

  useEffect(() => {
    if (!session || !["generus", "usia_mandiri"].includes(session.role)) {
      setLoading(false);
      return;
    }

    // Fetch user's profile data
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  // Fetch Desa List on mount
  useEffect(() => {
    fetch("/api/public/generus/desa")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDesaList(data);
      })
      .catch((e) => console.error("Error fetching desa:", e));
  }, []);

  // Fetch Kelompok List when desaId changes
  useEffect(() => {
    if (editProfileForm.desaId) {
      fetch(`/api/public/generus/kelompok?desaId=${editProfileForm.desaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setKelompokList(data);
        })
        .catch((e) => console.error("Error fetching kelompok:", e));
    } else {
      setKelompokList([]);
    }
  }, [editProfileForm.desaId]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditForm = () => {
    // Menghindari membuka form dengan data kosong jika terjadi error pada API (misalnya: { error: 'Server error' })
    if (!profile || profile.error) {
       Swal.fire('Gagal Memuat', 'Data profil masih dimuat atau terjadi masalah jaringan. Silakan refresh (F5).', 'warning');
       return;
    }
    
    setEditProfileForm({
      nama: profile.nama || "",
      tempatLahir: profile.tempatLahir || "",
      tanggalLahir: profile.tanggalLahir || "",
      jenisKelamin: profile.jenisKelamin || "",
      kategori: profile.kategori || "Generus",
      kategoriUsia: profile.kategoriUsia || "",
      namaOrtu: profile.namaOrtu || "",
      noTelp: profile.noTelp || "",
      noTelpOrtu: profile.noTelpOrtu || "",
      desaId: profile.desaId ? String(profile.desaId) : "",
      kelompokId: profile.kelompokId ? String(profile.kelompokId) : "",
      alamat: profile.alamat || "",
      foto: profile.foto || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProfileForm),
      });
      const json = await res.json();
      if (res.ok) {
        setProfile(json.data || editProfileForm);
        setShowEditModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Profil berhasil diperbarui!',
          timer: 1500,
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
      setSavingProfile(false);
    }
  };

  if (!session || !["generus", "usia_mandiri"].includes(session.role)) {
    return null;
  }

  if (loading) return <div style={{ width: 150, height: 40, background: "#f1f5f9", borderRadius: 8 }} />;

  return (
    <>
      <div className="profile-widget-wrapper">
        <div 
          onClick={handleOpenEditForm}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Klik untuk Edit Biodata Lengkap"
        >
          <div 
            style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-lt)', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}
          >
            {profile?.foto ? (
              <img src={profile.foto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '18px' }}>
                {session.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '8px', textAlign: 'center', padding: '2px 0', opacity: 0, transition: 'opacity 0.2s' }} className="photo-overlay">
              Edit
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>
              {session.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '2px' }}>
              {profile?.desaNama || "-"} • {profile?.kelompokNama || "-"}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', justifyContent: 'center' }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }} 
            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '10px', fontWeight: 600, textAlign: 'left', cursor: 'pointer', padding: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Keluar
          </button>
        </div>

        <style jsx>{`
          .profile-widget-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-left: 24px;
            border-left: 1px solid var(--border);
            padding-left: 24px;
          }
          div:hover > .photo-overlay { opacity: 1 !important; }
          
          @media (max-width: 992px) {
            .profile-widget-wrapper {
              margin-left: 0;
              border-left: none;
              padding-left: 0;
              gap: 10px;
            }
          }
        `}</style>
      </div>

      {/* Pop-up Modal Edit Biodata Lengkap */}
      {showEditModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "540px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ color: "var(--primary)" }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Biodata Lengkap
              </h3>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
              <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
                
                {/* Photo Upload */}
                <div style={{ marginBottom: "24px", textAlign: "center" }}>
                  <PhotoUpload 
                    value={editProfileForm.foto} 
                    onChange={(url) => setEditProfileForm((prev: any) => ({ ...prev, foto: url }))}
                    helperText="Unggah foto profil Anda (maksimal 1 MB)"
                  />
                </div>

                {/* Form Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                  
                  {/* Nama Lengkap */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nama Lengkap <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      value={editProfileForm.nama} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, nama: e.target.value }))}
                      placeholder="Nama lengkap Anda"
                    />
                  </div>

                  {/* Row: Tempat & Tanggal Lahir */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Tempat Lahir <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        className="form-control" 
                        value={editProfileForm.tempatLahir} 
                        onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, tempatLahir: e.target.value }))}
                        placeholder="Contoh: Jakarta"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Tanggal Lahir <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input 
                        type="date" 
                        required
                        className="form-control" 
                        value={editProfileForm.tanggalLahir} 
                        onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, tanggalLahir: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Jenis Kelamin */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Jenis Kelamin <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select 
                      className="form-control" 
                      required
                      value={editProfileForm.jenisKelamin} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, jenisKelamin: e.target.value }))}
                    >
                      <option value="">-- Pilih Jenis Kelamin --</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  {/* Kategori */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Kategori <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select 
                      className="form-control" 
                      required
                      value={editProfileForm.kategori}
                      onChange={(e) => setEditProfileForm((prev: any) => ({ 
                        ...prev, 
                        kategori: e.target.value,
                        kategoriUsia: "" 
                      }))}
                    >
                      <option value="Generus">Generus</option>
                      <option value="Usia Mandiri">Usia Mandiri</option>
                    </select>
                  </div>

                  {/* Kategori Usia (Pendidikan / Pekerjaan) */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Pekerjaan / Pendidikan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select 
                      className="form-control" 
                      required
                      value={editProfileForm.kategoriUsia} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, kategoriUsia: e.target.value }))}
                    >
                      <option value="">-- Pilih --</option>
                      {editProfileForm.kategori === "Generus" ? (
                        <>
                          <option value="SMP">SMP</option>
                          <option value="SMA">SMA</option>
                          <option value="SMK">SMK</option>
                        </>
                      ) : (
                        <>
                          <option value="Kuliah">Kuliah</option>
                          <option value="Bekerja">Bekerja</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Nama Orang Tua / Wali */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nama Orang Tua / Wali <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      className="form-control" 
                      value={editProfileForm.namaOrtu} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, namaOrtu: e.target.value }))}
                      placeholder="Masukkan nama orang tua atau wali"
                    />
                  </div>

                  {/* Nomor WhatsApp Anda */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nomor WhatsApp Anda <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      className="form-control" 
                      value={editProfileForm.noTelp} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, noTelp: e.target.value }))}
                      placeholder="Contoh: 081234567890"
                    />
                    <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                      Nomor ini tidak akan disebarluaskan, hanya untuk keperluan komunikasi antara muda/i dengan pengurus.
                    </p>
                  </div>

                  {/* Nomor WhatsApp Orangtua */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nomor WhatsApp Orangtua <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      className="form-control" 
                      value={editProfileForm.noTelpOrtu} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, noTelpOrtu: e.target.value }))}
                      placeholder="Contoh: 081234567891"
                    />
                    <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                      Nomor ini tidak akan disebarluaskan, hanya untuk keperluan komunikasi antara muda/i dengan pengurus.
                    </p>
                  </div>

                  {/* Desa */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Desa <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select 
                      className="form-control" 
                      required
                      value={editProfileForm.desaId} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, desaId: e.target.value, kelompokId: "" }))}
                    >
                      <option value="">-- Pilih Desa --</option>
                      {desaList.map(d => <option key={d.id} value={String(d.id)}>{d.nama}</option>)}
                    </select>
                  </div>

                  {/* Kelompok */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Kelompok <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select 
                      className="form-control" 
                      required
                      value={editProfileForm.kelompokId} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, kelompokId: e.target.value }))}
                      disabled={!editProfileForm.desaId}
                    >
                      <option value="">-- Pilih Kelompok --</option>
                      {kelompokList.map(k => <option key={k.id} value={String(k.id)}>{k.nama}</option>)}
                    </select>
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Alamat Lengkap <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea 
                      className="form-control" 
                      required
                      style={{ minHeight: "80px" }}
                      value={editProfileForm.alamat} 
                      onChange={(e) => setEditProfileForm((prev: any) => ({ ...prev, alamat: e.target.value }))}
                      placeholder="Masukkan alamat lengkap Anda"
                    />
                  </div>

                </div>

              </div>

              {/* Footer */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEditModal(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingProfile}
                >
                  {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
