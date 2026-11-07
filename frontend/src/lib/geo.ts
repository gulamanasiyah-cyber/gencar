export type GeoFix = { lat: number; lng: number; acc: number | null };

const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

function once(opts: PositionOptions): Promise<GeoFix> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? null }),
      reject,
      opts,
    ),
  );
}

/**
 * Ambil lokasi: coba akurasi tinggi dulu, lalu fallback akurasi rendah (WiFi/seluler).
 * iPhone sering TIMEOUT pada enableHighAccuracy di dalam ruangan.
 */
export async function getPosition(): Promise<GeoFix> {
  if (!window.isSecureContext) throw { code: -2 };
  if (!navigator.geolocation) throw { code: -1 };
  try {
    return await once({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  } catch (err: any) {
    if (err?.code === 1) throw err; // PERMISSION_DENIED — jangan ulang
    return await once({ enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 });
  }
}

export function geoErrorMessage(err: any): string {
  switch (err?.code) {
    case -2:
      return "Lokasi hanya bisa diakses lewat HTTPS.";
    case -1:
      return "Geolocation tidak tersedia di browser ini.";
    case 1:
      return isIOS
        ? "Izin lokasi ditolak. Buka Pengaturan › Privasi & Keamanan › Layanan Lokasi: pastikan aktif dan \"Situs Web Safari\" (atau Chrome) = \"Saat Digunakan\". Lalu di Safari ketuk aA › Pengaturan Situs Web › Lokasi › Izinkan, dan muat ulang halaman."
        : "Izin lokasi ditolak. Izinkan akses lokasi untuk situs ini di pengaturan browser, lalu muat ulang.";
    case 3:
      return "Waktu habis mencari lokasi. Coba lagi di area terbuka.";
    default:
      return "Gagal mendapatkan lokasi. Pastikan GPS/Layanan Lokasi aktif lalu coba lagi.";
  }
}
