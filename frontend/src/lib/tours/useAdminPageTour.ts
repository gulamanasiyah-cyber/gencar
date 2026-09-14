import { useEffect } from "react";
import {
  startAdminPageTour,
  isPageTourDone,
  type AdminPageKey,
  type AdminRole,
  type TourHandlers,
} from "./tourAdmin";

export function useAdminPageTour(
  pageKey: AdminPageKey,
  opts?: {
    role?: AdminRole;
    handlers?: TourHandlers;
    ready?: boolean;
  }
): void {
  const role = opts?.role;
  const handlers = opts?.handlers;
  const ready = opts?.ready ?? true;

  useEffect(() => {
    if (!ready) return;

    // Auto-run tour jika belum pernah diselesaikan pada halaman ini
    if (!isPageTourDone(pageKey)) {
      const timer = setTimeout(() => {
        startAdminPageTour(pageKey, { role, handlers });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pageKey, ready, role, handlers]);

  // Listener untuk tombol "Panduan Fitur" dari Shell/Topbar yang memicu tour aktif
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ page: AdminPageKey; force?: boolean }>;
      if (customEvent.detail?.page === pageKey) {
        startAdminPageTour(pageKey, {
          force: customEvent.detail?.force ?? true,
          role,
          handlers,
        });
      }
    };

    window.addEventListener("admin:tour", handleTrigger);
    return () => window.removeEventListener("admin:tour", handleTrigger);
  }, [pageKey, role, handlers]);
}
