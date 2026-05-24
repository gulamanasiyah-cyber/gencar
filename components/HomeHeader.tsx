"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import NewsTicker from "./NewsTicker";
import LandingProfileWidget from "./LandingProfileWidget";

const DigitalClock = dynamic(() => import("@/components/DigitalClock"), { ssr: false });

export default function HomeHeader({ session }: { session: any }) {
  const [mounted, setMounted] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleLogoUpdate = () => {
      setSiteLogo((window as any).__SITE_LOGO__ || null);
    };
    handleLogoUpdate();
    window.addEventListener('site-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
  }, []);

  // Return a baseline skeleton on server to match initial client render
  // Crucially, this skeleton MUST be identical to the first render on browser.
  return (
    <div suppressHydrationWarning>
      {/* ═══ TOPBAR ═══ */}
      <div className="topbar">
        <div className="wrap">
          <div className="topbar-inner">
            <DigitalClock />
            <div className="topbar-auth">
              {session ? (
                !["generus", "usia_mandiri"].includes(session.role) && (
                  <Link href="/dashboard" className="tb-btn tb-btn-dashboard">⚡ Dashboard</Link>
                )
              ) : (
                <>
                  <Link href="/login" className="tb-btn tb-btn-ghost">Masuk</Link>
                  <Link href="/register" className="tb-btn tb-btn-fill">Daftar</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MASTHEAD ═══ */}
      <div className="masthead">
        <div className="wrap">
          <div className="masthead-inner">
            <div className="masthead-brand">
              {siteLogo ? (
                <img src={siteLogo} alt="Logo" className="masthead-logo-img" />
              ) : (
                <div className="masthead-logo">J</div>
              )}
              <div className="masthead-text">
                <div className="masthead-title">GENERASI PENERUS PC LDII JAKARTA BARAT 2</div>
                <div className="masthead-sub">Berita & Informasi Generasi Penerus</div>
              </div>
            </div>

            <div className="masthead-right">
              <div className="masthead-right-content">
                <DigitalClock className="masthead-edition" />
                <LandingProfileWidget session={session} />
              </div>
              <div className="masthead-cta">
                {session ? (
                  !["generus", "usia_mandiri"].includes(session.role) && (
                    <Link href="/dashboard" className="ms-btn ms-btn-dash">Dashboard →</Link>
                  )
                ) : (
                  <>
                    <Link href="/login" className="ms-btn ms-btn-border">Masuk</Link>
                    <Link href="/register" className="ms-btn ms-btn-fill">Daftar</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .topbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 36px;
          gap: 30px;
        }
        .masthead-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .masthead-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .masthead-logo-img {
          width: 52px;
          height: 52px;
          object-fit: contain;
          border-radius: 10px;
        }
        .masthead-logo {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--success-dk), var(--success));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 24px;
        }
        .masthead-title {
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--navy);
          line-height: 1.2;
        }
        .masthead-sub {
          font-size: 11px;
          color: var(--gray-lt);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          margin-top: 4px;
        }
        .masthead-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .masthead-right-content {
          display: flex;
          align-items: center;
        }
        .masthead-cta {
          display: flex;
          gap: 10px;
        }
        
        @media (max-width: 992px) {
          .topbar-inner { gap: 10px; }
          .masthead { padding: 12px 0; }
          .masthead-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
          .masthead-right { 
            display: flex; 
            flex-direction: row; 
            justify-content: flex-end; 
            width: 100%; 
            align-items: center; 
            border-top: 1px solid var(--border); 
            padding-top: 12px; 
            margin-top: 4px;
          }
          .masthead-right-content { justify-content: flex-end; }
          .masthead-brand { gap: 12px; }
          .masthead-logo-img, .masthead-logo { width: 44px; height: 44px; }
          .masthead-logo { font-size: 20px; }
          .masthead-title { font-size: 16px; line-height: 1.3; }
          .masthead-sub { font-size: 9px; }
          :global(.masthead-edition) { display: none !important; }
        }
      `}</style>

    </div>
  );
}
