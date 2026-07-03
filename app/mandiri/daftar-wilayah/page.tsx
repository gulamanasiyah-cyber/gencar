"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, MapPin } from "lucide-react";

interface DaerahItem { id: number; nama: string; }
interface DesaItem { id: number; nama: string; mandiriDaerahId: number; }
interface KelompokItem { id: number; nama: string; mandiriDesaId: number; }

export default function DaftarWilayahPage() {
  const [daerahList, setDaerahList] = useState<DaerahItem[]>([]);
  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokItem[]>([]);

  const [daerahId, setDaerahId] = useState("");
  const [daerahBaru, setDaerahBaru] = useState("");
  const [desaId, setDesaId] = useState("");
  const [desaBaru, setDesaBaru] = useState("");
  const [kelompokId, setKelompokId] = useState("");
  const [kelompokBaru, setKelompokBaru] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/public/mandiri/daerah").then(r => r.json()),
      fetch("/api/public/mandiri/desa").then(r => r.json()),
      fetch("/api/public/mandiri/kelompok").then(r => r.json()),
    ]).then(([da, de, ke]) => {
      setDaerahList(Array.isArray(da) ? da : []);
      setDesaList(Array.isArray(de) ? de : []);
      setKelompokList(Array.isArray(ke) ? ke : []);
    });
  }, []);

  const filteredDesa = desaList.filter(d => d.mandiriDaerahId === Number(daerahId));

  const isNewDaerah = daerahId === "__new__";
  const isNewDesa = desaId === "__new__";
  const isNewKelompok = kelompokId === "__new__";

  const filteredKelompok = isNewDesa ? [] : kelompokList.filter(k => k.mandiriDesaId === Number(desaId));

  const canSubmit = (daerahId && !isNewDaerah) || daerahBaru.trim()
    ? ((desaId && !isNewDesa) || desaBaru.trim())
      ? ((kelompokId && !isNewKelompok) || kelompokBaru.trim())
      : false
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Resolve or create Daerah
      let resolvedDaerahId: number;
      if (isNewDaerah || !daerahId) {
        const res = await fetch("/api/public/mandiri/wilayah", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "daerah", nama: daerahBaru.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mendaftarkan daerah");
        resolvedDaerahId = data.id;
      } else {
        resolvedDaerahId = Number(daerahId);
      }

      // Step 2: Resolve or create Desa
      let resolvedDesaId: number;
      if (isNewDesa || !desaId) {
        const res = await fetch("/api/public/mandiri/wilayah", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "desa", nama: desaBaru.trim(), parentId: resolvedDaerahId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mendaftarkan desa");
        resolvedDesaId = data.id;
      } else {
        resolvedDesaId = Number(desaId);
      }

      // Step 3: Resolve or create Kelompok (required)
      if ((isNewKelompok && kelompokBaru.trim()) || (!isNewKelompok && kelompokId)) {
        const res = await fetch("/api/public/mandiri/wilayah", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "kelompok",
            nama: isNewKelompok ? kelompokBaru.trim() : kelompokList.find(k => k.id === Number(kelompokId))?.nama || "",
            parentId: resolvedDesaId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mendaftarkan kelompok");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDaerahId(""); setDaerahBaru("");
    setDesaId(""); setDesaBaru("");
    setKelompokId(""); setKelompokBaru("");
    setSuccess(false); setError("");
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1e293b",
    backgroundColor: "#fff", outline: "none", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1.5px solid #6366f1", fontSize: "14px", color: "#1e293b",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px", display: "block",
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "40px 32px", maxWidth: "440px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Berhasil Didaftarkan!</h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px", lineHeight: 1.6 }}>
            Wilayah berhasil disimpan. Admin akan memverifikasi dan mengaktifkan data ini sebelum digunakan.
          </p>
          <button
            onClick={handleReset}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            Daftarkan Wilayah Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "36px 32px", maxWidth: "480px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <MapPin size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>Daftar Wilayah</h1>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
            Pilih wilayah yang sudah ada, atau ketik nama baru untuk mendaftarkannya.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Daerah */}
            <div>
              <label style={labelStyle}>Daerah <span style={{ color: "#ef4444" }}>*</span></label>
              <select
                value={daerahId}
                onChange={e => { setDaerahId(e.target.value); setDesaId(""); setDesaBaru(""); setKelompokId(""); setKelompokBaru(""); }}
                style={selectStyle}
                required
              >
                <option value="">-- Pilih Daerah --</option>
                {daerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                <option value="__new__">＋ Tambah daerah baru...</option>
              </select>
              {isNewDaerah && (
                <input
                  style={{ ...inputStyle, marginTop: "8px" }}
                  placeholder="Ketik nama daerah baru..."
                  value={daerahBaru}
                  onChange={e => setDaerahBaru(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Desa */}
            <div>
              <label style={labelStyle}>Desa <span style={{ color: "#ef4444" }}>*</span></label>
              <select
                value={desaId}
                onChange={e => { setDesaId(e.target.value); setKelompokId(""); setKelompokBaru(""); }}
                style={{ ...selectStyle, opacity: (!daerahId) ? 0.5 : 1 }}
                disabled={!daerahId}
                required
              >
                <option value="">-- Pilih Desa --</option>
                {filteredDesa.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                <option value="__new__">＋ Tambah desa baru...</option>
              </select>
              {isNewDesa && (
                <input
                  style={{ ...inputStyle, marginTop: "8px" }}
                  placeholder="Ketik nama desa baru..."
                  value={desaBaru}
                  onChange={e => setDesaBaru(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Kelompok (required) */}
            <div>
              <label style={labelStyle}>Kelompok <span style={{ color: "#ef4444" }}>*</span></label>
              <select
                value={kelompokId}
                onChange={e => setKelompokId(e.target.value)}
                style={{ ...selectStyle, opacity: !desaId ? 0.5 : 1 }}
                disabled={!desaId}
                required
              >
                <option value="">-- Pilih Kelompok --</option>
                {filteredKelompok.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                <option value="__new__">
                  {filteredKelompok.length === 0 ? '＋ Tambah kelompok baru (belum ada data)' : '＋ Tambah kelompok baru...'}
                </option>
              </select>
              {isNewKelompok && (
                <input
                  style={{ ...inputStyle, marginTop: "8px" }}
                  placeholder="Ketik nama kelompok baru..."
                  value={kelompokBaru}
                  onChange={e => setKelompokBaru(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              style={{
                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: (loading || !canSubmit) ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontSize: "15px", fontWeight: 700, cursor: (loading || !canSubmit) ? "not-allowed" : "pointer",
                transition: "opacity 0.2s", marginTop: "4px", opacity: (loading || !canSubmit) ? 0.7 : 1,
              }}
            >
              {loading ? "Menyimpan..." : "Simpan Wilayah"}
            </button>
          </div>
        </form>

        <p style={{ fontSize: "11.5px", color: "#94a3b8", textAlign: "center", marginTop: "20px", lineHeight: 1.6 }}>
          Data yang didaftarkan akan diverifikasi dan diaktifkan oleh Admin sebelum digunakan pada pendaftaran peserta.
=======
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import SearchableSelect from "@/components/mandiri/SearchableSelect";

interface Daerah { id: number; nama: string; }
interface Desa { id: number; nama: string; mandiriDaerahId: number; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }

export default function MandiriDaftarWilayahPage() {
  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  const [daerahId, setDaerahId] = useState("");
  const [desaId, setDesaId] = useState("");
  const [kelompokId, setKelompokId] = useState("");

  const fetchAll = useCallback(async () => {
    const [da, de, ke] = await Promise.all([
      fetch("/api/public/mandiri/daerah", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/public/mandiri/desa?scope=all", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok?scope=all", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setDaerahList(Array.isArray(da) ? da : []);
    setDesaList(Array.isArray(de) ? de : []);
    setKelompokList(Array.isArray(ke) ? ke : []);
  }, []);

  useEffect(() => {
    fetchAll();
    if (typeof window !== "undefined") {
      const handleLogoUpdate = () => setSiteLogo((window as any).__SITE_LOGO__ || null);
      handleLogoUpdate();
      window.addEventListener("site-logo-updated", handleLogoUpdate);
      return () => window.removeEventListener("site-logo-updated", handleLogoUpdate);
    }
  }, [fetchAll]);

  const desaOptions = desaList.filter((d) => String(d.mandiriDaerahId) === daerahId);
  const kelompokOptions = kelompokList.filter((k) => String(k.mandiriDesaId) === desaId);

  const handleAddNewDaerah = async (name: string) => {
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "daerah", nama: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah daerah baru" });
      throw new Error(data.error);
    }
    setDaerahList((prev) => (prev.some((d) => d.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Daerah "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleAddNewDesa = async (name: string) => {
    if (!daerahId) return { id: "", name: "" };
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "desa", nama: name, parentId: Number(daerahId) }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah desa baru" });
      throw new Error(data.error);
    }
    setDesaList((prev) => (prev.some((d) => d.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama, mandiriDaerahId: Number(daerahId) }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Desa "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleAddNewKelompok = async (name: string) => {
    if (!desaId) return { id: "", name: "" };
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "kelompok", nama: name, parentId: Number(desaId) }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah kelompok baru" });
      throw new Error(data.error);
    }
    setKelompokList((prev) => (prev.some((k) => k.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama, mandiriDesaId: Number(desaId) }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Kelompok "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleReset = () => {
    setDaerahId("");
    setDesaId("");
    setKelompokId("");
  };

  return (
    <div className="auth-page" style={{ padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: "600px" }}>
        <div className="auth-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
          {siteLogo && <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />}
          <div style={{ textAlign: "left" }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR</h1>
            <p style={{ margin: 0, fontSize: "11px" }}>Sistem Manajemen Mandiri JB2</p>
          </div>
        </div>

        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
            Pendaftaran Daerah, Desa & Kelompok
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Pilih Daerah, Desa, dan Kelompok yang sudah ada, atau ketik nama baru untuk mendaftarkannya langsung.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Daerah <span className="required">*</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Daerah..."
            options={daerahList.map((d) => ({ id: d.id, name: d.nama }))}
            value={daerahId}
            onChange={(val) => {
              setDaerahId(val);
              setDesaId("");
              setKelompokId("");
            }}
            onAddNew={handleAddNewDaerah}
          />
        </div>

        <div className="form-group" style={{ marginTop: "16px" }}>
          <label className="form-label">Desa <span className="required">*</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Desa..."
            options={desaOptions.map((d) => ({ id: d.id, name: d.nama }))}
            value={desaId}
            onChange={(val) => {
              setDesaId(val);
              setKelompokId("");
            }}
            disabled={!daerahId}
            onAddNew={handleAddNewDesa}
          />
        </div>

        <div className="form-group" style={{ marginTop: "16px" }}>
          <label className="form-label">Kelompok <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Opsional)</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Kelompok..."
            options={kelompokOptions.map((k) => ({ id: k.id, name: k.nama }))}
            value={kelompokId}
            onChange={(val) => setKelompokId(val)}
            disabled={!desaId}
            onAddNew={handleAddNewKelompok}
          />
        </div>

        <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: "24px" }} onClick={handleReset}>
          Daftarkan Wilayah Lain
        </button>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "20px" }}>
          Setiap pilihan "Tambah baru" langsung didaftarkan ke sistem. Data yang didaftarkan di sini akan diverifikasi dan diaktifkan oleh Admin sebelum digunakan pada pendaftaran peserta.
>>>>>>> 2974e76d7d7472f2ccd8d3352d381c7b2682f134
        </p>
      </div>
    </div>
  );
}
