"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";

interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; mandiriDaerahId: number; }

export default function DaftarTimPenungguPage() {
  const [form, setForm] = useState({
    nama: "",
    daerahId: "",
    desaId: "",
  });

  const [daerahList, setDaerahList] = useState<Desa[]>([]);
  const [desaList, setDesaList] = useState<Kelompok[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [resultId, setResultId] = useState("");

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
      fetch("/api/public/mandiri/daerah").then((r) => r.json()),
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
    ]).then(([daerahs, desas]) => {
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
      }
      if (Array.isArray(desas)) {
        setDesaList(desas);
      }
    });
  }, []);

  useEffect(() => {
    if (form.daerahId) {
      setFilteredDesaList(desaList.filter(d => d.mandiriDaerahId === Number(form.daerahId)));
    } else {
      setFilteredDesaList([]);
    }
    setForm(prev => ({ ...prev, desaId: "" }));
  }, [form.daerahId, desaList]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.nama || !form.daerahId || !form.desaId) {
        Swal.fire({ icon: "warning", title: "Data Belum Lengkap", text: "Mohon isi nama, daerah, dan desa Anda." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/daftar-tim-penunggu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      setSuccess(true);
      setResultId(data.id);
      Swal.fire({ icon: "success", title: "Berhasil!", text: "Anda telah terdaftar sebagai Tim Penunggu." });
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
            Anda telah berhasil mendaftar sebagai <b>Tim Penunggu</b>.
          </p>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#64748b" }}>Nama Terdaftar:</p>
            <h3 style={{ margin: 0, color: "#0f172a" }}>{form.nama}</h3>
          </div>
          <Link href="/mandiri/tim-penunggu" className="btn btn-primary btn-full" style={{ padding: "15px", fontSize: "16px", fontWeight: "700" }}>
            Buka Panel Tim Penunggu
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
            Pendaftaran Tim Penunggu saat ini sedang ditutup.
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
            <p style={{ margin: 0, fontSize: '11px' }}>Pendaftaran Tim Penunggu</p>
          </div>
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text)", marginBottom: "12px" }}>
            Pendaftaran Tim Penunggu
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Silakan masukkan nama Anda untuk mendaftar sebagai Tim Penunggu di Romantic Room.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
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

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
