import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";

function isAdminRole(role: string | undefined | null) {
  const r = String(role ?? "").toLowerCase();
  return ["admin_daerah", "admin_desa", "admin_kelompok"].includes(r);
}
function isGenerusRole(role: string | undefined | null) {
  const r = String(role ?? "").toLowerCase();
  return r === "generus";
}

export function RequireAuth({ children, allow }: { children: React.ReactNode; allow: "admin" | "member" | "any" }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="auth-page" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
        <div className="card" style={{ padding: 24, textAlign: "center", maxWidth: 320 }}>
          <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
            <span className="brand-mark">G</span> Gencar
          </div>
          <span className="muted">Memuat sesi…</span>
        </div>
      </div>
    );
  }
  if (!user) {
    // Don't loop if we're already on /login (can happen via nested routes)
    if (loc.pathname.startsWith("/login")) return <>{children}</>;
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (allow === "admin" && !isAdminRole(user.role)) {
    if (isGenerusRole(user.role)) return <Navigate to="/member" replace />;
    // unknown/pending role → bounce to login with next, not loop to member
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (allow === "member" && !isGenerusRole(user.role) && !isAdminRole(user.role)) {
    // unknown role (e.g. desa/kelompok legacy) → login, not loop
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  return <>{children}</>;
}
