/**
 * Mengubah URL gambar Cloudinary menjadi versi thumbnail yang jauh lebih kecil
 * (lebar dibatasi, kualitas & format otomatis). URL non-Cloudinary dikembalikan apa adanya.
 */
export function thumbUrl(url: string | null | undefined, width = 480): string {
  if (!url) return "";
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const [head, tail] = url.split(marker);
  // Sudah ada transformasi (mis. w_..., c_...)? Jangan ditimpa.
  if (/^(?:[a-z]{1,3}_[^/]+,?)+\//i.test(tail) && !/^v\d+\//.test(tail)) return url;
  return `${head}${marker}w_${width},c_limit,q_auto,f_auto/${tail}`;
}
