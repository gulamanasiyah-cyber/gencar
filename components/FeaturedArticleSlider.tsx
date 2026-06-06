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
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          background: #ffffff;
        }
        .fas-card {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 0;
          background: white;
          overflow: hidden;
          min-height: 460px;
          position: relative;
        }
        
        .fas-img, .fas-content {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .fas-card.animating .fas-img {
          opacity: 0;
          transform: scale(1.015);
        }
        
        .fas-card.animating .fas-content {
          opacity: 0;
          transform: translateX(8px);
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
          transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fas-card:hover .fas-img img {
          transform: scale(1.04);
        }

        /* Premium Placeholder Style */
        .fas-placeholder-wrap {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%);
          position: relative;
          overflow: hidden;
        }
        .fas-placeholder-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.8;
        }
        .fas-placeholder-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 70%);
          filter: blur(20px);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .fas-placeholder-icon-wrap {
          position: relative;
          z-index: 2;
          width: 110px;
          height: 110px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          margin-bottom: 16px;
          transition: all 0.5s ease;
        }
        .fas-card:hover .fas-placeholder-icon-wrap {
          transform: scale(1.08) rotate(5deg);
          border-color: rgba(220, 38, 38, 0.4);
          box-shadow: 0 12px 40px 0 rgba(220, 38, 38, 0.2);
        }
        .fas-placeholder-icon {
          font-size: 54px;
          filter: drop-shadow(0 0 12px rgba(255,255,255,0.2));
        }
        .fas-placeholder-logo-text {
          position: relative;
          z-index: 2;
          font-size: 11px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 2px;
          text-transform: uppercase;
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
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          width: fit-content;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }
        .fas-badge::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: white;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        .fas-title {
          font-family: 'Playfair Display', 'Merriweather', Georgia, serif;
          font-size: 30px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.3;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          letter-spacing: -0.01em;
          transition: color 0.25s ease;
        }
        .fas-card:hover .fas-title {
          color: #dc2626;
        }

        .fas-desc {
          font-size: 14px;
          color: #475569;
          line-height: 1.65;
          margin-bottom: 32px;
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
          color: #64748b;
          margin-top: auto;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .fas-author {
          color: #0f172a;
          font-weight: 700;
        }

        .fas-nav {
          position: absolute;
          bottom: 30px;
          right: 30px;
          display: flex;
          gap: 10px;
          z-index: 10;
        }
        .nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #0f172a;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .nav-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border-color: transparent;
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
        }

        @media (max-width: 1100px) {
          .fas-title { font-size: 26px; }
          .fas-content { padding: 30px; }
        }

        @media (max-width: 900px) {
          .fas-card { grid-template-columns: 1fr; }
          .fas-img { height: 300px; }
          .fas-content { padding: 32px 30px 40px; }
          .fas-nav { bottom: 24px; right: 30px; }
        }

        @media (max-width: 600px) {
          .fas-img { height: 230px; }
          .fas-content { padding: 24px 20px 36px; }
          .fas-title { font-size: 22px; margin-bottom: 12px; }
          .fas-desc { font-size: 13px; margin-bottom: 24px; }
          .fas-nav { bottom: 20px; right: 20px; }
          .nav-btn { width: 38px; height: 38px; }
        }
      `}</style>

      <div className={`fas-card ${isAnimating ? "animating" : ""}`}>
        <div className="fas-img">
          {current.coverImage ? (
            <img src={current.coverImage} alt={current.judul} />
          ) : (
            <div className="fas-placeholder-wrap">
              <div className="fas-placeholder-pattern" />
              <div className="fas-placeholder-glow" />
              <div className="fas-placeholder-icon-wrap">
                <span className="fas-placeholder-icon">🕌</span>
              </div>
              <span className="fas-placeholder-logo-text">Gencar</span>
            </div>
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
