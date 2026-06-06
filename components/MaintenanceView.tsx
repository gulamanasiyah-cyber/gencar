"use client";

import { Wrench, Clock, Hammer, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function MaintenanceView() {
  return (
    <div className="maintenance-container">
      <style>{`
        .maintenance-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }
        .maintenance-card {
           max-width: 600px;
           width: 100%;
           background: white;
           border-radius: 30px;
           padding: 60px 40px;
           text-align: center;
           box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
           border: 1px solid #e2e8f0;
           position: relative;
           overflow: hidden;
        }
        .maintenance-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
        }
        .icon-wrapper {
          width: 100px;
          height: 100px;
          background: #eff6ff;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          color: #2563eb;
          position: relative;
        }
        .icon-wrapper .wrench-icon {
          animation: wrench-move 2s ease-in-out infinite;
        }
        @keyframes wrench-move {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(20deg); }
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }
        h1 {
          font-size: 36px;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 16px;
          letter-spacing: -1px;
          line-height: 1.2;
        }
        p {
          font-size: 16px;
          color: #64748b;
          line-height: 1.8;
          margin-bottom: 40px;
        }
        .contact-info {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding-top: 40px;
          border-top: 1px solid #f1f5f9;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #94a3b8;
        }
        .btn-admin {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #1e293b;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-admin:hover {
          background: #334155;
          transform: translateY(-2px);
        }
      `}</style>
      
      <div className="maintenance-card">
        <div className="badge">
          <Clock size={14} />
          Sedang Dalam Perbaikan
        </div>
        
        <div className="icon-wrapper">
          <Wrench className="wrench-icon" size={48} />
        </div>
        
        <h1>Kami Akan Segera Kembali</h1>
        <p>
          Mohon maaf atas ketidaknyamanannya. Saat ini website GENCAR sedang dalam proses pemeliharaan sistem rutin untuk meningkatkan layanan kami.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="contact-info">
              <div className="contact-item">
                <ShieldAlert size={16} />
                <span>Estimasi: 30-60 Menit</span>
              </div>
              <div className="contact-item">
                <Hammer size={16} />
                <span>Update Sistem v2.1</span>
              </div>
            </div>

            <Link href="/login" className="btn-admin">
              Login Administrator
            </Link>
        </div>
      </div>
    </div>
  );
}
