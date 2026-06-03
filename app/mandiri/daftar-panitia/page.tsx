"use client";




import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import PhotoUpload from "@/components/mandiri/PhotoUpload";


interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; }

export default function PanitiaDaftarPage() {
  const [form, setForm] = useState({
    nama: "",
    jenisKelamin: "L",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
    noTelp: "",
    pendidikan: "",
    pekerjaan: "",
    statusNikah: "Belum Menikah",
    hobi: "",
    makananMinumanFavorit: "",
    suku: "",
    foto: "",
    mandiriDesaId: "",
    mandiriKelompokId: "",
    instagram: "",
    dapukan: "Panitia", 
  });

  const [daerahList, setDaerahList] = useState<Desa[]>([]);
  const [desaList, setDesaList] = useState<Kelompok[]>([]);
  const [filteredDaerahList, setFilteredDaerahList] = useState<Desa[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Kelompok[]>([]);
  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [regTitle, setRegTitle] = useState("Pendaftaran Panitia");
  const [regDesc, setRegDesc] = useState("Silakan isi data diri Anda untuk keperluan kepanitiaan.");
  const [agreed, setAgreed] = useState(false);
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
    fetch("/api/public/mandiri/settings?key=mandiri_registration_status")
      .then(r => r.json())
      .then(d => {
        if (d.value === "0") {
          setIsClosed(true);
        }
      });

    Promise.all([
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok").then((r) => r.json()),
    ]).then(([daerahs, desas]) => {
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
        const cities = Array.from(new Set(daerahs.map((d: any) => d.kota))).sort() as string[];
        setKotaList(cities);
      }
      if (Array.isArray(desas)) setDesaList(desas);
    });
  }, []);


  useEffect(() => {
    if (selectedKota) {
      setFilteredDaerahList(daerahList.filter(d => d.kota === selectedKota));
    } else {
      setFilteredDaerahList([]);
    }
    setForm(prev => ({ ...prev, mandiriDesaId: "", mandiriKelompokId: "" }));
  }, [selectedKota, daerahList]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.nama || !form.jenisKelamin || !form.mandiriDesaId || !form.tempatLahir || !form.tanggalLahir || !form.noTelp || !form.pendidikan || !form.pekerjaan || !form.hobi || !form.makananMinumanFavorit) {
        Swal.fire({ icon: "warning", title: "Data Belum Lengkap", text: "Mohon lengkapi semua data wajib yang bertanda bintang (*)." });
        setLoading(false);
        return;
      }

      const cleanNoTelp = form.noTelp.replace(/\D/g, "");
      if (cleanNoTelp.length < 11) {
        Swal.fire({ icon: "warning", title: "Nomor Telepon Tidak Valid", text: "Nomor telepon/WhatsApp minimal harus 11 atau 12 angka." });
        setLoading(false);
        return;
      }

      if (!form.foto) {
        Swal.fire({ icon: "warning", title: "Foto Belum Ada", text: "Mohon ambil foto atau unggah foto Anda terlebih dahulu." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/registrasi-panitia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      setSuccess(true);
      setResult(data);
      Swal.fire({ icon: "success", title: "Berhasil!", text: "Data Anda sebagai Panitia telah tercatat." });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBarcode = async () => {
    if (!result?.nomorUnik) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${result.nomorUnik}&margin=10`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QR_PANITIA_${result?.nomorUrut || 'BARCODE'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengunduh barcode." });
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>👋</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Sukses!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Pendaftaran Berhasil! Silakan tunjukkan <b>Barcode</b> atau <b>Nomor Unik</b> ini di meja panitia (Admin Romantic Room) untuk melakukan konfirmasi kehadiran (absensi).
          </p>

          <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "2px dashed #3b82f6", marginBottom: "24px", position: "relative" }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}>Nomor Panitia</p>
            <h3 style={{ fontSize: "42px", color: "var(--primary)", letterSpacing: "2px", margin: "0 0 5px 0", fontWeight: "900" }}>#{result?.nomorUrut}</h3>
            <p style={{ fontSize: "14px", color: "#3b82f6", fontWeight: "800", marginBottom: "20px", background: "#eff6ff", display: "inline-block", padding: "4px 12px", borderRadius: "20px" }}>ID Login: {result?.nomorUnik}</p>

            <div style={{
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 15px 30px rgba(0,0,0,0.05)"
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${result?.nomorUnik}&margin=10`}
                alt="QR Code"
                style={{ width: "220px", height: "220px", borderRadius: "12px", border: "4px solid white" }}
              />              
              <button 
                onClick={handleDownloadBarcode}
                style={{
                  marginTop: "16px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#3b82f6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                }}
              >
                💾 Unduh Barcode
              </button>
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "24px", lineHeight: "1.6", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            Setelah selesai melakukan absensi di meja admin, silakan klik tombol di bawah ini lalu login menggunakan <b>Nomor Unik (ID Login)</b> untuk mengakses katalog.
          </p>
          <Link href="/mandiri/katalog" className="btn btn-primary btn-full" style={{ marginTop: "24px", padding: "15px", fontSize: "16px", fontWeight: "700" }}>
            Buka Katalog Peserta
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
            Pendaftaran Panitia saat ini sedang ditutup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: "600px" }}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR BERKARYA</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Portal Pendaftaran Panitia</p>
          </div>
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text)", marginBottom: "12px" }}>
            {regTitle}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {regDesc}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ textAlign: "center" }}>
              <PhotoUpload 
                value={form.foto} 
                onChange={(url) => setForm(prev => ({ ...prev, foto: url }))}
                helperText="Ambil atau unggah foto terbaru dengan wajah tampak jelas"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
            </div>

            <div className="form-group">
              <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
              <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange} required>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kota Tempat Lahir <span className="required">*</span></label>
                <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} required placeholder="Kota kelahiran" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                <input name="tanggalLahir" type="date" className="form-control" value={form.tanggalLahir} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label className="form-label">Daerah <span className="required">*</span></label>
                <select className="form-control" value={selectedKota} onChange={(e) => setSelectedKota(e.target.value)} required>
                  <option value="">Pilih Daerah</option>
                  {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Desa <span className="required">*</span></label>
                <select name="mandiriDesaId" className="form-control" value={form.mandiriDesaId} onChange={handleChange} required disabled={!selectedKota}>
                  <option value="">Pilih Desa</option>
                  {filteredDaerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">No. Telepon / WhatsApp <span className="required">*</span></label>
                <input name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required placeholder="08xx-xxxx-xxxx" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                  Minimal 11 atau 12 angka.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Pendidikan Terakhir <span className="required">*</span></label>
                <input name="pendidikan" className="form-control" value={form.pendidikan} onChange={handleChange} required placeholder="S1/SMA/dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pekerjaan <span className="required">*</span></label>
                <input name="pekerjaan" className="form-control" value={form.pekerjaan} onChange={handleChange} required placeholder="Pekerjaan saat ini" />
              </div>
              <div className="form-group">
                <label className="form-label">Suku <span className="required">*</span></label>
                <input name="suku" className="form-control" value={form.suku} onChange={handleChange} required placeholder="Betawi / Jawa / dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hobi <span className="required">*</span></label>
                <input name="hobi" className="form-control" value={form.hobi} onChange={handleChange} required placeholder="Hobi anda" />
              </div>
              <div className="form-group">
                <label className="form-label">Favorit Makanan/Minuman <span className="required">*</span></label>
                <input name="makananMinumanFavorit" className="form-control" value={form.makananMinumanFavorit} onChange={handleChange} required placeholder="Sate / Jus / dll" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Akun Instagram (Opsional)</label>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <span style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }}>@</span>
                <input
                  name="instagram"
                  className="form-control"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="username_kamu"
                  style={{ paddingLeft: "30px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Lengkap</label>
              <textarea name="alamat" className="form-control" value={form.alamat} onChange={handleChange} placeholder="Alamat saat ini (opsional)" />
            </div>

            <div className="form-group" style={{ padding: "15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="agree-check"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <label htmlFor="agree-check" style={{ fontSize: "12.5px", cursor: "pointer", fontWeight: "600" }}>
                  Saya menyatakan data yang diisi adalah benar.
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !agreed}>

              {loading ? "Memproses..." : "Kirim Pendaftaran"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
