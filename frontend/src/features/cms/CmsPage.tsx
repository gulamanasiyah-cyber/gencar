import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import PengurusTab from "./PengurusTab";
import KegiatanPublikTab from "./KegiatanPublikTab";
import ArtikelTab from "./ArtikelTab";
import GaleriTab from "./GaleriTab";
import TentangTab from "./TentangTab";
import "./cms.css";

const ALL_TABS = [
  { key: "kegiatan", label: "Kegiatan Publik" },
  { key: "artikel", label: "Artikel" },
  { key: "galeri", label: "Galeri" },
  { key: "pengurus", label: "Pengurus" },
  { key: "tentang", label: "Tentang" },
] as const;

const RESTRICTED_TABS = new Set(["kegiatan", "artikel", "galeri"]);

type TabKey = typeof ALL_TABS[number]["key"];
type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";

export default function CmsPage({ role }: { role: AdminRole }) {
  const { user } = useAuth();
  const userId = user?.id ?? user?.userId;
  const tabs = useMemo(
    () => role === "admin_daerah" ? ALL_TABS : ALL_TABS.filter((t) => RESTRICTED_TABS.has(t.key)),
    [role],
  );
  const [tab, setTab] = useState<TabKey>(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const t = qs.get("tab") as TabKey | null;
    if (t && tabs.some((x) => x.key === t)) return t;
    return tabs[0]?.key ?? "kegiatan";
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
        {tabs.map((t) => (
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
      {tab === "kegiatan" && <KegiatanPublikTab role={role} userId={userId} />}
      {tab === "artikel" && <ArtikelTab tipe="artikel" role={role} userId={userId} />}
      {tab === "galeri" && <GaleriTab role={role} userId={userId} />}
      {tab === "pengurus" && <PengurusTab />}
      {tab === "tentang" && <TentangTab />}
    </div>
  );
}
