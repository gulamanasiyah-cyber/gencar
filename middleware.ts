import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/desa", "/api/auth/kelompok", "/api/auth/reset-password", "/api/settings", "/api/public", "/api/upload", "/api/sholat", "/mandiri/katalog", "/mandiri/daftar", "/api/mandiri/pilih", "/api/mandiri/komentar", "/api/mandiri/box-love", "/api/mandiri/rooms", "/api/debug-db", "/api/webhook/fonnte"];

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public artikel, berita, and organisasi page
  if (pathname === "/" || pathname.startsWith("/artikel") || pathname.startsWith("/berita") || pathname.startsWith("/organisasi") || pathname.endsWith("/rate")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_pnkb_gambuh"].includes(payload.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin PDKT restriction - only /admin/katalog
  if (payload.role === "admin_pdkt" && !pathname.startsWith("/admin/katalog") && !pathname.startsWith("/api/auth/logout") && !pathname.startsWith("/api/profile") && !pathname.startsWith("/api/generus") && !pathname.startsWith("/api/mandiri/settings") && !pathname.startsWith("/api/mandiri/box-love") && !pathname.startsWith("/api/mandiri/kegiatan")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/katalog", request.url));
  }

  // Usia Mandiri / Romantic Room strict restriction
  const isMandiriRoute = pathname.startsWith("/mandiri") || pathname.startsWith("/admin/katalog");
  const isMandiriApi = pathname.startsWith("/api/mandiri");

  if ((isMandiriRoute || isMandiriApi) && !(["admin", "admin_romantic_room", "admin_pdkt", "tim_pnkb_gambuh"] as string[]).includes(payload.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Tim Gambuh strict restriction
  if (payload.role === "tim_pnkb_gambuh" &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/mandiri/tim-gambuh") &&
      !pathname.startsWith("/mandiri/tim-penunggu") &&
      !pathname.startsWith("/admin/katalog") &&
      !pathname.startsWith("/api/public/mandiri") &&
      !pathname.startsWith("/api/mandiri/rooms") &&
      !pathname.startsWith("/api/profile") &&
      !pathname.startsWith("/profile") &&
      !pathname.startsWith("/api/admin/tim-gambuh") &&
      !pathname.startsWith("/api/admin/tim-penunggu") &&
      !pathname.startsWith("/api/mandiri/settings") &&
      !pathname.startsWith("/api/generus/filters") &&
        !pathname.startsWith("/api/generus") &&
      !pathname.startsWith("/api/auth/logout")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/mandiri/tim-gambuh", request.url));
  }

  // Generus & Peserta restriction
  if ((payload.role === "generus" || payload.role === "peserta" || payload.role === "usia_mandiri") &&
      !pathname.startsWith("/profile") &&
      !pathname.startsWith("/katalog") &&
      !pathname.startsWith("/mandiri") &&
      !pathname.startsWith("/api/profile") &&
      !pathname.startsWith("/api/mandiri") &&
      !pathname.startsWith("/api/auth/logout") &&
      !pathname.startsWith("/api/generus") &&
      !pathname.startsWith("/rab") &&
      !pathname.startsWith("/api/rab") &&
      !pathname.startsWith("/rundown") &&
      !pathname.startsWith("/api/rundown") &&
      !pathname.startsWith("/scan") &&
      !pathname.startsWith("/hadir") &&
      !PUBLIC_PATHS.some(p => pathname.startsWith(p)) &&
      pathname !== "/" && !pathname.startsWith("/artikel") && !pathname.startsWith("/berita") && !pathname.startsWith("/api/berita") && !pathname.startsWith("/api/artikel") && !pathname.startsWith("/api/upload")) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  // Pending-only restriction
  if (payload.role === "pending" &&
      !pathname.startsWith("/pending") &&
      !pathname.startsWith("/api/auth/logout") &&
      !PUBLIC_PATHS.some(p => pathname.startsWith(p)) &&
      pathname !== "/" && !pathname.startsWith("/artikel") && !pathname.startsWith("/berita")) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Admin Romantic Room / Tim PNKB / Admin Keuangan / Creator / Admin Kegiatan restriction
  if (["admin_romantic_room", "tim_pnkb", "admin_keuangan", "creator", "admin_kegiatan"].includes(payload.role) &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/mandiri") &&
      !pathname.startsWith("/katalog") &&
      !pathname.startsWith("/admin/katalog") &&
      !pathname.startsWith("/admin/anggaran") &&
      !pathname.startsWith("/admin/tim-gambuh") &&
      !pathname.startsWith("/admin/tim-penunggu") &&
      !pathname.startsWith("/api/admin/tim-gambuh") &&
      !pathname.startsWith("/api/admin/tim-penunggu") &&
      !pathname.startsWith("/api/mandiri") &&
      !pathname.startsWith("/api/generus") &&
      !pathname.startsWith("/api/profile") &&
      !pathname.startsWith("/profile") &&
      !pathname.startsWith("/generus") &&
      !pathname.startsWith("/kegiatan") &&
      !pathname.startsWith("/rab") &&
      !pathname.startsWith("/api/rab") &&
      !pathname.startsWith("/rundown") &&
      !pathname.startsWith("/api/rundown") &&
      !pathname.startsWith("/api/kegiatan") &&
      !pathname.startsWith("/api/berita") &&
      !pathname.startsWith("/api/artikel") &&
      !pathname.startsWith("/api/scanner") &&
      !pathname.startsWith("/api/upload") &&
      !pathname.startsWith("/api/auth/logout") &&
      !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

