"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect } from "react";

export default function AnggaranBiayaPage() {
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  if (!mounted) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <Topbar title="Admin - Anggaran & Biaya" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Anggaran & Biaya</h2>
            <p>Manajemen anggaran dan biaya operasional kegiatan</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary">
              <span style={{ marginRight: '8px' }}>+</span>
              Tambah Anggaran
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Anggaran</div>
              <div className="stat-value">Rp 0</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Terserap (Biaya)</div>
              <div className="stat-value">Rp 0</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(249, 115, 22, 0.1)", color: "#f97316" }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Sisa Anggaran</div>
              <div className="stat-value">Rp 0</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3>Riwayat Pengeluaran (Placeholder)</h3>
          </div>
          <div className="table-wrapper">
             <div className="empty-state" style={{ padding: '60px 20px' }}>
                <p>Belum ada data anggaran atau biaya yang dicatat.</p>
                <p className="text-muted" style={{ fontSize: '14px' }}>Modul ini sedang dalam pengembangan.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
