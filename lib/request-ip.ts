/**
 * IP klien yang tidak mudah dipalsukan.
 * Urutan: cf-connecting-ip (Cloudflare) → x-real-ip (diset reverse proxy) →
 * entri TERAKHIR x-forwarded-for (ditambahkan proxy terdekat; entri pertama bisa dipalsukan klien).
 */
export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
