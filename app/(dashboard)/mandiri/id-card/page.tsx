"use client";
export const runtime = "edge";


import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { 
  CreditCard, 
  Upload, 
  Download, 
  Printer, 
  User, 
  MapPin, 
  ShieldCheck, 
  RefreshCw,
  Palette,
  Search
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

const GRADIENTS = [
  { name: "Ocean Deep", value: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)" },
  { name: "Midnight Purple", value: "linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)" },
  { name: "Royal Emerald", value: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)" },
  { name: "Sunset Crimson", value: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)" },
  { name: "Cyber Dark", value: "linear-gradient(135deg, #000000 0%, #434343 100%)" },
  { name: "Gold Luxury", value: "linear-gradient(135deg, #92400e 0%, #f59e0b 100%)" },
];

export default function IDCardBuilderPage() {
  const [formData, setFormData] = useState({
    nama: "",
    daerah: "",
    desa: "",
    role: "Role Pengurus",
    dapukan: "",
    foto: "",
    nomorUnik: "",
    jenisKelamin: "L",
    kegiatanId: ""
  });

  const [kegiatanList, setKegiatanList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gradient, setGradient] = useState(GRADIENTS[0].value);
  const [qrColor, setQrColor] = useState("#ffffff");
  const [isExporting, setIsExporting] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qrCanvasRef.current && formData.nomorUnik) {
      QRCode.toCanvas(qrCanvasRef.current, formData.nomorUnik, {
        width: 150,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [formData.nomorUnik]);

  useEffect(() => {
    // Generate initial random ID only on client
    setFormData(prev => ({ 
      ...prev, 
      nomorUnik: "JB2-" + Math.random().toString(36).substring(2, 8).toUpperCase() 
    }));

    // Fetch kegiatan list
    fetch("/api/mandiri/kegiatan").then(r => r.json()).then(data => {
      setKegiatanList(Array.isArray(data) ? data : []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, kegiatanId: data[0].id }));
      }
    });

    // Handle site logo
    const updateLogo = () => {
      setSiteLogo((window as any).__SITE_LOGO__ || null);
    };
    updateLogo();
    window.addEventListener('site-logo-updated', updateLogo);
    
    // Also fetch if window.__SITE_LOGO__ isn't set yet (direct page load)
    if (!(window as any).__SITE_LOGO__) {
      fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
          if (data.site_logo) {
            setSiteLogo(data.site_logo);
            (window as any).__SITE_LOGO__ = data.site_logo;
            window.dispatchEvent(new Event('site-logo-updated'));
          }
        });
    }

    return () => window.removeEventListener('site-logo-updated', updateLogo);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/generus?search=${query}&limit=5`, { cache: "no-store" });
      const json = await res.json();
      setSearchResults(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectParticipant = (item: any) => {
    setFormData(prev => ({
      ...prev,
      nama: item.nama || "",
      daerah: item.mandiriDesaKota || item.desaKota || "",
      desa: item.mandiriDesaNama || item.desaNama || "",
      dapukan: item.role === "admin" ? "PANITIA" : "PESERTA",
      foto: item.foto || "",
      nomorUnik: item.nomorUnik || item.id?.toString() || "",
      jenisKelamin: item.jenisKelamin || prev.jenisKelamin
    }));
    setSearchResults([]);
    setSearchQuery("");
  };

  const syncToDatabase = async (silent = false) => {
    if (!formData.nama) {
      if (!silent) Swal.fire("Peringatan", "Nama lengkap wajib diisi", "warning");
      return false;
    }

    if (!silent) {
      Swal.fire({
        title: "Menyimpan Data...",
        text: "Sedang mensinkronkan data",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
    }

    try {
      const res = await fetch("/api/mandiri/sync-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, gradient })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal sinkronisasi");

      if (!silent) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: json.message,
          timer: 1500,
          showConfirmButton: false
        });
      }
      return true;
    } catch (e: any) {
      console.error(e);
      if (!silent) Swal.fire("Gagal", e.message || "Terjadi kesalahan sistem", "error");
      return false;
    }
  };

  const handleSaveAndAbsensi = async () => {
    if (!formData.kegiatanId) {
      Swal.fire("Peringatan", "Pilih kegiatan target absensi", "warning");
      return;
    }
    
    setIsSaving(true);
    await syncToDatabase();
    setIsSaving(false);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    // Auto sync when downloading
    await syncToDatabase(true);

    setIsExporting(true);
    Swal.fire({
      title: "Generasi Gambar...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
      });
      
      const link = document.createElement("a");
      link.download = `ID_CARD_${formData.nama.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      Swal.fire("Berhasil", "ID Card telah diunduh", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mengunduh ID Card", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!cardRef.current) return;
    
    // Auto sync when printing
    await syncToDatabase(true);

    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });
      
      // Card size in PDF (e.g., 85.6mm x 54mm standard) - but we use vertical
      // User requested vertical arrangement
      const cardWidth = 100;
      const cardHeight = 160;
      const x = (210 - cardWidth) / 2;
      const y = (297 - cardHeight) / 2;
      
      pdf.addImage(imgData, "JPEG", x, y, cardWidth, cardHeight);
      pdf.autoPrint();
      window.open(pdf.output("bloburl"), "_blank");
      
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mencetak ID Card", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="builder-container">
      <div className="builder-grid">
        {/* Left Panel: Inputs */}
        <div className="builder-panel">
          <div className="panel-header">
            <div className="icon-badge">
              <Palette size={20} />
            </div>
            <div>
              <h2>ID Card Builder</h2>
              <p>Sesuaikan data dan desain kartu</p>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Data Identitas</h3>
            <div className="input-group">
              <label><User size={14} /> Nama Lengkap</label>
              <input 
                type="text" 
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                placeholder="Masukkan Nama Lengkap"
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label><MapPin size={14} /> Asal Kota / Daerah</label>
                <input 
                  type="text" 
                  name="daerah"
                  value={formData.daerah}
                  onChange={handleInputChange}
                  placeholder="Contoh: Jakarta Barat"
                />
              </div>
              <div className="input-group">
                <label><MapPin size={14} /> Asal Desa</label>
                <input 
                  type="text" 
                  name="desa"
                  value={formData.desa}
                  onChange={handleInputChange}
                  placeholder="Nama Desa"
                />
              </div>
            </div>

            <div className="input-group">
              <label><ShieldCheck size={14} /> Role</label>
              <select 
                name="role"
                className="dropdown-box"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="Role Pengurus">Role Pengurus</option>
                <option value="Role Panitia">Role Panitia</option>
              </select>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label><ShieldCheck size={14} /> Dapukan</label>
                <input 
                  type="text" 
                  name="dapukan"
                  value={formData.dapukan}
                  onChange={handleInputChange}
                  placeholder="Contoh: Panitia / Pengurus"
                />
              </div>
              <div className="input-group">
                <label><Search size={14} /> Jenis Kelamin</label>
                <select 
                  name="jenisKelamin"
                  className="dropdown-box"
                  value={formData.jenisKelamin}
                  onChange={handleInputChange}
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label><Printer size={14} /> Target Absensi Kegiatan</label>
              <select 
                name="kegiatanId"
                className="dropdown-box"
                value={formData.kegiatanId}
                onChange={handleInputChange}
              >
                <option value="">-- Hanya Buat ID Card (Tanpa Absensi) --</option>
                {kegiatanList.map(k => (
                  <option key={k.id} value={k.id}>{k.judul}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label><Upload size={14} /> Foto Peserta</label>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFotoUpload}
                  id="foto-upload"
                  className="hidden-input"
                />
                <label htmlFor="foto-upload" className="file-upload-label">
                  <Upload size={18} />
                  <span>{formData.foto ? "Ganti Foto" : "Unggah Foto"}</span>
                </label>
              </div>
              {formData.foto && (
                <button 
                  className="btn-remove-photo"
                  onClick={() => setFormData(prev => ({ ...prev, foto: "" }))}
                >
                  Hapus Foto
                </button>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Konfigurasi Desain</h3>
            <div className="color-presets">
              <label>Warna Gradasi</label>
              <div className="preset-grid">
                {GRADIENTS.map((g, idx) => (
                  <button 
                    key={idx}
                    className={`preset-btn ${gradient === g.value ? "active" : ""}`}
                    style={{ background: g.value }}
                    onClick={() => setGradient(g.value)}
                    title={g.name}
                  />
                ))}
              </div>
            </div>

            <div className="input-group mt-6">
              <label><RefreshCw size={14} /> Nomor ID (Barcode)</label>
              <div className="flex-input">
                <input 
                  type="text" 
                  name="nomorUnik"
                  value={formData.nomorUnik}
                  onChange={handleInputChange}
                />
                <button 
                  className="btn-refresh" 
                  onClick={() => setFormData(prev => ({ ...prev, nomorUnik: "JB2-" + Math.random().toString(36).substring(2, 8).toUpperCase() }))}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="action-footer">
            <button className="btn-action btn-print" onClick={handlePrint}>
              <Printer size={18} />
              <span>Simpan PDF</span>
            </button>
            <button className="btn-action btn-download" onClick={handleDownload} disabled={isExporting}>
              <Download size={18} />
              <span>Unduh PNG</span>
            </button>
            <button 
              className="btn-action btn-sync" 
              onClick={handleSaveAndAbsensi} 
              disabled={isSaving}
              style={{ gridColumn: "span 2", background: "#10b981", color: "white" }}
            >
              <RefreshCw size={18} className={isSaving ? "animate-spin" : ""} />
              <span>Simpan Data</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="preview-panel">
          <div className="preview-sticky">
            <div className="preview-label">Live Preview</div>
            
            {/* The ID Card Design */}
            <div ref={cardRef} className="id-card-wrapper">
              <div className="id-card-main" style={{ background: gradient }}>
                {/* Header Decoration */}
                <div className="id-card-decoration">
                   <div className="dec-circle c1" />
                   <div className="dec-circle c2" />
                </div>

                <div className="id-card-content">
                  {/* Title / Logo */}
                  <div className="id-header">
                    <div className="id-logo">
                       {siteLogo ? (
                         <img src={siteLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                       ) : (
                         <CreditCard size={24} />
                       )}
                    </div>
                    <div className="id-brand">
                      <h1>ID CARD</h1>
                      <p>PDKT V2.0</p>
                    </div>
                  </div>

                  {/* Photo Section */}
                  <div className="id-photo-container">
                    <div className="id-photo-frame">
                      {formData.foto ? (
                        <img src={formData.foto} alt="Profile" />
                      ) : (
                        <div className="photo-placeholder">
                          <User size={64} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="id-info">
                    <h2 className="id-name">{formData.nama.toUpperCase() || "NAMA LENGKAP"}</h2>
                    <div className="id-role">{(formData.role || formData.dapukan || "DAFTAR PESERTA").toUpperCase()}</div>
                    
                    <div className="id-details">
                      <div className="detail-item">
                        <label>ASAL DAERAH</label>
                        <span>{formData.daerah || "DAERAH"}</span>
                      </div>
                      <div className="detail-item">
                        <label>ASAL DESA</label>
                        <span>{formData.desa || "DESA"}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Section */}
                  <div className="id-qr-box">
                    <div className="qr-container">
                      <canvas ref={qrCanvasRef} />
                    </div>
                    <div className="id-number">{formData.nomorUnik}</div>
                  </div>
                </div>

                {/* Footer seal */}
                <div className="id-footer-seal">
                  <span>DIGITAL IDENTITY VERIFIED</span>
                </div>
              </div>
            </div>
            
            <p className="preview-note">ID Card ini diatur untuk ukuran vertikal (100x160mm)</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .builder-container {
          padding: 40px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .builder-grid {
          display: grid;
          grid-template-columns: 450px 1fr;
          gap: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Panel Common */
        .builder-panel {
          background: white;
          padding: 32px;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.03);
          border: 1px solid #e2e8f0;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .icon-badge {
          width: 48px;
          height: 48px;
          background: #3b82f6;
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
        }

        .panel-header h2 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: #1e293b;
        }

        .panel-header p {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          font-weight: 800;
          margin-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 14px;
          transition: 0.2s;
          outline: none;
        }

        .input-group input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }

        .dropdown-box {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 14px;
          transition: 0.2s;
          outline: none;
          background-color: white;
          cursor: pointer;
        }

        .dropdown-box:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }

        .search-box:focus-within {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }

        .search-container {
          position: relative;
        }

        .search-with-loading {
          position: relative;
          display: flex;
          align-items: center;
        }

        .spinner-small {
          position: absolute;
          right: 12px;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-top: 4px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 100;
          max-height: 300px;
          overflow-y: auto;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          transition: 0.2s;
        }

        .result-item:hover {
          background: #f8fafc;
        }

        .result-item:not(:last-child) {
          border-bottom: 1px solid #f1f5f9;
        }

        .result-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #64748b;
          overflow: hidden;
          flex-shrink: 0;
        }

        .result-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-sub {
          font-size: 11px;
          color: #64748b;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* File Upload */
        .file-upload-wrapper {
          position: relative;
        }

        .hidden-input {
          position: absolute;
          width: 0.1px;
          height: 0.1px;
          opacity: 0;
          overflow: hidden;
          z-index: -1;
        }

        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          padding: 24px;
          border-radius: 16px;
          cursor: pointer;
          color: #64748b;
          transition: 0.2s;
          text-align: center;
        }

        .file-upload-label:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .file-upload-label span {
          margin-top: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .btn-remove-photo {
          margin-top: 8px;
          font-size: 12px;
          color: #ef4444;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }

        /* Color Presets */
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-top: 8px;
        }

        .preset-btn {
          height: 40px;
          border-radius: 10px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .preset-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.1);
        }

        .preset-btn.active {
          border-color: #1e293b;
          transform: scale(1.1);
        }

        .flex-input {
          display: flex;
          gap: 8px;
        }

        .btn-refresh {
          padding: 0 12px;
          border-radius: 12px;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-refresh:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        /* Footer Actions */
        .action-footer {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .btn-action {
          padding: 14px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          transition: 0.2s;
        }

        .btn-print {
          background: #1e293b;
          color: white;
        }

        .btn-print:hover {
          background: #000;
          transform: translateY(-2px);
        }

        .btn-download {
          background: #3b82f6;
          color: white;
        }

        .btn-download:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }

        /* Right Panel: Preview */
        .preview-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .preview-sticky {
          position: sticky;
          top: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .preview-label {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 24px;
          background: #f1f5f9;
          padding: 4px 16px;
          border-radius: 30px;
        }

        .preview-note {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 24px;
          font-style: italic;
        }

        /* ID Card Design */
        .id-card-wrapper {
          padding: 10px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
        }

        .id-card-main {
          width: 400px;
          height: 640px; /* Golden ratio roughly 1:1.6 */
          border-radius: 15px;
          position: relative;
          overflow: hidden;
          color: white;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .id-card-decoration {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          opacity: 0.15;
        }

        .dec-circle {
          position: absolute;
          border-radius: 50%;
          background: white;
        }

        .c1 {
          width: 300px;
          height: 300px;
          top: -100px;
          right: -50px;
        }

        .c2 {
          width: 200px;
          height: 200px;
          bottom: -50px;
          left: -80px;
        }

        .id-card-content {
          padding: 40px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .id-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 40px;
          width: 100%;
        }

        .id-logo {
          width: 50px;
          height: 50px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .id-brand h1 {
          font-size: 24px;
          font-weight: 950;
          margin: 0;
          line-height: 1;
          letter-spacing: 1px;
        }

        .id-brand p {
          font-size: 10px;
          margin: 4px 0 0 0;
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.8;
        }

        .id-photo-container {
          margin-bottom: 30px;
        }

        .id-photo-frame {
          width: 200px;
          height: 200px;
          border-radius: 20px;
          padding: 8px;
          background: white;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .id-photo-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 14px;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          background: #f1f5f9;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .id-info {
          text-align: center;
          width: 100%;
        }

        .id-name {
          font-size: 24px;
          font-weight: 900;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .id-role {
          display: inline-block;
          padding: 4px 16px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          border-radius: 30px;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 24px;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .id-details {
          display: flex;
          justify-content: space-around;
          background: rgba(0,0,0,0.1);
          padding: 15px;
          border-radius: 16px;
          width: 100%;
          text-align: left;
        }

        .detail-item label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .detail-item span {
          font-size: 14px;
          font-weight: 700;
        }

        .id-qr-box {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .qr-container {
          padding: 10px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .qr-container canvas {
          width: 100px !important;
          height: 100px !important;
        }

        .id-number {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 2px;
          opacity: 0.9;
        }

        .id-footer-seal {
          padding: 15px;
          text-align: center;
          background: rgba(0,0,0,0.1);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        @media (max-width: 1000px) {
          .builder-grid {
            grid-template-columns: 1fr;
          }
          .builder-panel {
            order: 2;
          }
          .preview-panel {
            order: 1;
          }
          .preview-sticky {
            position: relative;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
