import { useState } from "react";
import PengurusTab from "./PengurusTab";
import KegiatanPublikTab from "./KegiatanPublikTab";
import ArtikelTab from "./ArtikelTab";
import GaleriTab from "./GaleriTab";
import TentangTab from "./TentangTab";
import "./cms.css";

const TABS = [
  { key: "kegiatan", label: "Kegiatan Publik" },
  { key: "artikel", label: "Artikel" },
  { key: "galeri", label: "Galeri" },
  { key: "pengurus", label: "Pengurus" },
  { key: "tentang", label: "Tentang" },
] as const;
type TabKey = typeof TABS[number]["key"];

export default function CmsPage() {
  const [tab, setTab] = useState<TabKey>(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const t = qs.get("tab") as TabKey | null;
    return (t && TABS.some((x) => x.key === t) ? t : "kegiatan") as TabKey;
  });

  const onTab = (k: TabKey) => {
    setTab(k);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", k);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>CMS</h1>
          <div className="page-header-sub">Kelola konten web publik — kegiatan, artikel, galeri, pengurus, tentang.</div>
        </div>
      </div>
      <div className="cms-tabs" role="tablist" aria-label="CMS tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`chip ${tab === t.key ? "active" : ""}`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "kegiatan" && <KegiatanPublikTab />}
      {tab === "artikel" && <ArtikelTab tipe="artikel" />}
      {tab === "galeri" && <GaleriTab />}
      {tab === "pengurus" && <PengurusTab />}
      {tab === "tentang" && <TentangTab />}
    </div>
  );
}
