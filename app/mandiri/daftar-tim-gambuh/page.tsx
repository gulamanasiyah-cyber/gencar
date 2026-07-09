"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";

interface Daerah { id: number; nama: string; kota: string; }
interface Desa { id: number; nama: string; mandiriDaerahId: number; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }

export default function DaftarTimGambuhPage() {
  const [form, setForm] = useState({
    nama: "",
    umur: "",
    noTelp: "",
    tipe: "PNKB",
    daerahId: "",
    desaId: "",
    kelompokId: "",
  });

  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [filteredKelompokList, setFilteredKelompokList] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data && data.role) {
          setUserRole(data.role);
        }
      })
      .catch(() => {});
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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
            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#64748b" }}>Nama Terdaftar:</p>
            <h3 style={{ margin: 0, color: "#0f172a" }}>{form.nama}</h3>
          </div>
          {userRole === "admin_romantic_room" ? (
            <button 
              onClick={() => {
                window.location.href = "/login";
              }} 
              className="btn btn-primary btn-full" 
              style={{ padding: "15px", fontSize: "16px", fontWeight: "700", width: "100%", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Buka Panel Tim Gambuh
            </button>
          ) : (
            <Link href="/mandiri/tim-gambuh" className="btn btn-primary btn-full" style={{ padding: "15px", fontSize: "16px", fontWeight: "700" }}>
              Buka Panel Tim Gambuh
            </Link>
          )}
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

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
