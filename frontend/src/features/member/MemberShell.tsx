import { useState } from "react";
import { Users, User, BarChart3, LogOut, Home } from "lucide-react";
import type { MemberIdentity } from "./types";

export type MemberPageKey = "beranda" | "profil" | "statistik";

const NAV: { key: MemberPageKey; label: string; icon: typeof Home }[] = [
  { key: "beranda", label: "Beranda", icon: Home },
  { key: "profil", label: "Profil", icon: User },
  { key: "statistik", label: "Statistik", icon: BarChart3 },
];

export default function MemberShell({
  page,
  setPage,
  me,
  onExit,
  children,
}: {
  page: MemberPageKey;
  setPage: (k: MemberPageKey) => void;
  me: MemberIdentity;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="member-shell">
      <header className="member-topbar">
        <div className="member-topbar-left">
          <img className="member-topbar-logo" src="/logos/gencar.png" alt="GENCAR" width={36} height={36} decoding="async" />
          <div style={{ minWidth: 0 }}>
            <div className="member-topbar-title">GENCAR</div>
            <div className="member-topbar-sub">Cengkareng</div>
          </div>
        </div>
        <div className="member-topbar-right">
          <span className="pill" style={{ fontSize: 11 }}>
            <Users size={12} /> {me.nama.split(" ")[0]}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onExit} title="Kembali ke admin/demo">
            <LogOut size={14} /> Keluar
          </button>
          <button className="member-burger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
        </div>
      </header>

      {open && <div className="member-overlay" onClick={() => setOpen(false)} />}

      <nav className={`member-nav ${open ? "open" : ""}`} aria-label="Member navigation">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = page === n.key;
          return (
            <button
              key={n.key}
              type="button"
              className={`member-nav-item ${active ? "active" : ""}`}
              onClick={() => {
                setPage(n.key);
                setOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Icon size={18} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="member-main">{children}</main>

      <nav className="member-bottom" aria-label="Member bottom navigation">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.key}
              type="button"
              className={page === n.key ? "active" : ""}
              onClick={() => {
                setPage(n.key);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Icon size={18} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
