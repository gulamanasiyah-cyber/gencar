"use client";
import { useState, useEffect } from "react";

export default function GlobalLoading() {
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

  return (
    <div className="page-loader-overlay">
      <div className="loader-progress-bar" />
      <div className="loader-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {siteLogo && (
          <img src={siteLogo} alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
        )}
        <span style={{
          background: "linear-gradient(135deg, #dc2626, #eab308)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
          fontWeight: 900
        }}>
          GENCAR BERKARYA INDONESIA
        </span>
      </div>
      <div className="loader-dots">
        <div className="loader-dot" />
        <div className="loader-dot" />
        <div className="loader-dot" />
      </div>
      <p style={{ 
        marginTop: 10, 
        fontSize: 14, 
        color: 'var(--text-muted)', 
        fontWeight: 500 
      }}>Mewujudkan Generasi Penerus Profesional Religius</p>
    </div>
  );
}
