export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { artikel, users, generus, kegiatan, visitorStats } from "@/lib/schema";
import { eq, desc, and, inArray, sql, like } from "drizzle-orm";

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

export default async function LandingPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q;
  const siteSettings = await getSiteSettings();
  const siteLogo = siteSettings.site_logo;

  const session = await getSession();

  // Mode Maintenance Check
  if (await checkMaintenance()) {
    return <MaintenanceView />;
  }

  // Catat Kunjungan
  await recordVisit();

  const articles = await getPublishedArticles(20, "artikel", query);
  const news = await getPublishedArticles(10, "berita", query);

  // Kombinasikan Artikel dan Berita untuk Slider Hero, urutkan berdasarkan tanggal terbaru
  const combinedForHero = [...articles, ...news]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, 8);

  const heroSliderArticles = combinedForHero;
  const gridArticles = articles.slice(0, 15); // Gunakan pool artikel untuk grid di bawahnya

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
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #f9f9f9;
          line-height: 1.6;
        }
        a { text-decoration: none; color: inherit; }
        img { display: block; max-width: 100%; }

        /* ─── VARIABLES (Synced with globals.css) ─── */
        :root {
          --primary:  #2563eb;
          --primary-dk: #1d4ed8;
          --primary-lt: #eff6ff;
          --secondary: #64748b;
          --success:  #16a34a;
          --success-dk: #15803d;
          --success-lt: #dcfce7;
          --danger:   #dc2626;
          --navy:     #1e293b;
          --slate:    #334155;
          --gray:     #64748b;
          --gray-lt:  #94a3b8;
          --border:   #e2e8f0;
          --bg:       #f8fafc;
          --white:    #ffffff;
          --serif:    'Merriweather', Georgia, serif;
          --sans:     'Inter', sans-serif;
          --rk: 10px;
        }

        /* Aliases for landing page components to minimize refactoring */
        :root {
          --green:    var(--primary);
          --green-dk: var(--primary-dk);
          --green-lt: var(--primary-lt);
          --red:      var(--danger);
        }

        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        /* ─────────────────────────────────
           TOPBAR
        ───────────────────────────────── */
        .topbar {
          background: var(--navy);
          border-bottom: 2px solid var(--green);
        }
        .topbar-inner {
          display: flex; justify-content: space-between; align-items: center;
          height: 36px;
        }
        .topbar-date {
          font-size: 11.5px; color: rgba(255,255,255,0.45); font-weight: 400;
          display: flex; align-items: center; gap: 5px;
        }
        .topbar-auth { display: flex; gap: 6px; align-items: center; }
        .tb-btn {
          font-size: 11px; font-weight: 600; padding: 3px 12px;
          border-radius: 3px; letter-spacing: 0.3px; transition: all 0.18s;
        }
        .tb-btn-ghost { color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.15); }
        .tb-btn-ghost:hover { color: white; border-color: rgba(255,255,255,0.4); }
        .tb-btn-fill { background: var(--green); color: white; }
        .tb-btn-fill:hover { background: var(--green-dk); }
        .tb-btn-dashboard { background: #2563eb; color: white; }
        .tb-btn-dashboard:hover { background: #1d4ed8; }

        /* ─────────────────────────────────
           MASTHEAD / HEADER
        ───────────────────────────────── */
        .masthead {
          background: var(--white);
          border-bottom: 1px solid var(--border);
          padding: 18px 0 14px;
        }
        .masthead-inner {
          display: flex; align-items: center; justify-content: space-between;
        }
        .masthead-brand { display: flex; align-items: center; gap: 14px; }
        .masthead-logo {
          width: 52px; height: 52px; border-radius: 10px;
          background: linear-gradient(135deg, var(--success-dk), var(--success));
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(22,163,74,0.18);
        }
        .masthead-title {
          font-family: var(--serif);
          font-size: 30px; font-weight: 900; color: var(--navy); letter-spacing: -1px; line-height: 1;
        }
        .masthead-sub {
          font-size: 10px; color: var(--gray-lt); text-transform: uppercase;
          letter-spacing: 1.5px; margin-top: 3px; font-weight: 600;
        }
        .masthead-right { text-align: right; }
        .masthead-edition {
          font-size: 10.5px; color: var(--gray-lt); font-weight: 400;
        }
        .masthead-cta { display: flex; gap: 8px; margin-top: 6px; justify-content: flex-end; }
        .ms-btn {
          font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 4px;
          transition: all 0.18s;
        }
        .ms-btn-border { border: 1.5px solid var(--border); color: var(--slate); }
        .ms-btn-border:hover { border-color: var(--green); color: var(--green); }
        .ms-btn-fill { background: var(--green); color: white; }
        .ms-btn-fill:hover { background: var(--green-dk); }
        .ms-btn-dash { background: var(--navy); color: white; }
        .ms-btn-dash:hover { background: var(--slate); }

        /* ─────────────────────────────────
           NAVBAR (Categories)
        ───────────────────────────────── */
        .navbar {
          background: var(--green-dk);
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .navbar-inner {
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-links { display: flex; }
        .nav-link {
          display: block; padding: 12px 15px;
          font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.75);
          letter-spacing: 0.2px; transition: all 0.18s;
          border-bottom: 2px solid transparent;
        }
        .nav-link:hover { color: white; border-bottom-color: rgba(255,255,255,0.5); }
        .nav-link-active { color: white; border-bottom-color: white; }

        /* Dropdown Styles */
        .nav-item { position: relative; }
        .nav-dropdown {
          position: absolute; top: 100%; left: 0; min-width: 190px;
          background: white; border-radius: 0 0 8px 8px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
          opacity: 0; visibility: hidden; transform: translateY(10px);
          transition: all 0.2s ease-out;
          z-index: 200; border-top: 3px solid var(--primary);
          overflow: hidden; padding: 4px 0;
        }
        .nav-item:hover .nav-dropdown {
          opacity: 1; visibility: visible; transform: translateY(0);
        }
        .nav-dropdown-link {
          display: block; padding: 11px 20px;
          font-size: 13px; font-weight: 600; color: var(--navy);
          transition: all 0.15s; border-bottom: 1px solid #f8fafc;
        }
        .nav-dropdown-link:last-child { border-bottom: none; }
        .nav-dropdown-link:hover {
          background: var(--primary-lt); color: var(--primary);
          padding-left: 24px;
        }
        .nav-link svg { margin-left: 4px; opacity: 0.6; }
        .nav-search {
          display: flex; align-items: center; gap: 8px;
          background: white;
          border: 1px solid var(--border);
          padding: 6px 14px;
          border-radius: 100px;
          width: 320px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--navy);
        }
        .nav-search svg { color: var(--gray-lt); }
        .nav-search:focus-within {
          width: 380px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border-color: var(--primary);
        }
        .nav-search input {
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font-size: 13px;
          width: 100%;
          font-weight: 500;
        }
        .nav-search input::placeholder {
          color: var(--gray-lt);
        }
        .nav-search:focus-within svg {
          color: var(--primary);
        }

        /* ─────────────────────────────────
           BREAKING NEWS TICKER
        ───────────────────────────────── */
        .breaking {
          background: #fff;
          border-bottom: 1px solid var(--border);
          overflow: hidden;
        }
        .breaking-inner {
          display: flex; align-items: center;
        }
        .breaking-label {
          background: var(--red); color: white;
          padding: 8px 16px; font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1px;
          white-space: nowrap; z-index: 10;
          box-shadow: 10px 0 20px rgba(0,0,0,0.1);
          position: relative;
        }
        .breaking-track {
          flex: 1; overflow: hidden;
          background: #fff;
          position: relative;
          height: 36px;
          display: flex; align-items: center;
        }
        .breaking-scroll {
          display: flex;
          gap: 50px;
          white-space: nowrap;
          animation: ticker-move 40s linear infinite;
          padding-left: 20px;
        }
        .breaking-item {
          font-size: 12.5px; font-weight: 600; color: var(--navy);
          display: flex; align-items: center; gap: 8px;
        }
        .breaking-item::after {
          content: '•';
          margin-left: 50px;
          color: var(--border);
        }
        @keyframes ticker-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .breaking:hover .breaking-scroll {
          animation-play-state: paused;
        }

        /* ─────────────────────────────────
           MAIN LAYOUT
        ───────────────────────────────── */
        .main-layout {
          max-width: 1200px; margin: 24px auto 0; padding: 0 20px;
          display: grid; grid-template-columns: 1fr 308px; gap: 28px;
        }

        /* ─────────────────────────────────
           SECTION HEADER
        ───────────────────────────────── */
        .sect-hd {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 2px solid var(--navy); padding-bottom: 8px; margin-bottom: 18px;
        }
        .sect-hd-title {
          font-family: var(--serif); font-size: 17px; font-weight: 900;
          color: var(--navy); letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 8px;
        }
        .sect-hd-title::before {
          content: '';
          display: block; width: 3px; height: 18px;
          background: var(--red); border-radius: 2px;
        }
        .sect-hd-more {
          font-size: 11.5px; font-weight: 600; color: var(--green);
          padding: 4px 10px; border: 1px solid var(--green-lt);
          border-radius: 3px; transition: all 0.18s; background: var(--green-lt);
        }
        .sect-hd-more:hover { background: var(--green); color: white; border-color: var(--green); }

        /* ─────────────────────────────────
           HERO SLIDER IKLAN DINAMIS
        ───────────────────────────────── */
        .hero-grid {
          width: 100%;
          border: none;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          background: #000;
        }
        .hero-meta-dot { display: inline-block; width: 3px; height: 3px; border-radius: 50%; background: #ccc; margin: 0 4px; vertical-align: middle; }

        /* ─────────────────────────────────
           ARTICLE CARDS (horizontal list)
        ───────────────────────────────── */
        .art-list { display: flex; flex-direction: column; gap: 0; }
        .art-row {
          display: flex; gap: 14px; padding: 14px 0;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s; border-radius: 4px;
        }
        .art-row:first-child { padding-top: 0; }
        .art-row:last-child { border-bottom: none; }
        .art-row:hover { background: #fafafa; }
        .art-row-img {
          width: 120px; flex-shrink: 0; border-radius: var(--r4);
          background: var(--bg); overflow: hidden; position: relative;
          min-height: 82px;
        }
        .art-row-img img {
          width: 100%; height: 100%; object-fit: cover;
          position: absolute; inset: 0;
        }
        .art-row-img-placeholder {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, var(--green-lt), #f0fdf4);
          display: flex; align-items: center; justify-content: center; font-size: 26px;
        }
        .art-row-body { flex: 1; }
        .art-row-cat {
          font-size: 10px; font-weight: 800; color: var(--green);
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;
        }
        .art-row-title {
          font-family: var(--serif); font-size: 14px; font-weight: 700; color: var(--navy);
          line-height: 1.45;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 7px; transition: color 0.15s;
        }
        .art-row:hover .art-row-title { color: var(--green); }
        .art-row-meta { font-size: 11px; color: var(--gray-lt); display: flex; gap: 10px; align-items: center; }

        /* ─────────────────────────────────
           ARTICLE GRID (3-col)
        ───────────────────────────────── */
        .art-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .art-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--r8); overflow: hidden;
          display: flex; flex-direction: column;
          transition: all 0.2s; cursor: pointer;
        }
        .art-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); border-color: #d1d5db; }
        .art-card-img {
          height: 168px; background: var(--bg); position: relative; overflow: hidden;
        }
        .art-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s; }
        .art-card:hover .art-card-img img { transform: scale(1.05); }
        .art-card-img-placeholder {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #dcfce7, #f0fdf4);
          display: flex; align-items: center; justify-content: center; font-size: 36px;
        }
        .art-card-body { padding: 14px; flex: 1; display: flex; flex-direction: column; }
        .art-card-cat {
          font-size: 10px; font-weight: 800; color: var(--red);
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 7px;
        }
        .art-card-title {
          font-family: var(--serif); font-size: 14px; font-weight: 700; color: var(--navy);
          line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 7px; flex: 1; transition: color 0.15s;
        }
        .art-card:hover .art-card-title { color: var(--green); }
        .art-card-excerpt {
          font-size: 12px; color: var(--gray); line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 10px;
        }
        .art-card-foot {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 10px; border-top: 1px solid var(--border);
        }
        .art-card-date { font-size: 10.5px; color: var(--gray-lt); display: flex; align-items: center; gap: 4px; }
        .art-card-read { font-size: 11.5px; font-weight: 700; color: var(--primary); }
        .art-card-badge {
          position: absolute; top: 12px; left: 12px;
          background: rgba(0,0,0,0.6); color: white;
          padding: 3px 10px; border-radius: 4px; font-size: 10px;
          font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
          backdrop-filter: blur(4px); z-index: 10;
        }

        /* ─── IMPROVED GRID FOR ARTIKEL TERBARU ─── */
        .latest-articles-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        .latest-art-card {
          display: flex;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          height: 160px;
        }
        .latest-art-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: var(--primary);
        }
        .latest-art-img {
          width: 180px;
          flex-shrink: 0;
          position: relative;
          background: #f1f5f9;
        }
        .latest-art-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .latest-art-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }
        .latest-art-title {
          font-family: var(--serif);
          font-size: 15px;
          font-weight: 700;
          color: var(--navy);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .latest-art-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: var(--gray-lt);
          margin-top: auto;
        }
        .latest-art-author {
          font-weight: 600;
          color: var(--slate);
        }

        /* ─── ARTIKEL UTAMA (FEATURED) ─── */
        .featured-art {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 40px;
          border: 1px solid var(--border);
          transition: all 0.3s;
        }
        .featured-art:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: var(--primary);
        }
        .featured-art-img {
          height: 380px;
          position: relative;
          background: #f1f5f9;
        }
        .featured-art-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .featured-art-content {
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .featured-art-badge {
          display: inline-block;
          background: var(--primary-lt);
          color: var(--primary);
          font-size: 11px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          width: fit-content;
        }
        .featured-art-title {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 900;
          color: var(--navy);
          line-height: 1.25;
          margin-bottom: 16px;
        }
        .featured-art-desc {
          font-size: 15px;
          color: var(--gray);
          line-height: 1.7;
          margin-bottom: 24px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 1024px) {
          .featured-art { grid-template-columns: 1fr; gap: 0; }
          .featured-art-img { height: 300px; }
          .featured-art-content { padding: 30px; }
          .featured-art-title { font-size: 24px; }
        }

        @media (max-width: 768px) {
          .latest-articles-grid { grid-template-columns: 1fr; }
          .latest-art-card { height: auto; flex-direction: column; }
          .latest-art-img { width: 100%; height: 180px; }
        }

        /* ─────────────────────────────────
           SIDEBAR
        ───────────────────────────────── */
        .sidebar { display: flex; flex-direction: column; gap: 24px; }
        .sidebar-widget {
          background: var(--white); border: 1px solid var(--border); border-radius: var(--r8);
          overflow: hidden;
        }
        .sw-head {
          background: var(--navy); padding: 10px 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .sw-head-title {
          font-size: 12px; font-weight: 800; color: white;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .sw-head-bar { width: 3px; height: 13px; background: var(--red); border-radius: 2px; flex-shrink: 0; }
        .sw-body { padding: 0; }
        .sw-item {
          display: flex; gap: 12px; padding: 12px 16px;
          border-bottom: 1px solid var(--border); transition: background 0.15s;
          align-items: flex-start;
        }
        .sw-item:last-child { border-bottom: none; }
        .sw-item:hover { background: var(--bg); }
        .sw-num {
          font-size: 22px; font-weight: 900; color: var(--border);
          line-height: 1; flex-shrink: 0; width: 28px;
          font-family: var(--serif);
        }
        .sw-item-body {}
        .sw-item-title {
          font-family: var(--serif); font-size: 12.5px; font-weight: 700; color: var(--navy);
          line-height: 1.4; margin-bottom: 4px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.15s;
        }
        .sw-item:hover .sw-item-title { color: var(--green); }
        .sw-item-date { font-size: 10.5px; color: var(--gray-lt); }
        
        /* Sidebar with thumbnail */
        .sw-item-thumb {
          display: flex; gap: 10px; padding: 12px 16px;
          border-bottom: 1px solid var(--border); transition: background 0.15s;
          align-items: center;
        }
        .sw-item-thumb:last-child { border-bottom: none; }
        .sw-item-thumb:hover { background: var(--bg); }
        .sw-thumb {
          width: 64px; height: 48px; border-radius: 4px;
          background: var(--bg); flex-shrink: 0; overflow: hidden; position: relative;
        }
        .sw-thumb img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
        .sw-thumb-placeholder {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #dcfce7, #f0fdf4);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .sw-thumb-body { flex: 1; }
        .sw-thumb-title {
          font-size: 12px; font-weight: 700; color: var(--navy); line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          margin-bottom: 3px; transition: color 0.15s;
        }
        .sw-item-thumb:hover .sw-thumb-title { color: var(--green); }
        .sw-thumb-date { font-size: 10px; color: var(--gray-lt); }

        /* CTA Widget */
        .sw-cta {
          background: linear-gradient(135deg, var(--green-dk), var(--green));
          padding: 20px 16px; text-align: center;
        }
        .sw-cta-icon { font-size: 32px; margin-bottom: 10px; }
        .sw-cta-title { font-size: 15px; font-weight: 800; color: white; margin-bottom: 8px; font-family: var(--serif); }
        .sw-cta-desc { font-size: 12px; color: rgba(255,255,255,0.72); line-height: 1.6; margin-bottom: 14px; }
        .sw-cta-btn {
          display: inline-block; background: white; color: var(--green-dk);
          font-size: 12.5px; font-weight: 700; padding: 9px 20px;
          border-radius: 4px; transition: all 0.18s;
        }
        .sw-cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

        /* Platform Info Widget */
        .sw-info-list { padding: 16px; }
        .sw-info-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid var(--border);
        }
        .sw-info-item:last-child { border-bottom: none; }
        .sw-info-icon {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .sw-info-text {}
        .sw-info-label { font-size: 10px; color: var(--gray-lt); font-weight: 500; }
        .sw-info-val { font-size: 13px; font-weight: 700; color: var(--navy); }

        /* ─────────────────────────────────
           EMPTY STATE
        ───────────────────────────────── */
        .empty {
          text-align: center; padding: 48px 24px; color: var(--gray-lt);
          background: var(--white); border-radius: var(--r8); border: 1px solid var(--border);
        }
        .empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.4; }
        .empty-text { font-size: 13.5px; }

        /* ─────────────────────────────────
           TENTANG STRIP
        ───────────────────────────────── */
        .about-strip {
          background: var(--navy); margin-top: 40px; padding: 44px 0;
        }
        .about-inner {
          display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
        }
        .about-text {}
        .about-tag {
          display: inline-block; background: var(--red); color: white;
          font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 2px;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;
        }
        .about-title {
          font-family: var(--serif); font-size: 28px; font-weight: 900;
          color: white; line-height: 1.35; margin-bottom: 14px;
        }
        .about-desc { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 24px; }
        .about-actions { display: flex; gap: 10px; }
        .about-btn-1 {
          padding: 11px 24px; background: var(--green); color: white;
          border-radius: 4px; font-size: 13px; font-weight: 700; transition: all 0.18s;
        }
        .about-btn-1:hover { background: var(--green-dk); }
        .about-btn-2 {
          padding: 11px 20px; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7);
          border-radius: 4px; font-size: 13px; font-weight: 500; transition: all 0.18s;
        }
        .about-btn-2:hover { background: rgba(255,255,255,0.07); color: white; }
        .about-values { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .about-val {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--r8); padding: 16px;
        }
        .about-val-icon { font-size: 22px; margin-bottom: 8px; }
        .about-val-title { font-size: 13px; font-weight: 700; color: white; margin-bottom: 3px; }
        .about-val-desc { font-size: 11.5px; color: rgba(255,255,255,0.45); }

        /* ─────────────────────────────────
           FOOTER
        ───────────────────────────────── */
        .footer { background: #070e1a; border-top: 3px solid var(--green); }
        .footer-main {
          display: grid; grid-template-columns: 2.2fr 1fr 1fr 1fr; gap: 40px;
          padding: 44px 0 36px;
        }
        .footer-brand-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .footer-logo-icon {
          width: 40px; height: 40px; border-radius: 8px;
          background: linear-gradient(135deg, var(--success-dk), var(--success));
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .footer-logo-name { font-family: var(--serif); font-size: 20px; font-weight: 900; color: white; }
        .footer-desc { font-size: 12.5px; color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 16px; }
        .footer-col-hd {
          font-size: 11px; font-weight: 800; color: white;
          text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px;
          padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .footer-link {
          display: block; font-size: 12.5px; color: rgba(255,255,255,0.65); padding: 3.5px 0; transition: color 0.15s;
        }
        .footer-link:hover { color: white; }
        .footer-sep { border: none; border-top: 1px solid rgba(255,255,255,0.06); }
        .footer-bottom {
          padding: 14px 0; display: flex; justify-content: space-between; align-items: center;
        }
        .footer-copy { font-size: 11.5px; color: rgba(255,255,255,0.4); }
        .footer-bottom-right { display: flex; gap: 18px; }
        .footer-bottom-link { font-size: 11.5px; color: rgba(255,255,255,0.4); transition: color 0.15s; }
        .footer-bottom-link:hover { color: white; }

        /* ─── KEGIATAN & PROFILE ─── */
        .sect-wrap { margin-bottom: 48px; }
        .keg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .keg-card {
          background: white; border: 1px solid var(--border); border-radius: 12px;
          padding: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%; display: flex; flex-direction: column;
        }
        .keg-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: var(--primary); }
        .keg-date-badge {
          display: inline-block; padding: 4px 10px; background: var(--primary-lt);
          color: var(--primary); font-size: 10px; font-weight: 800; border-radius: 6px;
          margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .keg-title { font-family: var(--serif); font-size: 18px; font-weight: 800; color: var(--navy); margin-bottom: 8px; line-height: 1.3; }
        .keg-desc { font-size: 13px; color: var(--gray); margin-bottom: 14px; line-height: 1.5; flex: 1; }
        .keg-meta { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--gray-lt); font-weight: 500; }
        

        /* ─── VISITOR STATS ─── */
        .stats-section { padding: 80px 0; background: #fff; border-top: 1px solid var(--border); }
        .stats-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .stats-info-hd { font-size: 34px; font-weight: 900; color: var(--navy); margin-bottom: 20px; line-height: 1.2; }
        .stats-info-desc { font-size: 16px; color: var(--gray); margin-bottom: 30px; line-height: 1.6; }
        .stats-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .stats-card { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid var(--border); }
        .stats-val { font-size: 28px; font-weight: 900; color: var(--primary); margin-bottom: 5px; }
        .stats-lbl { font-size: 13px; font-weight: 700; color: var(--gray-lt); text-transform: uppercase; letter-spacing: 0.5px; }
        
        .stats-table-wrap { background: #f1f5f9; border-radius: 20px; padding: 30px; }
        .stats-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .stats-row:last-child { border: none; }
        .stats-country { display: flex; align-items: center; gap: 12px; font-weight: 700; color: var(--navy); }
        .stats-flag { width: 24px; height: 16px; border-radius: 2px; }
        .stats-count { font-weight: 800; color: var(--primary); }

        @media (max-width: 900px) {
          .stats-inner { grid-template-columns: 1fr; gap: 40px; }
          .stats-cards { grid-template-columns: 1fr; }
        }

        /* ─────────────────────────────────
           RESPONSIVE
        ───────────────────────────────── */
        @media (max-width: 1024px) {
          .main-layout { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .art-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-main { grid-template-columns: 1fr 1fr; gap: 28px; }
          .nav-search { width: 280px; }
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr; }
          .hero-side { display: none; }
          .art-grid { grid-template-columns: 1fr; }
          .about-inner { grid-template-columns: 1fr; gap: 36px; }
          .masthead-right { display: none; }
          .footer-main { grid-template-columns: 1fr; }
          .navbar-inner { flex-direction: column; padding: 8px 0 12px; gap: 10px; }
          .nav-search { width: 100%; }
        }
        @media (max-width: 600px) {
          .nav-links .nav-link:nth-child(n+5) { display: none; }
          .masthead-cta { display: none; }
          .art-list .art-row-img { width: 90px; }
          .masthead-title { font-size: 22px; }
          .masthead-logo { width: 44px; height: 44px; font-size: 20px; }
          .main-layout { margin-top: 16px; gap: 20px; }
        }
        @media (max-width: 480px) {
          .sect-hd-title { font-size: 15px; }
          .masthead-title { font-size: 18px; }
          .footer-logo-name { font-size: 18px; }
        }
      `}</style>

      <HomeHeader session={session} />
      <HomeNavbar query={query} />

      {/* Animasi Teks Bergerak di Bawah Navigasi */}
      <NewsTicker customText="Pusat informasi dan berita kegiatan Generasi Penerus Jakarta Barat 2. Punya karya tulis atau berita kegiatan terbaru? Yuk, kontribusi! Hubungi Admin untuk memuat artikel atau berita Kamu di sini." />



      {/* ═══ MAIN LAYOUT ═══ */}
      <div id="beranda" className="main-layout" suppressHydrationWarning>

        {/* ─── LEFT COLUMN ─── */}
        <div>

          {query ? (
            <div className="search-results-section">
              <div className="sect-hd">
                <span className="sect-hd-title">Hasil Pencarian: "{query}"</span>
                <Link href="/" className="sect-hd-more">Hapus Pencarian ×</Link>
              </div>

              {articles.length === 0 && news.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <p className="empty-text">Tidak ditemukan artikel atau berita dengan kata kunci "{query}".</p>
                  <Link href="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Lihat Semua Artikel</Link>
                </div>
              ) : (
                <div className="art-grid">
                  {[...articles, ...news].map((item) => (
                    <Link href={`/artikel/${item.id}`} key={item.id} className="art-card">
                      <div className="art-card-img">
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.judul} />
                        ) : (
                          <div className="art-card-img-placeholder">📄</div>
                        )}
                        <span className="art-card-badge">{item.tipe}</span>
                      </div>
                      <div className="art-card-body">
                        <h3 className="art-card-title">{item.judul}</h3>
                        <p className="art-card-excerpt">{item.ringkasan}</p>
                        <div className="art-card-foot">
                          <span className="art-card-date">{formatDateShort(item.publishedAt)}</span>
                          <span className="art-card-read">Baca Selengkapnya →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 40 }} />
            </div>
          ) : (
            <>
              {/* HERO Video Utama */}
              <div className="hero-grid" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                <iframe
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  src="https://www.youtube.com/embed/kkDN69-4zco?autoplay=1&mute=1&loop=1&playlist=kkDN69-4zco&controls=0&modestbranding=1&rel=0&vq=hd720"
                  title="JB2.ID Hero Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Section: Artikel Utama & Terbaru */}
              <div className="sect-hd" style={{ marginTop: 24 }}>
                <span className="sect-hd-title">Artikel Utama dan Terbaru</span>
                <Link href="/#artikel" className="sect-hd-more">Lihat Semua →</Link>
              </div>

              <div style={{ marginBottom: 40 }}>
                <FeaturedArticleSlider articles={articles.slice(0, 5)} />
              </div>
            </>
          )}


          {/* AREA LAINNYA */}

        </div>
        <div> {/* Wrapper untuk Sidebar agar semua item berada di kolom kanan yang sama */}
          {/* Widget: Statistik Pengunjung */}
          <div className="sidebar-widget" style={{ marginBottom: 28 }}>
            <div className="sw-head">
              <span className="sw-head-bar" style={{ background: 'var(--success)' }}></span>
              <span className="sw-head-title">Statistik Pengunjung</span>
            </div>
            <div className="sw-body" style={{ padding: '16px' }}>
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }} suppressHydrationWarning>{formattedTotal}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray-lt)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Kunjungan</div>
              </div>
            </div>
          </div>

          {/* ═══ BERITA SECTION ═══ */}
          <section id="berita" className="sect-wrap" style={{
            marginTop: 0,
            background: '#fff',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: '30px 16px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            marginBottom: 28
          }}>
            <div className="sect-hd">
              <span className="sect-hd-title">Berita Utama</span>
            </div>
            {news.length > 0 ? (
              <div className="sidebar-list">
                {news.map((item) => (
                  <Link href={`/artikel/${item.id}`} key={item.id} className="sw-item-thumb" style={{ padding: '12px 0' }}>
                    <div className="sw-thumb">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.judul} />
                      ) : (
                        <div className="sw-thumb-placeholder">📰</div>
                      )}
                    </div>
                    <div className="sw-thumb-body">
                      <h4 className="sw-thumb-title">{item.judul}</h4>
                      <div className="sw-thumb-date" suppressHydrationWarning>{timeAgo(item.publishedAt)}</div>

                    </div>
                  </Link>
                ))}
                <Link href="/berita" className="sect-hd-more" style={{ textAlign: 'center', width: '100%', display: 'block', marginTop: 10 }}>Lihat Semua Berita →</Link>
              </div>
            ) : (
              <div className="empty" style={{ border: 'none', padding: 20 }}>
                <p className="empty-text" style={{ fontSize: '11px' }}>Belum ada berita terbaru.</p>
              </div>
            )}
          </section>

          {/* ═══ KEGIATAN SECTION ═══ */}
          <section id="kegiatan" className="sect-wrap" style={{
            marginTop: 0,
            background: '#fff',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: '30px 16px',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}>
            <div className="sect-hd">
              <span className="sect-hd-title">Kegiatan</span>
            </div>
            {recentKegiatan.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {recentKegiatan.map((k) => (
                  <div key={k.id} className="keg-card" style={{ padding: '16px', height: 'auto' }}>
                    <span className="keg-date-badge" style={{ marginBottom: 8, fontSize: '9px' }} suppressHydrationWarning>{formatDateShort(k.tanggal)}</span>

                    <h3 className="keg-title" style={{ fontSize: '15px', marginBottom: 6 }}>{k.judul}</h3>
                    <div className="keg-meta" style={{ fontSize: '10px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {k.lokasi || "Lokasi TBD"}
                    </div>
                  </div>
                ))}
                <Link href="/agenda" className="sect-hd-more" style={{ textAlign: 'center', width: '100%', display: 'block' }}>Lihat Kalender →</Link>
              </div>
            ) : (
              <div className="empty" style={{ border: 'none', padding: 20 }}>
                <p className="empty-text" style={{ fontSize: '11px' }}>Belum ada kegiatan.</p>
              </div>
            )}
          </section>

          {/* ═══ VISI & MISI SECTION ═══ */}
          <section id="visi-misi" className="sect-wrap" style={{
            marginTop: 28,
            background: '#fff',
            padding: '30px 16px',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}>
            <div className="sect-hd" style={{ marginBottom: 20 }}>
              <span className="sect-hd-title">Visi & Misi</span>
            </div>

            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  "Menjadi Generasi Penerus yang Berakhlaqul Karimah, Alim dan Faqih.",
                  "Menjadi Generasi Penerus Profesional yg Religius.",
                  "Mewujudkan Tri Sukses."
                ].map((misi, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text)', fontWeight: 500 }}>{misi}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

      </div>




      {/* ═══ FOOTER ═══ */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-main">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {siteLogo && (
                  <img src={siteLogo} alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                )}
                <span className="footer-logo-name">JB2.ID</span>
              </div>
              <p className="footer-desc">
                Portal berita dan sistem manajemen digital resmi Generasi Penerus PC LDII Jakarta Barat 2.
                Mewujudkan Generasi Penerus Profesional Religius.
              </p>
            </div>
            <div>
              <div className="footer-col-hd">Navigasi</div>
              <a href="#beranda" className="footer-link">Beranda</a>
              <a href="/#artikel" className="footer-link">Artikel</a>
              <a href="/#berita" className="footer-link">Berita</a>

            </div>
            <div>
              <div className="footer-col-hd">Lokasi</div>
              <Link href="https://share.google/GsGIX55kXxJnpXWIu" className="footer-link">Masjid Baitul Muttaqin</Link>
            </div>
            <div>
              <div className="footer-col-hd">Organisasi</div>
              <Link href="/agenda" className="footer-link">Kegiatan</Link>
            </div>
          </div>
          <hr className="footer-sep" />
          <div className="footer-bottom" suppressHydrationWarning>
            <span className="footer-copy" suppressHydrationWarning>© 2026 JB2.ID — Hak Cipta Dilindungi</span>
            <div className="footer-bottom-right">
              <span className="footer-bottom-link">Kebijakan Privasi</span>
              <span className="footer-bottom-link">Syarat & Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
