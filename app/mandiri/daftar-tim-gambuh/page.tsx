"use client";

import { useState, useEffect } from "react";
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
                  <label className="btn btn-secondary" style={{ cursor: uploadingFoto ? "not-allowed" : "pointer", marginBottom: "8px", display: "inline-flex" }}>
                    {uploadingFoto ? "Mengunggah..." : "Upload Foto"}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      disabled={uploadingFoto}
                      onChange={(e) => handleFotoUpload(e.target.files?.[0])}
                    />
                  </label>
                  {form.foto && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginLeft: "8px" }}
                      onClick={() => setForm((prev) => ({ ...prev, foto: "" }))}
                    >
                      Hapus
                    </button>
                  )}
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
    </div>
  );
}
