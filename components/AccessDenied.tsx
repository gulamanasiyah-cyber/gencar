"use client";

import { ShieldAlert, LogOut } from "lucide-react";
import { useState } from "react";

export default function AccessDenied() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout failed:", e);
      setLoading(false);
    }
  };

  return (
    <div className="access-denied-container">
      <style>{`
        .access-denied-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }
        .access-denied-card {
           max-width: 500px;
           width: 100%;
           background: white;
           border-radius: 30px;
           padding: 50px 30px;
           text-align: center;
           box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
           border: 1px solid #e2e8f0;
           position: relative;
           overflow: hidden;
        }
        .access-denied-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #ef4444, #f97316);
        }
        .icon-wrapper {
          width: 90px;
          height: 90px;
          background: #fef2f2;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #ef4444;
          position: relative;
        }
        .icon-wrapper .shield-icon {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 30px;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 12px;
          letter-spacing: -1.2px;
          line-height: 1.2;
        }
        p {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .btn-logout {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ef4444;
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-logout:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-2px);
        }
        .btn-logout:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
      
      <div className="access-denied-card">
        <div className="badge">
          <ShieldAlert size={12} />
          Broken Access Control
        </div>
        
        <div className="icon-wrapper">
          <ShieldAlert className="shield-icon" size={44} />
        </div>
        
        <h1>Akses Ditolak</h1>
        <p>
          Akun Anda saat ini tidak memiliki peran (role) yang aktif untuk mengakses sistem ini. 
          Silakan hubungi Administrator untuk mengaktifkan role akun Anda.
        </p>

        <button 
          onClick={handleLogout} 
          disabled={loading}
          className="btn-logout"
        >
          <LogOut size={16} />
          {loading ? "Keluar..." : "Keluar dari Akun"}
        </button>
      </div>
    </div>
  );
}
