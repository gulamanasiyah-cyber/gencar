import { useState } from "react";
import { Users, CalendarCheck, User, BarChart3, LogOut, Home } from "lucide-react";
import type { MemberIdentity } from "./types";

export type MemberPageKey = "beranda" | "absen" | "profil" | "statistik";

const NAV: { key: MemberPageKey; label: string; icon: typeof Home }[] = [
  { key: "beranda", label: "Beranda", icon: Home },
  { key: "absen", label: "Absen", icon: CalendarCheck },
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
          <div className="brand-mark">G</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1 }}>GENCAR</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {me.desa} · {me.kelompok} · {me.nomorUnik}
            </div>
          </div>
        </div>
        <div className="member-topbar-right">
          <span className="pill pill-slate" style={{ fontSize: 11 }}>
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
              onClick={() => setPage(n.key)}
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
