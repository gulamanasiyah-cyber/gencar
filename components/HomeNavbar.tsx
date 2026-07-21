"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Search, ChevronDown } from "lucide-react";

import Swal from "sweetalert2";

export default function HomeNavbar({ query, session }: { query?: string; session?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Saran/Masukan Form States
  const [showSaranModal, setShowSaranModal] = useState(false);
  const [saranForm, setSaranForm] = useState({
    untuk: "",
    saran: "",
    nama: "",
    isAnonim: false,
  });
  const [submittingSaran, setSubmittingSaran] = useState(false);

  const handleSaranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saranForm.untuk.trim() || !saranForm.saran.trim()) {
      Swal.fire({ icon: "warning", title: "Peringatan", text: "Mohon lengkapi kolom 'untuk siapa' dan 'saran/masukan'." });
      return;
    }
    
    setSubmittingSaran(true);
    try {
      const res = await fetch("/api/public/saran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saranForm),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Terima kasih! Saran dan masukan Anda telah terkirim.",
          timer: 2000,
          showConfirmButton: false,
        });
        setSaranForm({ untuk: "", saran: "", nama: "", isAnonim: false });
        setShowSaranModal(false);
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal mengirim saran/masukan." });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setSubmittingSaran(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap">
        <div className="navbar-inner">
          {/* Mobile Toggle */}
          <button
            className="landing-hamburger"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Nav Links */}
          <div className={`nav-links ${isOpen ? "active" : ""}`}>
            <Link href="/" className="nav-link nav-link-active" onClick={() => setIsOpen(false)}>Beranda</Link>
            <Link href="/#artikel" className="nav-link" onClick={() => setIsOpen(false)}>Artikel</Link>
            <Link href="/#berita" className="nav-link" onClick={() => setIsOpen(false)}>Berita</Link>

            {session && ["generus", "usia_mandiri"].includes(session.role) && (
              <Link href="/scan" className="nav-link" onClick={() => setIsOpen(false)}>Absensi</Link>
            )}

            <div className="nav-item">
              <button className="nav-link dropdown-toggle" style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                Organisasi
                <ChevronDown size={14} style={{ marginLeft: 6, opacity: 0.7 }} />
              </button>
              <div className="nav-dropdown">
                <Link href="/#kegiatan" className="nav-dropdown-link" onClick={() => setIsOpen(false)}>Kegiatan</Link>
                <Link href="/organisasi" className="nav-dropdown-link" onClick={() => setIsOpen(false)}>Tentang Kami</Link>
              </div>
            </div>

            <button 
              className="nav-link" 
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', outline: 'none' }}
              onClick={() => {
                setShowSaranModal(true);
                setIsOpen(false);
              }}
            >
              Saran/Masukan
            </button>

            <Link href="/login" className="nav-link nav-mobile-only" onClick={() => setIsOpen(false)}>Masuk</Link>
          </div>

          {/* Search Bar - Desktop */}
          <form action="/" method="GET" className="nav-search">
            <Search size={16} strokeWidth={2.5} />
            <input type="text" name="q" placeholder="Cari di Web ini..." defaultValue={query} />
            {query && (
              <Link href="/" className="search-clear" title="Bersihkan">×</Link>
            )}
          </form>

          {/* Mobile Search Button (Optional, can just use the form) */}
        </div>
      </div>

      {showSaranModal && (
        <div className="modal-overlay" onClick={() => setShowSaranModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kirim Saran & Masukan</h3>
              <button className="modal-close" onClick={() => setShowSaranModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaranSubmit}>
              <div className="modal-body">
                <div className="form-group-saran">
                  <label className="form-label-saran">Untuk Siapa? <span className="required-saran">*</span></label>
                  <input
                    type="text"
                    className="form-control-saran"
                    placeholder="Contoh: Pengurus Desa, Panitia Acara, dll"
                    value={saranForm.untuk}
                    onChange={(e) => setSaranForm({ ...saranForm, untuk: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-saran">
                  <label className="form-label-saran">Saran & Masukan <span className="required-saran">*</span></label>
                  <textarea
                    className="form-control-saran"
                    rows={4}
                    placeholder="Tulis saran atau masukan Anda di sini..."
                    value={saranForm.saran}
                    onChange={(e) => setSaranForm({ ...saranForm, saran: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-saran anonim-checkbox-container">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '500', color: 'var(--navy)' }}>
                    <input
                      type="checkbox"
                      checked={saranForm.isAnonim}
                      onChange={(e) => setSaranForm({ ...saranForm, isAnonim: e.target.checked })}
                    />
                    Kirim sebagai Anonim
                  </label>
                </div>

                {!saranForm.isAnonim && (
                  <div className="form-group-saran">
                    <label className="form-label-saran">Nama Anda</label>
                    <input
                      type="text"
                      className="form-control-saran"
                      placeholder="Masukkan nama Anda"
                      value={saranForm.nama}
                      onChange={(e) => setSaranForm({ ...saranForm, nama: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-saran btn-saran-secondary" onClick={() => setShowSaranModal(false)}>Batal</button>
                <button type="submit" className="btn-saran btn-saran-primary" disabled={submittingSaran}>
                  {submittingSaran ? "Mengirim..." : "Kirim Masukan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .navbar {
          background: linear-gradient(135deg, var(--primary), var(--warning));
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
        }
        .navbar.scrolled {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          background: var(--navy);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
        }
        .nav-links {
          display: flex;
          align-items: center;
        }
        .nav-link {
          display: block;
          padding: 0 16px;
          height: 60px;
          line-height: 60px;
          font-size: 13.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          text-decoration: none;
        }
        .nav-link:hover, .nav-link-active {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          border-bottom-color: white;
        }
        .nav-mobile-only {
          display: none;
        }

        /* Dropdown */
        .nav-item { position: relative; }
        .nav-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          min-width: 200px;
          background: white;
          border-radius: 0 0 12px 12px;
          box-shadow: var(--shadow-lg);
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.2s ease;
          border-top: 3px solid var(--primary);
          overflow: hidden;
          padding: 8px 0;
        }
        .nav-item:hover .nav-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .nav-dropdown-link {
          display: block;
          padding: 12px 20px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--navy);
          text-decoration: none;
          transition: all 0.2s;
        }
        .nav-dropdown-link:hover {
          background: var(--primary-lt);
          color: var(--primary);
          padding-left: 24px;
        }

        .landing-hamburger {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
        }

        .nav-search {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0 16px;
          border-radius: 100px;
          width: 280px;
          height: 38px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
        }
        .nav-search:focus-within {
          width: 320px;
          background: white;
          border-color: white;
          color: var(--navy);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .nav-search input {
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font-size: 13px;
          width: 100%;
          font-weight: 500;
          margin-left: 10px;
        }
        .nav-search input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        .nav-search:focus-within input::placeholder {
          color: var(--gray-lt);
        }
        .search-clear {
          font-size: 20px;
          color: inherit;
          opacity: 0.6;
          margin-left: 8px;
          text-decoration: none;
        }

        @media (max-width: 1024px) {
          .nav-search { width: 200px; }
          .nav-search:focus-within { width: 240px; }
        }

        @media (max-width: 768px) {
          .landing-hamburger { display: block; }
          .nav-search { display: none; }
          
          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--navy);
            flex-direction: column;
            align-items: flex-start;
            padding: 10px 0;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          }
          .nav-links.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
          .nav-link {
            width: 100%;
            height: 50px;
            line-height: 50px;
            padding: 0 24px;
            border-bottom: none;
            border-left: 4px solid transparent;
          }
          .nav-link:hover, .nav-link-active {
            border-bottom-color: transparent;
            border-left-color: white;
          }
          .nav-dropdown {
            position: static;
            opacity: 1;
            visibility: visible;
            transform: none;
            background: rgba(255, 255, 255, 0.05);
            width: 100%;
            border-top: none;
            padding: 0;
            display: none; /* Initially hidden, can be toggled or just show all */
          }
          .nav-item:hover .nav-dropdown {
            display: block;
          }
          .nav-dropdown-link {
            color: rgba(255, 255, 255, 0.7);
            padding-left: 40px;
          }
          .nav-mobile-only {
            display: block;
          }
        }

        /* Saran/Masukan Modal Styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: var(--navy, #0f172a);
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 26px;
          color: #94a3b8;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .modal-close:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .form-group-saran {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }
        .form-label-saran {
          font-size: 11.5px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .required-saran {
          color: #ef4444;
        }
        .form-control-saran {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          font-family: inherit;
          transition: all 0.2s;
        }
        .form-control-saran:focus {
          border-color: var(--primary, #3b82f6);
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .anonim-checkbox-container {
          margin: 2px 0;
          display: flex;
          align-items: center;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }
        .btn-saran {
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-saran-secondary {
          background: #e2e8f0;
          color: #475569;
        }
        .btn-saran-secondary:hover {
          background: #cbd5e1;
        }
        .btn-saran-primary {
          background: var(--primary, #3b82f6);
          color: white;
        }
        .btn-saran-primary:hover {
          background: #2563eb;
        }
        .btn-saran:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </nav>
  );
}
