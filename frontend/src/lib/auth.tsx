import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

export type AuthUser = {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  desaId?: number | null;
  kelompokId?: number | null;
  generusId?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const j = await apiFetch<{ user: AuthUser | null }>("/api/auth/me");
      setUser(j?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // If any fetch throws 401, apiFetch throws with status 401 — don't auto-logout here,
  // but keep /api/auth/me as source of truth. Silent 401 on public pages is expected.

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const j = await apiFetch<{ success: boolean; user: AuthUser; token?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const u = (j as { user?: AuthUser })?.user ?? null;
    const bearer = (j as { token?: string })?.token ?? null;
    // Persist Bearer token for subsequent API calls (Vite / Hono rateLimitAuth trusts Authorization)
    if (bearer) {
      try { localStorage.setItem("token", bearer); } catch {}
    }
    if (u) setUser(u);
    else await refresh();
    return u as AuthUser;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch {}
    try { localStorage.removeItem("token"); } catch {}
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
