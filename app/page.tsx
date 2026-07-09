
export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { artikel, users, generus, kegiatan, visitorStats } from "@/lib/schema";
import { eq, desc, and, inArray, sql, like, gt } from "drizzle-orm";

import Link from "next/link";
import FeaturedArticleSlider from "@/components/FeaturedArticleSlider";
import { getSession } from "@/lib/auth";

import HomeHeader from "@/components/HomeHeader";
import HomeNavbar from "@/components/HomeNavbar";
import NewsTicker from "@/components/NewsTicker";
import { AutoCarousel } from "@/components/AutoCarousel";
import MaintenanceView from "@/components/MaintenanceView";

import { settings } from "@/lib/schema";
import { checkMaintenance } from "@/lib/maintenance";
import JadwalSholat from "@/components/JadwalSholat";

async function getSiteSettings() {
  try {
    const data = await db.select().from(settings);
    const result: any = {};
    data.forEach(s => { result[s.key] = s.value; });
    return result;
  } catch (err) {
    console.error("DEBUG: Failed to fetch site settings in server component:", err);
    return {};
  }
}

async function getVisitorStats() {
  try {
    return await db.select().from(visitorStats).orderBy(desc(visitorStats.count)).limit(6);
  } catch {
    return [];
  }
}

async function recordVisit() {
  try {
    // Untuk demo/sederhana, kita asumsikan pengunjung dari Indonesia (ID)
    // Di aplikasi nyata, ini bisa menggunakan GeoIP berdasarkan IP address
    const countryCode = "ID";
    const countryName = "Indonesia";

    const existing = await db.select().from(visitorStats).where(eq(visitorStats.countryCode, countryCode)).limit(1);

    if (existing.length > 0) {
      await db.update(visitorStats)
        .set({
          count: sql`${visitorStats.count} + 1`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(visitorStats.countryCode, countryCode));
    } else {
      await db.insert(visitorStats).values({
        countryCode,
        countryName,
        count: 1
      });
    }
  } catch (error) {
    console.error("Error recording visit:", error);
  }
}
async function getPublishedArticles(limit = 12, tipe?: "artikel" | "berita", searchQuery?: string) {
  try {
    // Hanya ambil artikel (bukan berita) yang sudah disetujui (approved/published)
    const filters = [inArray(artikel.status, ["published", "approved"])];

    if (tipe) {
      filters.push(eq(artikel.tipe, tipe));
    }

    if (searchQuery) {
      filters.push(like(artikel.judul, `%${searchQuery}%`));
    }

    return await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        ringkasan: artikel.ringkasan,
        tipe: artikel.tipe,
        coverImage: artikel.coverImage,
        publishedAt: artikel.publishedAt,
        authorName: users.name,
      })
      .from(artikel)
      .leftJoin(users, eq(artikel.authorId, users.id))
      .where(and(...filters))
      .orderBy(desc(artikel.publishedAt))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

async function getPopularArticles(limit = 6) {
  try {
    return await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        coverImage: artikel.coverImage,
        publishedAt: artikel.publishedAt,
        ratingSum: artikel.ratingSum,
        ratingCount: artikel.ratingCount,
      })
      .from(artikel)
      .where(and(inArray(artikel.status, ["published", "approved"]), gt(artikel.ratingCount, 0)))
      .orderBy(desc(artikel.ratingSum))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching popular articles:", error);
    return [];
  }
}

async function getRecentKegiatan(limit = 4, searchQuery?: string) {
  try {
    const filters = [];
    if (searchQuery) {
      filters.push(like(kegiatan.judul, `%${searchQuery}%`));
    }

    return await db
      .select()
      .from(kegiatan)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(kegiatan.tanggal))
      .limit(limit);
  } catch {
    return [];
  }
}


function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const now = new Date();
  const past = new Date(dateStr);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return formatDateShort(dateStr);
}

function getEmbedUrl(mapsLink: string, placeName: string) {
  if (!mapsLink) {
    if (placeName) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    return "";
  }

  // If it's already an iframe source or output=embed
  if (mapsLink.includes("output=embed") || mapsLink.includes("google.com/maps/embed")) {
    return mapsLink;
  }

  // Check if it has coordinates (@lat,lng)
  const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = mapsLink.match(coordRegex);
  if (match) {
    const lat = match[1];
    const lng = match[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // Check if it's a search link with q=
  if (mapsLink.includes("q=")) {
    try {
      const urlObj = new URL(mapsLink);
      const q = urlObj.searchParams.get("q");
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // Fallback to place name or encode the whole link as query
  const query = placeName || mapsLink;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

export default async function LandingPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q;
  const siteSettings = await getSiteSettings();
  const siteLogo = siteSettings.site_logo;
  const lokasiNama = siteSettings.lokasi_nama || "";
  const lokasiGmaps = siteSettings.lokasi_gmaps || "";
  const session = await getSession();

  // Mode Maintenance Check
  if (await checkMaintenance()) {
    return <MaintenanceView />;
  }

  // Catat Kunjungan
  await recordVisit();

  const articles = await getPublishedArticles(20, "artikel", query);
  const news = await getPublishedArticles(10, "berita", query);
  const popularArticles = await getPopularArticles(6);

  const allCombined = [...articles, ...news]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  // Kombinasikan Artikel dan Berita untuk Slider Hero, urutkan berdasarkan tanggal terbaru
  const combinedForHero = allCombined.slice(0, 8);

  const heroSliderArticles = combinedForHero;
  const gridArticles = allCombined.slice(0, 15); // Gunakan pool gabungan untuk grid di bawahnya

  const recentKegiatan = await getRecentKegiatan(4, query);


  const stats = await getVisitorStats();
  const totalVisitors = stats.reduce((acc, s) => acc + s.count, 0);
  const formattedTotal = totalVisitors.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");


  // All date/time logic moved to client-components or removed to prevent hydration mismatch

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', 'Plus Jakarta Sans', sans-serif;
          color: #0f172a;
          background: #f1f5f9;
          line-height: 1.6;
        }
        a { text-decoration: none; color: inherit; }
        img { display: block; max-width: 100%; }

        :root {
          --primary: #dc2626;
          --primary-dk: #b91c1c;
          --primary-lt: #fef2f2;
          --secondary: #64748b;
          --success: #16a34a;
          --warning: #eab308;
          --navy: #0f172a;
          --navy2: #1e293b;
          --slate: #334155;
          --gray: #64748b;
          --gray-lt: #94a3b8;
          --border: #e2e8f0;
          --bg: #f8fafc;
          --white: #ffffff;
          --serif: 'Merriweather', Georgia, serif;
          --sans: 'Inter', sans-serif;
          --r4: 4px;
          --r8: 8px;
          --r12: 12px;
          --r16: 16px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow: 0 4px 16px rgba(0,0,0,0.07);
          --shadow-lg: 0 12px 32px rgba(0,0,0,0.1);
          --green: var(--primary);
          --green-dk: var(--primary-dk);
          --green-lt: var(--primary-lt);
        }

        .lp-wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        /* ═══ NAVBAR ═══ */
        .navbar {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 40%, #7c3aed 100%);
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
          box-shadow: 0 4px 24px rgba(220,38,38,0.3);
        }
        .navbar.scrolled {
          background: rgba(15, 23, 42, 0.98);
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
        }
        .nav-links { display: flex; align-items: center; }
        .nav-link {
          display: block;
          padding: 0 16px;
          height: 56px;
          line-height: 56px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          white-space: nowrap;
          text-decoration: none;
        }
        .nav-link:hover, .nav-link-active {
          color: white;
          background: rgba(255,255,255,0.1);
          border-bottom-color: rgba(255,255,255,0.7);
        }

        /* Dropdown */
        .nav-item { position: relative; }
        .nav-dropdown {
          position: absolute; top: 100%; left: 0; min-width: 200px;
          background: white; border-radius: 0 0 12px 12px;
          box-shadow: var(--shadow-lg);
          opacity: 0; visibility: hidden; transform: translateY(8px);
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          border-top: 3px solid #dc2626;
          overflow: hidden; padding: 8px 0;
        }
        .nav-item:hover .nav-dropdown {
          opacity: 1; visibility: visible; transform: translateY(0);
        }
        .nav-dropdown-link {
          display: block; padding: 11px 20px;
          font-size: 13px; font-weight: 600; color: var(--navy);
          transition: all 0.15s;
          text-decoration: none;
        }
        .nav-dropdown-link:hover {
          background: var(--primary-lt); color: var(--primary); padding-left: 24px;
        }

        .nav-search {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.2);
          padding: 0 16px; border-radius: 100px;
          width: 260px; height: 38px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
        }
        .nav-search:focus-within {
          width: 320px; background: white;
          border-color: white; color: var(--navy);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .nav-search input {
          background: transparent; border: none; outline: none;
          color: inherit; font-size: 13px; width: 100%;
          font-weight: 500; margin-left: 10px;
        }
        .nav-search input::placeholder { color: rgba(255,255,255,0.55); }
        .nav-search:focus-within input::placeholder { color: var(--gray-lt); }
        .search-clear {
          font-size: 18px; color: inherit; opacity: 0.6; margin-left: 8px; text-decoration: none;
        }
        .landing-hamburger {
          display: none; background: none; border: none;
          color: white; cursor: pointer; padding: 8px;
        }
        .nav-mobile-only { display: none; }

        /* ═══ NEWS TICKER ═══ */
        .breaking {
          background: linear-gradient(90deg, #fff8f8, #fff);
          border-bottom: 1px solid rgba(220,38,38,0.15);
          overflow: hidden;
        }
        .breaking-inner { display: flex; align-items: center; }
        .breaking-label {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white; padding: 9px 18px;
          font-size: 10.5px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1.5px;
          white-space: nowrap; flex-shrink: 0;
          display: flex; align-items: center; gap: 6px;
          box-shadow: 4px 0 16px rgba(220,38,38,0.2);
          position: relative;
        }
        .breaking-label::after {
          content: '';
          position: absolute; right: -8px; top: 0; bottom: 0;
          width: 16px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          clip-path: polygon(0 0, 0% 100%, 100% 0%);
        }
        .breaking-track {
          flex: 1; overflow: hidden; background: transparent;
          position: relative; height: 36px;
          display: flex; align-items: center;
        }
        .breaking-scroll {
          display: flex; gap: 60px;
          white-space: nowrap;
          animation: ticker-move 45s linear infinite;
          padding-left: 30px;
        }
        .breaking-item {
          font-size: 12.5px; font-weight: 600; color: var(--navy);
          display: flex; align-items: center; gap: 8px;
        }
        .breaking-item::before {
          content: '●'; color: var(--primary); font-size: 8px;
        }
        @keyframes ticker-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .breaking:hover .breaking-scroll {
          animation-play-state: paused;
        }

        /* ═══ MAIN LAYOUT ═══ */
        .lp-main-layout {
          max-width: 1200px;
          margin: 32px auto 0;
          padding: 0 20px;
          display: grid;
          grid-template-columns: 1fr 316px;
          gap: 28px;
          align-items: start;
        }

        /* ═══ SECTION HEADERS ═══ */
        .lp-sect-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .lp-sect-hd-title {
          font-size: 17px; font-weight: 800;
          color: var(--navy);
          display: flex; align-items: center; gap: 10px;
          letter-spacing: -0.3px;
        }
        .lp-sect-hd-title::before {
          content: '';
          display: block; width: 4px; height: 20px;
          background: linear-gradient(180deg, #dc2626, #eab308);
          border-radius: 2px; flex-shrink: 0;
        }
        .lp-sect-more {
          font-size: 12px; font-weight: 700;
          color: var(--primary);
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px;
          background: var(--primary-lt);
          border: 1.5px solid rgba(220,38,38,0.2);
          border-radius: 100px;
          transition: all 0.2s;
        }
        .lp-sect-more:hover {
          background: var(--primary); color: white;
          border-color: var(--primary);
          transform: translateX(2px);
        }

        /* ═══ HERO SLIDER WRAPPER ═══ */
        .lp-hero-wrap {
          width: 100%; margin-bottom: 32px;
        }

        /* ═══ ARTICLE GRID ═══ */
        .lp-art-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .lp-art-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
          border: 1px solid #e2e8f0;
        }
        .lp-art-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border-color: rgba(220,38,38,0.2);
        }
        .lp-art-img {
          height: 180px;
          background: #f1f5f9;
          position: relative;
          overflow: hidden;
        }
        .lp-art-img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.5s ease;
        }
        .lp-art-card:hover .lp-art-img img { transform: scale(1.07); }
        .lp-art-img-placeholder {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px;
          background: linear-gradient(135deg, #fef2f2, #eff6ff);
          color: rgba(0,0,0,0.15);
        }
        .lp-art-badge {
          position: absolute; top: 12px; left: 12px;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.6px;
          backdrop-filter: blur(8px);
        }
        .lp-art-badge-artikel {
          background: rgba(220,38,38,0.85);
          color: white;
        }
        .lp-art-badge-berita {
          background: rgba(37,99,235,0.85);
          color: white;
        }
        .lp-art-body {
          padding: 16px;
          flex: 1;
          display: flex; flex-direction: column;
        }
        .lp-art-title {
          font-size: 14.5px; font-weight: 700;
          color: var(--navy);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 8px;
          flex: 1;
          transition: color 0.2s;
        }
        .lp-art-card:hover .lp-art-title { color: var(--primary); }
        .lp-art-foot {
          display: flex; align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
          margin-top: auto;
        }
        .lp-art-date {
          font-size: 11px; color: var(--gray-lt);
          display: flex; align-items: center; gap: 4px;
          font-weight: 500;
        }
        .lp-art-read {
          font-size: 11.5px; font-weight: 700;
          color: var(--primary);
        }

        /* ═══ SIDEBAR ═══ */
        .lp-sidebar { display: flex; flex-direction: column; gap: 24px; }

        .lp-widget {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          border: 1px solid #e2e8f0;
        }
        .lp-widget-head {
          padding: 14px 18px;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy2) 100%);
          display: flex; align-items: center; gap: 10px;
        }
        .lp-widget-head-bar {
          width: 3px; height: 16px;
          background: linear-gradient(180deg, #dc2626, #eab308);
          border-radius: 2px; flex-shrink: 0;
        }
        .lp-widget-title {
          font-size: 11.5px; font-weight: 800;
          color: white; text-transform: uppercase;
          letter-spacing: 1.2px;
        }
        .lp-widget-body { padding: 0; }

        /* Sidebar List Items */
        .lp-sw-item {
          display: flex; gap: 12px; padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
          align-items: flex-start;
          text-decoration: none;
        }
        .lp-sw-item:last-child { border-bottom: none; }
        .lp-sw-item:hover { background: #fafafe; }
        .lp-sw-num {
          font-size: 24px; font-weight: 900;
          color: #f1f5f9; line-height: 1;
          flex-shrink: 0; width: 30px;
          font-family: var(--serif);
        }
        .lp-sw-item-body {}
        .lp-sw-item-title {
          font-size: 12.5px; font-weight: 700;
          color: var(--navy); line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 3;
          -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 4px;
          transition: color 0.15s;
        }
        .lp-sw-item:hover .lp-sw-item-title { color: var(--primary); }
        .lp-sw-item-date { font-size: 10.5px; color: var(--gray-lt); }

        /* Sidebar thumbnail item */
        .lp-sw-thumb-item {
          display: flex; gap: 12px; padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
          transition: background 0.15s;
          text-decoration: none;
        }
        .lp-sw-thumb-item:last-child { border-bottom: none; }
        .lp-sw-thumb-item:hover { background: #fafafe; }
        .lp-sw-thumb {
          width: 70px; height: 54px;
          border-radius: 8px; background: #f1f5f9;
          flex-shrink: 0; overflow: hidden;
          position: relative;
        }
        .lp-sw-thumb img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .lp-sw-thumb-placeholder {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; background: linear-gradient(135deg, #fef2f2, #eff6ff);
        }
        .lp-sw-thumb-body {}
        .lp-sw-thumb-title {
          font-size: 12.5px; font-weight: 700;
          color: var(--navy); line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 3px;
          transition: color 0.15s;
        }
        .lp-sw-thumb-item:hover .lp-sw-thumb-title { color: var(--primary); }
        .lp-sw-thumb-date { font-size: 10.5px; color: var(--gray-lt); }

        /* CTA Widget */
        .lp-widget-cta {
          background: linear-gradient(135deg, #dc2626, #b91c1c 40%, #7c3aed);
          padding: 24px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .lp-widget-cta::before {
          content: '';
          position: absolute; top: -30px; right: -30px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .lp-widget-cta::after {
          content: '';
          position: absolute; bottom: -20px; left: -20px;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .lp-cta-icon { font-size: 36px; margin-bottom: 12px; }
        .lp-cta-title {
          font-size: 16px; font-weight: 800; color: white;
          margin-bottom: 8px; line-height: 1.3;
        }
        .lp-cta-desc {
          font-size: 12px; color: rgba(255,255,255,0.7);
          line-height: 1.7; margin-bottom: 16px;
        }
        .lp-cta-btn {
          display: inline-block;
          background: white;
          color: #b91c1c;
          font-size: 13px; font-weight: 800;
          padding: 10px 24px;
          border-radius: 100px;
          transition: all 0.22s;
          position: relative; z-index: 1;
        }
        .lp-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }

        /* Visitor Stats Widget */
        .lp-visitor-stats {
          padding: 20px;
        }
        .lp-stats-total {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin-bottom: 12px;
        }
        .lp-stats-num {
          font-size: 32px; font-weight: 900;
          color: #f97316;
          line-height: 1;
          font-family: var(--serif);
        }
        .lp-stats-label {
          font-size: 10.5px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase; letter-spacing: 1px;
          margin-top: 6px;
        }

        /* ═══ KEGIATAN ═══ */
        .lp-keg-list { display: flex; flex-direction: column; gap: 0; }
        .lp-keg-item {
          display: flex; gap: 14px; padding: 14px 16px;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
        }
        .lp-keg-item:last-child { border-bottom: none; }
        .lp-keg-item:hover { background: #fafafe; }
        .lp-keg-date-block {
          flex-shrink: 0;
          width: 48px; height: 52px;
          border-radius: 10px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(220,38,38,0.25);
        }
        .lp-keg-date-day {
          font-size: 20px; font-weight: 900;
          color: white; line-height: 1;
        }
        .lp-keg-date-mon {
          font-size: 9.5px; font-weight: 800;
          color: rgba(255,255,255,0.75);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .lp-keg-body { flex: 1; }
        .lp-keg-title {
          font-size: 13.5px; font-weight: 700;
          color: var(--navy); line-height: 1.4;
          margin-bottom: 4px;
        }
        .lp-keg-meta {
          font-size: 11px; color: var(--gray-lt);
          display: flex; align-items: center; gap: 4px;
          font-weight: 500;
        }

        /* ═══ ABOUT SECTION ═══ */
        .lp-about {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a2e 100%);
          margin-top: 48px; padding: 64px 0;
          position: relative; overflow: hidden;
        }
        .lp-about::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(220,38,38,0.12), transparent 70%);
          pointer-events: none;
        }
        .lp-about::after {
          content: '';
          position: absolute; bottom: -80px; left: -80px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%);
          pointer-events: none;
        }
        .lp-about-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          position: relative; z-index: 1;
        }
        .lp-about-tag {
          display: inline-block;
          background: linear-gradient(135deg, #dc2626, #eab308);
          color: white;
          font-size: 10px; font-weight: 800;
          padding: 4px 12px; border-radius: 100px;
          text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 18px;
        }
        .lp-about-title {
          font-size: 34px; font-weight: 900;
          color: white; line-height: 1.25;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .lp-about-desc {
          font-size: 15px; color: rgba(255,255,255,0.6);
          line-height: 1.8; margin-bottom: 28px;
        }
        .lp-about-actions { display: flex; gap: 12px; }
        .lp-about-btn-1 {
          padding: 12px 28px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white; border-radius: 8px;
          font-size: 14px; font-weight: 700;
          transition: all 0.22s;
          box-shadow: 0 4px 16px rgba(220,38,38,0.35);
        }
        .lp-about-btn-1:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(220,38,38,0.45);
        }
        .lp-about-btn-2 {
          padding: 12px 24px;
          border: 1.5px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.75);
          border-radius: 8px;
          font-size: 14px; font-weight: 600;
          transition: all 0.22s;
        }
        .lp-about-btn-2:hover {
          background: rgba(255,255,255,0.08); color: white;
          border-color: rgba(255,255,255,0.4);
        }
        .lp-about-values {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .lp-about-val {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 20px;
          transition: all 0.22s;
        }
        .lp-about-val:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(220,38,38,0.3);
          transform: translateY(-2px);
        }
        .lp-about-val-icon { font-size: 26px; margin-bottom: 10px; }
        .lp-about-val-title {
          font-size: 13.5px; font-weight: 700; color: white; margin-bottom: 4px;
        }
        .lp-about-val-desc {
          font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.5;
        }

        /* ═══ FOOTER ═══ */
        .lp-footer {
          background: #070e1a;
          border-top: 3px solid #dc2626;
        }
        .lp-footer-main {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 40px;
          padding: 48px 0 36px;
        }
        .lp-footer-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .lp-footer-logo {
          width: 42px; height: 42px; border-radius: 10px;
          background: linear-gradient(135deg, #dc2626, #eab308);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 900; color: white;
          box-shadow: 0 4px 12px rgba(220,38,38,0.3);
        }
        .lp-footer-logo-name {
          font-size: 20px; font-weight: 900; color: white;
          letter-spacing: -0.5px;
        }
        .lp-footer-desc {
          font-size: 13px; color: rgba(255,255,255,0.5);
          line-height: 1.75; margin-bottom: 20px;
        }
        .lp-footer-col-hd {
          font-size: 11px; font-weight: 800; color: white;
          text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .lp-footer-link {
          display: block; font-size: 13px;
          color: rgba(255,255,255,0.55);
          padding: 4px 0;
          transition: color 0.15s; text-decoration: none;
        }
        .lp-footer-link:hover { color: white; }
        .lp-footer-sep { border: none; border-top: 1px solid rgba(255,255,255,0.06); }
        .lp-footer-bottom {
          padding: 16px 0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .lp-footer-copy { font-size: 12px; color: rgba(255,255,255,0.35); }
        .lp-footer-links-right { display: flex; gap: 20px; }
        .lp-footer-bl { font-size: 12px; color: rgba(255,255,255,0.35); transition: color 0.15s; }
        .lp-footer-bl:hover { color: white; }

        /* ═══ EMPTY STATE ═══ */
        .lp-empty {
          text-align: center; padding: 48px 24px;
          color: var(--gray-lt);
          background: white; border-radius: 16px;
          border: 1px dashed var(--border);
        }
        .lp-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.35; }
        .lp-empty-text { font-size: 14px; }

        /* ═══ VIDEO SECTION ═══ */
        .lp-video-wrap {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          border-radius: 16px;
          margin-bottom: 40px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
        }
        .lp-video-wrap iframe {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; border: none;
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 1024px) {
          .lp-main-layout { grid-template-columns: 1fr; }
          .lp-sidebar { display: none; }
          .lp-art-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-footer-main { grid-template-columns: 1fr 1fr; gap: 28px; }
          .nav-search { width: 220px; }
        }
        @media (max-width: 768px) {
          .landing-hamburger { display: block; }
          .nav-search { display: none; }
          .nav-links {
            position: absolute; top: 100%; left: 0; right: 0;
            background: rgba(15,23,42,0.98);
            backdrop-filter: blur(20px);
            flex-direction: column; align-items: flex-start;
            padding: 10px 0;
            opacity: 0; visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          .nav-links.active {
            opacity: 1; visibility: visible; transform: translateY(0);
          }
          .nav-link {
            width: 100%; height: 50px; line-height: 50px;
            padding: 0 24px; border-bottom: none;
            border-left: 3px solid transparent;
          }
          .nav-link:hover, .nav-link-active {
            border-bottom-color: transparent; border-left-color: #dc2626;
            background: rgba(255,255,255,0.05);
          }
          .nav-mobile-only { display: block; }
          .nav-dropdown {
            position: static; opacity: 1; visibility: visible;
            transform: none; background: rgba(255,255,255,0.05);
            width: 100%; border-top: none; padding: 0;
            box-shadow: none; display: none;
          }
          .nav-item:hover .nav-dropdown { display: block; }
          .nav-dropdown-link { color: rgba(255,255,255,0.65); padding-left: 40px; }
          .nav-dropdown-link:hover { background: rgba(255,255,255,0.06); color: white; }
          .lp-art-grid { grid-template-columns: 1fr; }
          .lp-about-inner { grid-template-columns: 1fr; gap: 40px; }
          .lp-footer-main { grid-template-columns: 1fr; }
          .lp-main-layout { margin-top: 20px; }
        }
        @media (max-width: 480px) {
          .lp-about-title { font-size: 26px; }
          .lp-footer-logo-name { font-size: 17px; }
          .lp-about-values { grid-template-columns: 1fr; }
        }
      `}</style>

        

      <HomeHeader session={session} />
      <HomeNavbar query={query} session={session} />

      {/* News Ticker */}
      <NewsTicker articles={combinedForHero} />

      {!query && (
        <section id="profile" className="lp-wrap" style={{ marginTop: '28px', marginBottom: '8px' }}>
          <div className="lp-sect-hd" style={{ marginBottom: '16px' }}>
            <span className="lp-sect-hd-title">Profil Kami</span>
          </div>
          <div className="lp-video-wrap">
            <iframe
              src="https://www.youtube.com/embed/kkDN69-4zco?autoplay=1&mute=1&loop=1&playlist=kkDN69-4zco&controls=0&modestbranding=1&rel=0&vq=hd720"
              title="GENCAR Hero Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* ═══ HERO + POPULAR SIDEBAR ROW ═══ */}
      <div className="lp-wrap" style={{ marginTop: '28px', marginBottom: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 316px', gap: '24px', alignItems: 'start' }} className="responsive-hero-grid">
          {/* Hero Slider */}
          <div style={{ minWidth: 0 }}>
            {query ? (
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                <div className="lp-sect-hd">
                  <span className="lp-sect-hd-title">Hasil Pencarian: "{query}"</span>
                  <Link href="/" className="lp-sect-more">Hapus ×</Link>
                </div>
              </div>
            ) : (
              <FeaturedArticleSlider articles={heroSliderArticles} />
            )}
          </div>

          {/* Popular Articles Sidebar */}
          <div className="lp-widget" style={{ display: 'none' }} id="hero-popular-sidebar">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Terpopuler</span>
            </div>
            <div className="lp-widget-body">
              {popularArticles.map((item) => (
                <Link href={`/artikel/${item.id}`} key={item.id} className="lp-sw-thumb-item">
                  <div className="lp-sw-thumb">
                    {item.coverImage
                      ? <img src={item.coverImage} alt={item.judul} />
                      : <div className="lp-sw-thumb-placeholder">📰</div>
                    }
                  </div>
                  <div className="lp-sw-thumb-body">
                    <div className="lp-sw-thumb-title">{item.judul}</div>
                    <div className="lp-sw-thumb-date" suppressHydrationWarning>{timeAgo(item.publishedAt)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Popular Sidebar CSS override for desktop show */}
      <style>{`
        @media (min-width: 769px) {
          #hero-popular-sidebar { display: block !important; }
          .responsive-hero-grid { grid-template-columns: minmax(0, 1fr) 316px !important; }
        }
        @media (max-width: 768px) {
          .responsive-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══ MAIN CONTENT LAYOUT ═══ */}
      <div id="beranda" className="lp-main-layout" suppressHydrationWarning>

        {/* ─── LEFT COLUMN ─── */}
        <div>
          {query ? (
            <div>
              {articles.length === 0 && news.length === 0 ? (
                <div className="lp-empty">
                  <div className="lp-empty-icon">🔍</div>
                  <p className="lp-empty-text">Tidak ditemukan artikel atau berita dengan kata kunci "{query}".</p>
                </div>
              ) : (
                <div className="lp-art-grid">
                  {[...articles, ...news].map((item) => (
                    <Link href={`/artikel/${item.id}`} key={item.id} className="lp-art-card">
                      <div className="lp-art-img">
                        {item.coverImage
                          ? <img src={item.coverImage} alt={item.judul} />
                          : <div className="lp-art-img-placeholder">📄</div>
                        }
                        <span className={`lp-art-badge ${item.tipe === 'berita' ? 'lp-art-badge-berita' : 'lp-art-badge-artikel'}`}>{item.tipe}</span>
                      </div>
                      <div className="lp-art-body">
                        <h3 className="lp-art-title">{item.judul}</h3>
                        <div className="lp-art-foot">
                          <span className="lp-art-date">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {formatDateShort(item.publishedAt)}
                          </span>
                          <span className="lp-art-read">Baca →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ARTIKEL TERBARU */}
              <div className="lp-sect-hd" style={{ marginBottom: '20px' }}>
                <span className="lp-sect-hd-title">Artikel & Berita Terbaru</span>
                <Link href="/#artikel" className="lp-sect-more">Lihat Semua →</Link>
              </div>

              <div className="lp-art-grid">
                {gridArticles.map((item) => (
                  <Link href={`/artikel/${item.id}`} key={item.id} className="lp-art-card">
                    <div className="lp-art-img">
                      {item.coverImage
                        ? <img src={item.coverImage} alt={item.judul} />
                        : <div className="lp-art-img-placeholder">📄</div>
                      }
                      <span className={`lp-art-badge ${item.tipe === 'berita' ? 'lp-art-badge-berita' : 'lp-art-badge-artikel'}`}>{item.tipe}</span>
                    </div>
                    <div className="lp-art-body">
                      <h3 className="lp-art-title">{item.judul}</h3>
                      <div className="lp-art-foot">
                        <span className="lp-art-date">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {formatDateShort(item.publishedAt)}
                        </span>
                        <span className="lp-art-read">Baca →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* LOKASI KAMI */}
              {lokasiNama && (
                <div style={{ marginBottom: '40px' }}>
                  <div className="lp-sect-hd" style={{ marginBottom: '16px' }}>
                    <span className="lp-sect-hd-title">Lokasi Kami</span>
                    {lokasiGmaps && (
                      <a
                        href={lokasiGmaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lp-sect-more"
                      >
                        Buka Maps →
                      </a>
                    )}
                  </div>
                  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', background: 'var(--primary-lt)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>{lokasiNama}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Petunjuk arah & lokasi sekretariat</div>
                      </div>
                    </div>
                    <div style={{ height: '320px', position: 'relative' }}>
                      {getEmbedUrl(lokasiGmaps, lokasiNama) ? (
                        <iframe
                          src={getEmbedUrl(lokasiGmaps, lokasiNama)}
                          width="100%"
                          height="100%"
                          style={{ border: 0, display: 'block' }}
                          allowFullScreen={true}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)', fontSize: '14px' }}>
                          Peta tidak dapat ditampilkan.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT COLUMN (SIDEBAR) ─── */}
        <div className="lp-sidebar">

          {/* Visitor Stats */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Statistik Pengunjung</span>
            </div>
            <div className="lp-visitor-stats">
              <div className="lp-stats-total">
                <div className="lp-stats-num" suppressHydrationWarning>{formattedTotal}</div>
                <div className="lp-stats-label">Total Kunjungan</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '11px', color: 'var(--gray)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Data kunjungan real-time
              </div>
            </div>
          </div>

          {/* Agenda Kegiatan */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Agenda Kegiatan</span>
            </div>
            <div className="lp-widget-body">
              {recentKegiatan.length > 0 ? (
                <>
                  <div className="lp-keg-list">
                    {recentKegiatan.map((k) => {
                      const d = k.tanggal ? new Date(k.tanggal) : null;
                      const day = d ? d.getDate().toString().padStart(2, '0') : '—';
                      const mon = d ? d.toLocaleDateString('id-ID', { month: 'short' }) : '';
                      return (
                        <div key={k.id} className="lp-keg-item">
                          <div className="lp-keg-date-block">
                            <span className="lp-keg-date-day">{day}</span>
                            <span className="lp-keg-date-mon">{mon}</span>
                          </div>
                          <div className="lp-keg-body">
                            <div className="lp-keg-title">{k.judul}</div>
                            <div className="lp-keg-meta">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {k.lokasi || 'Lokasi TBD'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                    <Link href="/agenda" style={{ display: 'block', textAlign: 'center', padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, transition: 'all 0.2s' }}>
                      Lihat Semua Kegiatan →
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-lt)', fontSize: '13px' }}>
                  Belum ada kegiatan.
                </div>
              )}
            </div>
          </div>

          {/* Visi & Misi */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Visi & Misi</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                "Menjadi Generasi Penerus yang Berakhlaqul Karimah, Alim dan Faqih.",
                "Menjadi Generasi Penerus Profesional yang Religius.",
                "Mewujudkan Tri Sukses."
              ].map((misi, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    color: 'white', width: '22px', height: '22px',
                    borderRadius: '7px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '11px', fontWeight: 900,
                    flexShrink: 0, boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--navy)', fontWeight: 500 }}>{misi}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Widget */}
          <div className="lp-widget" style={{ overflow: 'hidden' }}>
            <div className="lp-widget-cta">
              <div className="lp-cta-icon">✍️</div>
              <div className="lp-cta-title">Tulis Artikel & Berita</div>
              <p className="lp-cta-desc">Punya cerita inspiratif? Jadilah kontributor dan bagikan karya tulismu ke sesama generus!</p>
              <Link href="/register" className="lp-cta-btn">Mulai Menulis →</Link>
            </div>
          </div>

          {/* Jadwal Sholat */}
          <div className="lp-widget" style={{ overflow: 'hidden' }}>
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Jadwal Sholat</span>
            </div>
            <div style={{ padding: '16px' }}>
              <JadwalSholat />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ABOUT / VISI MISI STRIP ═══ */}
      <div className="lp-about">
        <div className="lp-wrap">
          <div className="lp-about-inner">
            <div>
              <span className="lp-about-tag">Tentang Kami</span>
              <h2 className="lp-about-title">
                Mewujudkan Generasi Penerus Profesional & Religius
              </h2>
              <p className="lp-about-desc">
                GENCAR adalah portal digital resmi bagi generasi muda Cengkareng yang berkomitmen
                menumbuhkan karakter islami, intelektualitas tinggi, dan profesionalisme dalam kehidupan bermasyarakat.
              </p>
              <div className="lp-about-actions">
                <Link href="/register" className="lp-about-btn-1">Bergabung Sekarang</Link>
                <Link href="/organisasi" className="lp-about-btn-2">Tentang Kami →</Link>
              </div>
            </div>
            <div className="lp-about-values">
              {[
                { icon: '🕌', title: 'Islami', desc: 'Berakhlaqul Karimah, Alim dan Faqih dalam kehidupan sehari-hari' },
                { icon: '🎓', title: 'Intelektual', desc: 'Generasi berpendidikan tinggi dan berpengetahuan luas' },
                { icon: '💼', title: 'Profesional', desc: 'Siap bersaing di era digital dengan kompetensi unggul' },
                { icon: '🤝', title: 'Sosial', desc: 'Berkontribusi aktif bagi masyarakat dan lingkungan sekitar' },
              ].map((v, i) => (
                <div key={i} className="lp-about-val">
                  <div className="lp-about-val-icon">{v.icon}</div>
                  <div className="lp-about-val-title">{v.title}</div>
                  <div className="lp-about-val-desc">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-main">
            <div>
              <div className="lp-footer-brand">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '10px' }} />
                ) : (
                  <div className="lp-footer-logo">G</div>
                )}
                <span className="lp-footer-logo-name">GENCAR</span>
              </div>
              <p className="lp-footer-desc">
                Portal berita dan sistem manajemen digital resmi GENCAR Indonesia.
                Mewujudkan Generasi Penerus Profesional Religius.
              </p>
            </div>
            <div>
              <div className="lp-footer-col-hd">Navigasi</div>
              <a href="#beranda" className="lp-footer-link">Beranda</a>
              <a href="/#artikel" className="lp-footer-link">Artikel</a>
              <a href="/#berita" className="lp-footer-link">Berita</a>
              <a href="/#kegiatan" className="lp-footer-link">Kegiatan</a>
            </div>
            <div>
              <div className="lp-footer-col-hd">Lokasi</div>
              <Link href="https://share.google/GsGIX55kXxJnpXWIu" className="lp-footer-link">Masjid Baitul Muttaqin</Link>
              <Link href="/organisasi" className="lp-footer-link">Tentang Kami</Link>
            </div>
            <div>
              <div className="lp-footer-col-hd">Organisasi</div>
              <Link href="/agenda" className="lp-footer-link">Kegiatan</Link>
              <Link href="/login" className="lp-footer-link">Masuk</Link>
              <Link href="/register" className="lp-footer-link">Daftar</Link>
            </div>
          </div>
          <hr className="lp-footer-sep" />
          <div className="lp-footer-bottom" suppressHydrationWarning>
            <span className="lp-footer-copy" suppressHydrationWarning>© {new Date().getFullYear()} GENCAR — Hak Cipta Dilindungi</span>
            <div className="lp-footer-links-right">
              <span className="lp-footer-bl">Kebijakan Privasi</span>
              <span className="lp-footer-bl">Syarat & Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
