/**
 * Render label kategori dari value underscore/slug menjadi human-readable.
 * "sambung_rutin" → "Sambung Rutin", "Sambung Rutin" → "Sambung Rutin"
 */
export function labelKategori(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
