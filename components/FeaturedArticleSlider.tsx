"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Article {
  id: string;
  judul: string;
  ringkasan: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  authorName: string | null;
  tipe?: string;
}

interface Props {
  articles: Article[];
}

export default function FeaturedArticleSlider({ articles }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
      setIsAnimating(false);
    }, 400);
  }, [articles.length, isAnimating]);

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? articles.length - 1 : prev - 1));
      setIsAnimating(false);
    }, 400);
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      nextSlide();
    }, 3000); // 3 seconds interval
    return () => clearInterval(timer);
  }, [nextSlide]);



  if (!articles || articles.length === 0) return null;

  const current = articles[currentIndex];

  return (
    <div className="fas-container">
      <style jsx>{`
        .fas-container {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .fas-card {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 0;
          background: white;
          overflow: hidden;
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 480px;
        }
        .fas-card.animating {
          opacity: 0;
          transform: scale(0.98);
        }

        .fas-img {
          height: 100%;
          position: relative;
          background: #f1f5f9;
          overflow: hidden;
        }
        .fas-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 1s ease;
        }
        .fas-card:hover .fas-img img {
          transform: scale(1.03);
        }
        .fas-content {
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          background: linear-gradient(to right, #ffffff, #fcfdfe);
        }
        .fas-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary-lt);
          color: var(--primary);
          font-size: 11px;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          width: fit-content;
        }
        .fas-badge::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
        }
        .fas-title {
          font-family: 'Inter', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          letter-spacing: -0.02em;
        }
        .fas-desc {
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 30px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fas-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-top: auto;
        }
        .fas-author {
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fas-nav {
          position: absolute;
          bottom: 30px;
          right: 30px;
          display: flex;
          gap: 12px;
          z-index: 10;
        }
        .nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #1e293b;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .nav-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
        }

        @media (max-width: 1100px) {
          .fas-title { font-size: 28px; }
          .fas-content { padding: 30px; }
        }

        @media (max-width: 900px) {
          .fas-card { grid-template-columns: 1fr; }
          .fas-img { height: 320px; }
          .fas-content { padding: 40px; }
        }

        @media (max-width: 600px) {
          .fas-img { height: 240px; }
          .fas-content { padding: 24px; }
          .fas-title { font-size: 24px; }
          .fas-nav { bottom: 20px; right: 20px; }
          .nav-btn { width: 40px; height: 40px; }
        }

      `}</style>

      <div className={`fas-card ${isAnimating ? "animating" : ""}`}>
        <div className="fas-img">
          {current.coverImage ? (
            <img src={current.coverImage} alt={current.judul} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e293b', color: 'rgba(255,255,255,0.1)', fontSize: 100 }}>🕌</div>
          )}
        </div>

        <div className="fas-content">
          <Link href={`/artikel/${current.id}`} style={{ textDecoration: 'none' }}>
            <div className="fas-badge">{current.tipe === "berita" ? "Berita Utama" : "Artikel Utama"}</div>
            <h2 className="fas-title">{current.judul}</h2>
            <p className="fas-desc">{current.ringkasan || "Klik untuk membaca selengkapnya mengenai informasi penting ini."}</p>
            <div className="fas-meta">
              <span className="fas-author">{current.authorName || "Admin"}</span>
              <span>•</span>
              <span suppressHydrationWarning>
                {mounted && current.publishedAt 
                  ? new Date(current.publishedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) 
                  : "..."}
              </span>
            </div>
          </Link>

          <div className="fas-nav">
            <button className="nav-btn" onClick={prevSlide} aria-label="Previous Article">
              <ChevronLeft size={20} />
            </button>
            <button className="nav-btn" onClick={nextSlide} aria-label="Next Article">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
