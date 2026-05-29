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
                <div className="masthead-title">GENCAR BERKARYA INDONESIA</div>
                <div className="masthead-sub">Berita & Informasi Generasi Muda Cengkareng</div>
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
        .topbar {
          background: var(--navy, #1e293b);
          border-bottom: 2px solid var(--primary, #dc2626);
        }
        .tb-btn {
          font-size: 11px; font-weight: 600; padding: 3px 12px;
          border-radius: 3px; letter-spacing: 0.3px; transition: all 0.18s;
          text-decoration: none; display: inline-block;
        }
        .tb-btn-ghost { color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.15); }
        .tb-btn-ghost:hover { color: white; border-color: rgba(255,255,255,0.4); }
        .tb-btn-fill { background: var(--primary, #dc2626); color: white; }
        .tb-btn-fill:hover { background: var(--primary-dk, #b91c1c); }
        .tb-btn-dashboard { background: var(--primary, #dc2626); color: white; }
        .tb-btn-dashboard:hover { background: var(--primary-dk, #b91c1c); }
        
        .masthead {
          background: var(--white, #fff);
          border-bottom: 1px solid var(--border, #e2e8f0);
          padding: 18px 0 14px;
        }
        
        .ms-btn {
          font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 4px;
          transition: all 0.18s; text-decoration: none; display: inline-block;
        }
        .ms-btn-border { border: 1.5px solid var(--border, #e2e8f0); color: var(--slate, #334155); }
        .ms-btn-border:hover { border-color: var(--primary, #dc2626); color: var(--primary, #dc2626); }
        .ms-btn-fill { background: var(--primary, #dc2626); color: white; }
        .ms-btn-fill:hover { background: var(--primary-dk, #b91c1c); }
        .ms-btn-dash { background: var(--navy, #1e293b); color: white; }
        .ms-btn-dash:hover { background: var(--slate, #334155); }

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
          background: linear-gradient(135deg, var(--primary), var(--warning));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 24px;
        }
        .masthead-title {
          font-family: var(--font-montserrat), 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--navy);
          line-height: 1.2;
          text-transform: uppercase;
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
          .masthead-title { font-size: 18px; line-height: 1.3; }
          .masthead-sub { font-size: 9px; }
          :global(.masthead-edition) { display: none !important; }
        }
      `}</style>

    </div>
  );
}
