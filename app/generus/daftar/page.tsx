"use client";



import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface Desa { id: number; nama: string; }
interface Kelompok { id: number; nama: string; }

export default function GenerusDaftarPage() {
  const [form, setForm] = useState({
    nama: "",
    jenisKelamin: "L",
    kategoriUsia: "SMA",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
    noTelp: "",
    noTelpOrtu: "",
    email: "",
    password: "",
    pendidikan: "",
    pekerjaan: "",
    statusNikah: "Belum Menikah",
    hobi: "",
    makananMinumanFavorit: "",
    suku: "",
    foto: "",
    kategori: "Generus",
    namaOrtu: "",
    desaId: "",
    kelompokId: "",
  });

  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isActive, setIsActive] = useState<string>("true");
  const [regTitle, setRegTitle] = useState("");
  const [regDesc, setRegDesc] = useState("");
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
    fetch("/api/public/mandiri/settings?key=generus_registration_active")
      .then(r => r.json())
      .then(d => {
        if (d.value !== undefined) {
            setIsActive(d.value);
        }
      });

    fetch("/api/public/mandiri/settings?key=generus_registration_title")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegTitle(d.value);
      });

    fetch("/api/public/mandiri/settings?key=generus_registration_description")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegDesc(d.value);
      });

    fetch("/api/public/generus/desa")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDesaList(data);
      });
  }, []);

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>{part}</a>;
        }
        return part;
    });
  };

  useEffect(() => {
    if (form.desaId) {
      fetch(`/api/public/generus/kelompok?desaId=${form.desaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setKelompokList(data);
        });
    } else {
      setKelompokList([]);
    }
    setForm(prev => ({ ...prev, kelompokId: "" }));
  }, [form.desaId]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/public/generus/registrasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      setSuccess(true);
      setResult(data);
      Swal.fire({ icon: "success", title: "Berhasil!", text: "Data Anda telah tercatat." });
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
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>✅</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Berhasil!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Data Anda telah berhasil disimpan dalam Sistem Pendataan Muda-Mudi.
          </p>
          <div style={{ background: "var(--bg)", padding: "20px", borderRadius: "10px", marginBottom: "24px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Nomor Unik Anda:</p>
            <h3 style={{ fontSize: "24px", color: "var(--primary)", letterSpacing: "2px" }}>{result?.nomorUnik}</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
              Silakan simpan nomor unik ini untuk keperluan absensi dan kegiatan mendatang.
          </p>
          <button className="btn btn-primary btn-full" onClick={() => window.location.reload()}>
            Kembali ke Form
          </button>
        </div>
      </div>
    );
  }

  if (isActive === "false") {
      return (
        <div className="auth-page">
          <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
            <div style={{ fontSize: "60px", marginBottom: "20px" }}>🔒</div>
            <h2 style={{ marginBottom: "10px" }}>Pendaftaran Ditutup</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
              Mohon maaf, pendaftaran saat ini sedang dinonaktifkan / ditutup.
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Silakan hubungi pengurus setempat untuk informasi lebih lanjut.
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
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen Muda-Mudi JB2</p>
          </div>
        </div>
                <p style={{ fontWeight: "600", fontSize: "1.2rem", marginBottom: "4px" }}>
                    {regTitle || "Pendaftaran Data Muda-Mudi"}
                </p>
                {regDesc && (
                    <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.5" }}>
                        {renderTextWithLinks(regDesc)}
                    </p>
                )}

            
            <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="form-group" style={{ textAlign: "center" }}>
                        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#f1f5f9", margin: "0 auto 10px", overflow: "hidden", border: "2px solid #e2e8f0" }}>
                            {form.foto ? <img src={form.foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "40px", marginTop: "20px" }}>👤</div>}
                        </div>
                        <label className="btn btn-sm btn-secondary" style={{ cursor: "pointer", marginBottom: "8px" }}>
                            {uploading ? "..." : "Upload Foto Profil"}
                            <input type="file" hidden accept="image/*" disabled={uploading} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                const fd = new FormData(); fd.append("file", file);
                                try {
                                    const res = await fetch("/api/upload", { method: "POST", body: fd });
                                    const json = await res.json();
                                    if (json.url) setForm({ ...form, foto: json.url });
                                } catch (err) {} finally { setUploading(false); }
                            }} />
                        </label>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 auto", maxWidth: "250px" }}>
                            Kirim foto yang terbaik & terbaru, foto bebas, dan muka tampak jelas (tidak tertutup masker)
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                        <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
                        <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Contoh Format Penulisan: Raka Gladhi Pratama (Tanpa disingkat dan huruf kapital pada setiap awal kata)
                        </p>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Tempat Lahir <span className="required">*</span></label>
                            <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} placeholder="Kota Kelahiran" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                            <input name="tanggalLahir" type="date" className="form-control" value={form.tanggalLahir} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
                        <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange}>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Kategori <span className="required">*</span></label>
                        <select name="kategori" className="form-control" value={form.kategori} onChange={handleChange}>
                            <option value="Generus">Muda-Mudi</option>
                            <option value="Usia Mandiri">Usia Mandiri</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Pendidikan / Pekerjaan <span className="required">*</span></label>
                        <select name="kategoriUsia" className="form-control" value={form.kategoriUsia} onChange={handleChange}>
                            {form.kategori === "Generus" ? (
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

                    <div className="form-group">
                        <label className="form-label">Nama Orang Tua <span className="required">*</span></label>
                        <input name="namaOrtu" className="form-control" value={form.namaOrtu} onChange={handleChange} placeholder="Nama Ayah / Ibu" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nomor WhatsApp Anda <span className="required">*</span></label>
                        <input name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} placeholder="08xx-xxxx-xxxx" required />
                        <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                            Nomor ini tidak akan disebarluaskan, hanya digunakan untuk keperluan kordinasi.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nomor WhatsApp Orangtua <span className="required">*</span></label>
                        <input name="noTelpOrtu" className="form-control" value={form.noTelpOrtu} onChange={handleChange} placeholder="08xx-xxxx-xxxx" required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Desa <span className="required">*</span></label>
                            <select name="desaId" className="form-control" value={form.desaId} onChange={handleChange} required>
                                <option value="">Pilih Desa</option>
                                {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kelompok <span className="required">*</span></label>
                            <select name="kelompokId" className="form-control" value={form.kelompokId} onChange={handleChange} required disabled={!form.desaId}>
                                <option value="">Pilih Kelompok</option>
                                {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Alamat Lengkap <span className="required">*</span></label>
                        <textarea name="alamat" className="form-control" value={form.alamat} onChange={handleChange} placeholder="Masukkan alamat domisili saat ini" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email <span className="required">*</span></label>
                        <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required placeholder="Masukkan alamat email aktif" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password <span className="required">*</span></label>
                        <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} required placeholder="Masukkan password untuk login" />
                    </div>

                    <div className="form-group" style={{ padding: "15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <input 
                                type="checkbox" 
                                id="agree-check"
                                style={{ transform: "scale(1.2)", marginTop: "3px" }} 
                                checked={agreed} 
                                onChange={(e) => setAgreed(e.target.checked)} 
                                required
                            />
                            <label htmlFor="agree-check" style={{ fontSize: "12.5px", cursor: "pointer", fontWeight: "600" }}>
                                Saya menyatakan data di atas benar & sesuai:
                            </label>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !agreed}>
                        {loading ? "Memproses..." : "Kirim Pendaftaran"}
                    </button>
                    
                    <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                        Dengan mengeklik tombol di atas, Anda menyatakan bahwa data yang diberikan adalah benar.
                    </p>
                </div>
            </form>
        </div>
    </div>
  );
}
