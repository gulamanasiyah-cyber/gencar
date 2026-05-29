"use client";
export const runtime = "edge";


import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import GlobalLoading from "@/app/loading";
import PhotoUpload from "@/components/mandiri/PhotoUpload";
import { registerSchema } from "@/lib/validation";

interface Desa {
  id: number;
  nama: string;
}

interface Kelompok {
  id: number;
  nama: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    desaId: "",
    kelompokId: "",
    jenisKelamin: "",
    kategoriUsia: "",
    kategori: "Generus",
    namaOrtu: "",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
    noTelp: "",
    noTelpOrtu: "",
    foto: "",
  });
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    fetch("/api/public/generus/desa")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDesaList(data);
      });
  }, []);

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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const nextForm = { ...prev, [name]: value };
      if (name === "kategori") {
        nextForm.kategoriUsia = "";
      }
      return nextForm;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password tidak sama");
      return;
    }

    const validation = registerSchema.safeParse(form);
    if (!validation.success) {
      const firstError = (validation.error as any).errors[0]?.message || "Input tidak valid";
      setError(firstError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          desaId: form.desaId,
          kelompokId: form.kelompokId,
          jenisKelamin: form.jenisKelamin,
          kategoriUsia: form.kategoriUsia,
          kategori: form.kategori,
          namaOrtu: form.namaOrtu,
          tempatLahir: form.tempatLahir,
          tanggalLahir: form.tanggalLahir,
          alamat: form.alamat,
          noTelp: form.noTelp,
          noTelpOrtu: form.noTelpOrtu,
          foto: form.foto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Registrasi Gagal',
          text: data.error || "Gagal membuat akun"
        });
        setError(data.error || "Registrasi gagal");
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Registrasi berhasil! Silakan menunggu persetujuan admin atau login.',
        timer: 3000,
        showConfirmButton: false
      });
      router.push("/login?success=registered");
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Terjadi kesalahan jaringan"
      });
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {loading && <GlobalLoading />}
      <div className="auth-card" style={{ maxWidth: "460px" }}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>JB2.ID</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen Generus JB2</p>
          </div>
        </div>

        <h2 className="auth-title" style={{ textAlign: "center", marginBottom: "20px" }}>Buat Akun Baru</h2>

        {error && (
          <div className="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: "center", marginBottom: "24px" }}>
            <PhotoUpload
              value={form.foto}
              onChange={(url) => setForm((prev) => ({ ...prev, foto: url }))}
              helperText="Unggah foto profil Anda (maksimal 8 MB)"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Nama Lengkap <span className="required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-control"
              placeholder="Nama lengkap Anda"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="tempatLahir">
                Tempat Lahir <span className="required">*</span>
              </label>
              <input
                id="tempatLahir"
                name="tempatLahir"
                type="text"
                className="form-control"
                placeholder="Contoh: Jakarta"
                value={form.tempatLahir}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tanggalLahir">
                Tanggal Lahir <span className="required">*</span>
              </label>
              <input
                id="tanggalLahir"
                name="tanggalLahir"
                type="date"
                className="form-control"
                value={form.tanggalLahir}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="jenisKelamin">
              Jenis Kelamin <span className="required">*</span>
            </label>
            <select
              id="jenisKelamin"
              name="jenisKelamin"
              className="form-control"
              value={form.jenisKelamin}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Jenis Kelamin --</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="kategori">
              Kategori <span className="required">*</span>
            </label>
            <select
              id="kategori"
              name="kategori"
              className="form-control"
              value={form.kategori}
              onChange={handleChange}
              required
            >
              <option value="Generus">Generus</option>
              <option value="Usia Mandiri">Usia Mandiri</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="kategoriUsia">
              Pekerjaan / Pendidikan <span className="required">*</span>
            </label>
            <select
              id="kategoriUsia"
              name="kategoriUsia"
              className="form-control"
              value={form.kategoriUsia}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih --</option>
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
            <label className="form-label" htmlFor="namaOrtu">
              Nama Orang Tua / Wali <span className="required">*</span>
            </label>
            <input
              type="text"
              id="namaOrtu"
              name="namaOrtu"
              className="form-control"
              value={form.namaOrtu}
              onChange={handleChange}
              placeholder="Masukkan nama orang tua atau wali"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="noTelp">
              Nomor WhatsApp Anda <span className="required">*</span>
            </label>
            <input
              type="text"
              id="noTelp"
              name="noTelp"
              className="form-control"
              value={form.noTelp}
              onChange={handleChange}
              placeholder="Contoh: 081234567890"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="noTelpOrtu">
              Nomor WhatsApp Orangtua <span className="required">*</span>
            </label>
            <input
              type="text"
              id="noTelpOrtu"
              name="noTelpOrtu"
              className="form-control"
              value={form.noTelpOrtu}
              onChange={handleChange}
              placeholder="Contoh: 081234567891"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="desaId">
              Desa <span className="required">*</span>
            </label>
            <select
              id="desaId"
              name="desaId"
              className="form-control"
              value={form.desaId}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Desa --</option>
              {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="kelompokId">
              Kelompok <span className="required">*</span>
            </label>
            <select
              id="kelompokId"
              name="kelompokId"
              className="form-control"
              value={form.kelompokId}
              onChange={handleChange}
              required
              disabled={!form.desaId}
            >
              <option value="">-- Pilih Kelompok --</option>
              {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="alamat">
              Alamat Lengkap <span className="required">*</span>
            </label>
            <textarea
              id="alamat"
              name="alamat"
              className="form-control"
              value={form.alamat}
              onChange={handleChange}
              placeholder="Masukkan alamat domisili saat ini"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="contoh@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>


          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password <span className="required">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Min. 8 karakter"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-light)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                Konfirmasi Password <span className="required">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Ulangi password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-light)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0
                  }}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <div className="auth-footer">
          Sudah punya akun?{" "}
          <Link href="/login" style={{ fontWeight: 600 }}>
            Masuk sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
