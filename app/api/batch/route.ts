export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// Menggabungkan beberapa GET /api/... dalam SATU request dari browser.
// Tiap item dijalankan lewat loopback ke server ini sendiri (127.0.0.1), sehingga middleware
// (autentikasi, peran, rate limit) dan pengecekan akses di tiap route tetap berlaku apa adanya.
// Cookie dan header identitas diteruskan apa adanya; tidak ada hak akses tambahan.

const MAX_ITEMS = 25;
const FORWARD_HEADERS = ["cookie", "authorization", "x-nomor-unik", "x-session-token", "user-agent", "x-forwarded-for", "x-real-ip", "accept"];

type Item = { path: string; headers?: Record<string, string> };

function validPath(p: unknown): p is string {
  return (
    typeof p === "string" &&
    p.length < 2048 &&
    p.startsWith("/api/") &&
    !p.startsWith("/api/batch") &&
    !p.includes("//") &&
    !p.includes("\\") &&
    !p.includes("..") &&
    !/[\r\n]/.test(p)
  );
}

export async function POST(request: NextRequest) {
  let items: Item[];
  try {
    const body = await request.json();
    items = Array.isArray(body?.requests) ? body.requests : [];
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Jumlah request harus 1-${MAX_ITEMS}` }, { status: 400 });
  }

  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const baseHeaders: Record<string, string> = {};
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h);
    if (v) baseHeaders[h] = v;
  }

  const setCookies: string[] = [];

  const results = await Promise.all(
    items.map(async (item) => {
      if (!validPath(item?.path)) {
        return { status: 400, contentType: "application/json", body: JSON.stringify({ error: "Path tidak valid" }) };
      }
      // Header khusus per item (mis. x-nomor-unik) hanya dari daftar yang diizinkan
      const headers = { ...baseHeaders };
      for (const h of ["x-nomor-unik", "x-session-token", "authorization"]) {
        const v = item.headers?.[h];
        if (typeof v === "string" && v) headers[h] = v;
      }
      try {
        const res = await fetch(base + item.path, { method: "GET", headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(7000) });
        const sc = (res.headers as any).getSetCookie?.() as string[] | undefined;
        if (sc?.length) setCookies.push(...sc);
        return {
          status: res.status,
          contentType: res.headers.get("content-type") || "application/json",
          location: res.headers.get("location") || undefined,
          body: await res.text(),
        };
      } catch {
        return { status: 502, contentType: "application/json", body: JSON.stringify({ error: "Gagal memproses request" }) };
      }
    })
  );

  const response = NextResponse.json({ results });
  for (const c of setCookies) response.headers.append("set-cookie", c);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
