import { useState } from "react";
import { Users, User, BarChart3, LogOut, Home, HelpCircle, Briefcase } from "lucide-react";
import type { MemberIdentity } from "./types";
import { startMemberTour } from "../../lib/tours/tourMember";

export type MemberPageKey = "beranda" | "pekerjaan" | "profil" | "statistik";

const NAV: { key: MemberPageKey; label: string; icon: typeof Home; id?: string }[] = [
  { key: "beranda", label: "Beranda", icon: Home },
  { key: "pekerjaan", label: "Pekerjaan", icon: Briefcase, id: "tour-member-nav-pekerjaan" },
  { key: "profil", label: "Profil", icon: User },
  { key: "statistik", label: "Statistik", icon: BarChart3 },
];

export default function MemberShell({
  page,
  setPage,
  me,
  onExit,
  onLogout,
  children,
}: {
  page: MemberPageKey;
  setPage: (k: MemberPageKey) => void;
  me: MemberIdentity;
  onExit: () => void;
  onLogout?: () => void;
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
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (page !== "beranda") setPage("beranda");
              startMemberTour({ force: true });
            }}
            title="Panduan Aplikasi"
            aria-label="Panduan Aplikasi"
            style={{ padding: "4px 8px", fontSize: 11, borderRadius: 999, height: "auto", display: "inline-flex", gap: 4, alignItems: "center" }}
          >
            <HelpCircle size={14} />
            <span style={{ fontWeight: 700 }}>Panduan</span>
          </button>
          <span className="pill" style={{ fontSize: 11 }}>
            <Users size={12} /> {me.nama.split(" ")[0]}
          </span>
          <button
            type="button"
            className="member-topbar-logout-btn"
            onClick={() => (onLogout ?? onExit)()}
            title="Keluar — hapus sesi"
            aria-label="Keluar akun"
          >
            <LogOut size={14} />
            <span className="member-topbar-logout-text">Keluar</span>
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
              id={n.id}
              type="button"
              className={`member-nav-item ${n.id ? n.id : ""} ${active ? "active" : ""}`}
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
        {open && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <button
              type="button"
              className="member-nav-item"
              onClick={() => {
                setOpen(false);
                if (page !== "beranda") setPage("beranda");
                startMemberTour({ force: true });
              }}
            >
              <HelpCircle size={18} />
              <span>Panduan Fitur</span>
            </button>
            <button
              type="button"
              className="member-nav-item"
              style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}
              onClick={() => {
                setOpen(false);
                (onLogout ?? onExit)();
              }}
            >
              <LogOut size={18} />
              <span>Keluar dari Akun</span>
            </button>
          </>
        )}
      </nav>

      <main className="member-main">{children}</main>

      <nav className="member-bottom" aria-label="Member bottom navigation">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.key}
              id={n.id ? `bottom-${n.id}` : undefined}
              type="button"
              className={`${n.id ? n.id : ""} ${page === n.key ? "active" : ""}`}
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
