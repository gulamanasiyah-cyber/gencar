"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import LandingProfileWidget from "./LandingProfileWidget";

const DigitalClock = dynamic(() => import("@/components/DigitalClock"), { ssr: false });

export default function HomeHeader({ session }: { session: any }) {
  const [mounted, setMounted] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [registrationActive, setRegistrationActive] = useState(true);

  useEffect(() => {
    setMounted(true);
    const handleLogoUpdate = () => {
      setSiteLogo((window as any).__SITE_LOGO__ || null);
    };
    handleLogoUpdate();
    window.addEventListener('site-logo-updated', handleLogoUpdate);

    fetch("/api/settings").then(r => r.json()).then(s => {
      setRegistrationActive(s.generus_registration_active !== "false");
    }).catch(console.error);

    return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
  }, []);

  return (
    <div suppressHydrationWarning>
      {/* ═══ TOP BAR ═══ */}
      <div className="hh-topbar">
        <div className="hh-wrap">
          <div className="hh-topbar-inner">
            <div className="hh-topbar-left">
              <span className="hh-live-dot" />
              <span className="hh-topbar-text">
                <DigitalClock />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MASTHEAD ═══ */}
      <div className="hh-masthead">
        <div className="hh-wrap">
          <div className="hh-masthead-inner">
            <div className="hh-brand">
              {siteLogo ? (
                <img src={siteLogo} alt="Logo" className="hh-logo-img" />
              ) : (
                <div className="hh-logo-placeholder">
                  <span>G</span>
                </div>
              )}
              <div className="hh-brand-text">
                <div className="hh-brand-name">GENCAR</div>
                <div className="hh-brand-tagline">Portal Berita & Informasi Generus Muda Cengkareng</div>
              </div>
            </div>

            <div className="hh-masthead-right">
              <LandingProfileWidget session={session} />
              <div className="hh-cta-group">
                {session ? (
                  !["generus", "usia_mandiri"].includes(session.role) && (
                    <Link href="/dashboard" className="hh-cta-btn hh-cta-dark">
                      Dashboard →
                    </Link>
                  )
                ) : (
                  <>
                    <Link href="/login" className="hh-cta-btn hh-cta-dark">Masuk</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hh-topbar {
          background: #0f172a;
          border-bottom: 1px solid rgba(220, 38, 38, 0.4);
        }
        .hh-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .hh-topbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 38px;
        }
        .hh-topbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hh-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: hh-pulse-dot 2s infinite;
          flex-shrink: 0;
        }
        @keyframes hh-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #10b981; }
          50% { opacity: 0.6; box-shadow: 0 0 14px #10b981; }
        }
        .hh-topbar-text {
          font-size: 11.5px;
          color: rgba(255,255,255,0.55);
          font-weight: 500;
          letter-spacing: 0.2px;
        }
        .hh-topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        :global(.hh-btn) {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        :global(.hh-btn-ghost) {
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.18);
        }
        :global(.hh-btn-ghost:hover) {
          color: white;
          border-color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.06);
        }
        :global(.hh-btn-primary) {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border: 1px solid rgba(220,38,38,0.5);
          box-shadow: 0 2px 8px rgba(220,38,38,0.3);
        }
        :global(.hh-btn-primary:hover) {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 4px 14px rgba(220,38,38,0.4);
          transform: translateY(-1px);
        }

        /* MASTHEAD */
        .hh-masthead {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 2px solid #e2e8f0;
          padding: 20px 0 16px;
          position: relative;
          overflow: hidden;
        }
        .hh-masthead::before {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(135deg, rgba(220,38,38,0.03) 0%, rgba(234,179,8,0.04) 100%);
          pointer-events: none;
        }
        .hh-masthead-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
        }
        .hh-brand {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .hh-logo-img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .hh-logo-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, #dc2626, #eab308);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(220,38,38,0.3);
          flex-shrink: 0;
        }
        .hh-logo-placeholder span {
          font-size: 28px;
          font-weight: 900;
          color: white;
          line-height: 1;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .hh-brand-text {}
        .hh-brand-name {
          font-family: var(--font-montserrat), 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
          text-transform: uppercase;
        }
        .hh-brand-tagline {
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-top: 4px;
        }

        .hh-masthead-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }
        .hh-cta-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        :global(.hh-cta-btn) {
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 20px;
          border-radius: 8px;
          transition: all 0.22s;
          text-decoration: none;
          display: inline-block;
        }
        :global(.hh-cta-outline) {
          border: 1.5px solid #0f172a;
          color: #0f172a;
          background: transparent;
          padding: 7px 16px;
        }
        :global(.hh-cta-outline:hover) {
          color: white;
          background: #0f172a;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }
        :global(.hh-cta-fill) {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border-radius: 100px;
          padding: 8px 22px;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);
        }
        :global(.hh-cta-fill:hover) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(220, 38, 38, 0.35);
        }
        :global(.hh-cta-dark) {
          background: #0f172a;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        :global(.hh-cta-dark:hover) {
          background: #1e293b;
          transform: translateY(-2px);
        }

        @media (max-width: 900px) {
          .hh-masthead { padding: 14px 0; }
          .hh-masthead-inner { flex-direction: column; align-items: flex-start; gap: 14px; }
          .hh-masthead-right {
            flex-direction: row;
            align-items: center;
            justify-content: flex-end;
            width: 100%;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
          .hh-brand-name { font-size: 22px; }
          .hh-brand-tagline { font-size: 9px; }
          .hh-logo-img, .hh-logo-placeholder { width: 46px; height: 46px; }
        }
        @media (max-width: 500px) {
          .hh-brand-name { font-size: 18px; letter-spacing: -0.5px; }
          .hh-cta-group { gap: 6px; }
          :global(.hh-cta-btn) { font-size: 11px; padding: 6px 14px; }
        }
      `}</style>
    </div>
  );
}
