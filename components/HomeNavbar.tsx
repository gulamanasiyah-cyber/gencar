"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Search, ChevronDown } from "lucide-react";

export default function HomeNavbar({ query, session }: { query?: string; session?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

            <Link href="/login" className="nav-link nav-mobile-only" onClick={() => setIsOpen(false)}>Masuk</Link>
            <Link href="/register" className="nav-link nav-mobile-only" onClick={() => setIsOpen(false)}>Daftar</Link>
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
      `}</style>
    </nav>
  );
}
