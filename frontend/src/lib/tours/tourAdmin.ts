import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export type AdminPageKey =
  | "anggota"
  | "kegiatan"
  | "pengajuan"
  | "users"
  | "wilayah"
  | "qr"
  | "cms"
  | "statistik";

export type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";

export type TourStepDef = {
  element: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  waitFor?: number;
  roles?: AdminRole[];
};

const STORAGE_PREFIX = "gencar_tour_admin_v3_";
const SHELL_STORAGE_KEY = "gencar_tour_admin_shell_v3";

export function isShellTourDone(): boolean {
  try {
    return localStorage.getItem(SHELL_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function markShellTourDone(): void {
  try {
    localStorage.setItem(SHELL_STORAGE_KEY, "completed");
  } catch {}
}

export function isPageTourDone(pageKey: AdminPageKey): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${pageKey}`) === "completed";
  } catch {
    return false;
  }
}

export function markPageTourDone(pageKey: AdminPageKey): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, "completed");
  } catch {}
}

export function resetAdminTours(): void {
  try {
    const keys: AdminPageKey[] = [
      "anggota",
      "kegiatan",
      "pengajuan",
      "users",
      "wilayah",
      "qr",
      "cms",
      "statistik",
    ];
    keys.forEach((k) => localStorage.removeItem(`${STORAGE_PREFIX}${k}`));
    localStorage.removeItem(SHELL_STORAGE_KEY);
  } catch {}
}

// ── DESKTOP: Penjelasan setiap item sidebar ──
const DESKTOP_SHELL_STEPS: TourStepDef[] = [
  {
    element: "#tour-admin-badge",
    title: "Hak Akses & Wilayah",
    description:
      "Menampilkan peran kepengurusan Anda (Daerah / Desa / Kelompok) serta cakupan wilayah binaan yang dikelola.",
    side: "bottom",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-anggota",
    title: "Menu: Anggota",
    description:
      "Kelola biodata muda-mudi, pantau status keaktifan & perantauan, serta buat tautan registrasi mandiri.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-kegiatan",
    title: "Menu: Kegiatan",
    description:
      "Buat agenda kegiatan rutin/keakraban/pemantapan, buka presensi QR berbasis radius GPS, dan kirim undangan antar-wilayah.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-pengajuan",
    title: "Menu: Pengajuan",
    description:
      "Verifikasi permohonan perubahan profil mandiri dari anggota serta kurasi surat izin tidak hadir kegiatan.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-users",
    title: "Menu: User Admin",
    description:
      "Kelola akun pengurus desa/kelompok di bawah wilayah Anda, atur hak akses, dan reset kata sandi.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-wilayah",
    title: "Menu: Wilayah",
    description:
      "Atur struktur organisasi wilayah se-Daerah Cengkareng, tambah desa baru, serta kelola kelompok binaan.",
    side: "right",
    align: "start",
    roles: ["admin_daerah"],
  },
  {
    element: "#tour-sidebar-nav-qr",
    title: "Menu: QR Wilayah",
    description:
      "Lihat dan unduh kartu QR presensi resmi berkualitas cetak untuk ditempel di lokasi kegiatan wilayah Anda.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-cms",
    title: "Menu: CMS Publik",
    description:
      "Kelola artikel literasi, berita, galeri foto, agenda publik, dan struktur organisasi pada website resmi.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-statistik",
    title: "Menu: Statistik",
    description:
      "Analisis grafik tingkat kehadiran (Hadir Rate), tren keaktifan per wilayah, serta demografi muda-mudi.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav-guide",
    title: "Panduan Fitur",
    description:
      "Klik tombol ini kapan saja untuk memutar ulang tur panduan operasional pada halaman yang sedang aktif.",
    side: "right",
    align: "start",
  },
];

// ── MOBILE: Penjelasan setiap tab dan bottom sheet ──
const MOBILE_SHELL_STEPS: TourStepDef[] = [
  {
    element: "#tour-admin-badge-mobile",
    title: "Hak Akses & Wilayah",
    description:
      "Menampilkan peran kepengurusan Anda dan wilayah yang dikelola. Tap untuk melihat info profil admin.",
    side: "bottom",
    align: "end",
  },
  {
    element: "#tour-mobile-tab-anggota",
    title: "Tab: Anggota",
    description:
      "Akses cepat direktori muda-mudi, filter status keaktifan, dan pembuatan link registrasi mandiri.",
    side: "top",
    align: "start",
  },
  {
    element: "#tour-mobile-tab-kegiatan",
    title: "Tab: Kegiatan",
    description:
      "Akses cepat agenda kegiatan dakwah, pembukaan presensi QR GPS, dan kalender kegiatan interaktif.",
    side: "top",
    align: "center",
  },
  {
    element: "#tour-mobile-tab-pengajuan",
    title: "Tab: Pengajuan",
    description:
      "Akses cepat antrean verifikasi perubahan biodata dan surat izin berhalangan hadir kegiatan.",
    side: "top",
    align: "center",
  },
  {
    element: "#tour-mobile-tab-cms",
    title: "Tab: CMS Publik",
    description:
      "Akses cepat publikasi artikel, galeri foto dokumentasi kegiatan, dan struktur pengurus.",
    side: "top",
    align: "center",
  },
  {
    element: "#tour-admin-mobile-more-tab",
    title: "Tab: Menu Lainnya",
    description:
      "Tombol ini membuka laci menu tambahan (bottom sheet) untuk mengakses modul-modul lanjutan.",
    side: "top",
    align: "end",
  },
  {
    element: "#tour-more-item-users",
    title: "Lainnya: User Admin",
    description:
      "Kelola akun dan hak akses admin pengurus di bawah naungan wilayah Anda.",
    side: "top",
    align: "start",
  },
  {
    element: "#tour-more-item-wilayah",
    title: "Lainnya: Wilayah",
    description:
      "Kelola struktur hierarki pembinaan desa dan kelompok se-Daerah Cengkareng.",
    side: "top",
    align: "start",
    roles: ["admin_daerah"],
  },
  {
    element: "#tour-more-item-qr",
    title: "Lainnya: QR Wilayah",
    description:
      "Unduh kartu presensi QR resmi resolusi tinggi siap cetak untuk ditempel di lokasi acara.",
    side: "top",
    align: "start",
  },
  {
    element: "#tour-more-item-statistik",
    title: "Lainnya: Statistik",
    description:
      "Pantau persentase kehadiran (Hadir Rate), tren grafik, dan sebaran demografi.",
    side: "top",
    align: "start",
  },
  {
    element: "#tour-more-item-guide",
    title: "Lainnya: Panduan Fitur",
    description:
      "Putar ulang panduan fitur kapan saja atau keluar dari sesi akun admin dari lembar menu ini.",
    side: "top",
    align: "start",
  },
];

export const ADMIN_PAGE_STEPS: Record<AdminPageKey, TourStepDef[]> = {
  anggota: [
    {
      element: "#tour-admin-kpi",
      title: "Ringkasan Data Anggota (KPI)",
      description:
        "Pantau jumlah total muda-mudi dalam cakupan Anda, status keaktifan, pending, serta jumlah generus perantauan.",
      side: "bottom",
      align: "center",
    },
    {
      element: "#tour-admin-actions",
      title: "Pendaftaran & Link Mandiri",
      description:
        "Tambahkan data anggota baru secara langsung atau buat Link Registrasi Mandiri berbatas waktu untuk calon generus.",
      side: "bottom",
      align: "end",
    },
    {
      element: "#tour-admin-toolbar",
      title: "Pencarian & Filter Data",
      description:
        "Cari nama atau nomor telepon, dan saring anggota berdasarkan desa, kelompok, status nikah, atau kategori.",
      side: "bottom",
      align: "start",
    },
  ],

  kegiatan: [
    {
      element: "#tour-kegiatan-actions",
      title: "Buat Agenda Kegiatan",
      description:
        "Buat jadwal kegiatan rutin, keakraban, atau pemantapan baru untuk wilayah Anda dengan opsi target peserta & GPS.",
      side: "bottom",
      align: "end",
    },
    {
      element: "#tour-kegiatan-toolbar",
      title: "Toolbar & Kalender Kegiatan",
      description:
        "Cari agenda berdasarkan judul/lokasi, buka Kalender Interaktif, atau saring kegiatan berdasarkan tanggal dan kategori.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-kegiatan-grid",
      title: "Daftar Kegiatan & Presensi",
      description:
        "Lihat detail agenda, buka absensi kehadiran peserta, kelola undangan antar-wilayah, atau edit/hapus kegiatan.",
      side: "top",
      align: "center",
    },
  ],

  pengajuan: [
    {
      element: "#tour-pengajuan-tabs",
      title: "Mode Pengajuan",
      description:
        "Beralih antara tab Pengajuan Profil (perubahan data mandiri dari generus) dan Izin Kegiatan (surat izin tidak hadir).",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-pengajuan-kpi",
      title: "Status & Antrean Verifikasi",
      description:
        "Pantau jumlah pengajuan yang menunggu persetujuan (pending), disetujui (approved), dan ditolak (rejected).",
      side: "bottom",
      align: "center",
    },
    {
      element: "#tour-pengajuan-toolbar",
      title: "Filter & Verifikasi Data",
      description:
        "Cari permohonan berdasarkan nama/NIK, periksa perbandingan data lama vs data baru, lalu setujui atau tolak dengan alasan.",
      side: "bottom",
      align: "start",
    },
  ],

  users: [
    {
      element: "#tour-user-info",
      title: "Hak Kelola Akun Admin",
      description:
        "Menjelaskan hak kelola akun pengurus sesuai tingkat hierarki wilayah Anda (Daerah mengelola Desa & Kelompok, Desa mengelola Kelompok).",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-user-actions",
      title: "Tambah Akun Pengurus",
      description:
        "Daftarkan akun admin baru untuk pengurus desa atau kelompok dengan email dan kata sandi aman.",
      side: "bottom",
      align: "end",
    },
    {
      element: "#tour-user-toolbar",
      title: "Daftar & Manajemen User",
      description:
        "Kelola peran, perbarui data akun, reset kata sandi, atau nonaktifkan akun admin di bawah wilayah Anda.",
      side: "bottom",
      align: "start",
    },
  ],

  wilayah: [
    {
      element: "#tour-wilayah-kpi",
      title: "Struktur Wilayah Daerah (KPI)",
      description:
        "Ringkasan jumlah desa, kelompok binaan, total anggota, dan rata-rata kelompok per desa di wilayah Cengkareng.",
      side: "bottom",
      align: "center",
      roles: ["admin_daerah"],
    },
    {
      element: "#tour-wilayah-actions",
      title: "Tambah & Atur Wilayah",
      description:
        "Tambah desa baru atau tambahkan kelompok ke dalam desa terkait untuk memperbarui struktur pembinaan.",
      side: "bottom",
      align: "end",
      roles: ["admin_daerah"],
    },
    {
      element: "#tour-wilayah-toolbar",
      title: "Pencarian & Daftar Wilayah",
      description:
        "Cari dan buka daftar kelompok di setiap desa, pantau jumlah generus per wilayah, serta kelola nama desa/kelompok.",
      side: "bottom",
      align: "start",
      roles: ["admin_daerah"],
    },
  ],

  qr: [
    {
      element: "#tour-qr-header",
      title: "Kartu Presensi QR Wilayah",
      description:
        "Setiap wilayah (Daerah, Desa, Kelompok) memiliki 1 QR unik resmi yang ditempel di lokasi kegiatan untuk discan anggota.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-qr-grid",
      title: "Lihat & Unduh QR Cetak",
      description:
        "Klik 'Lihat & Unduh' pada kartu wilayah untuk mengunduh gambar kartu QR resmi beresolusi tinggi siap cetak.",
      side: "top",
      align: "center",
    },
  ],

  cms: [
    {
      element: "#tour-cms-tabs",
      title: "Tab Konten Web Publik",
      description:
        "Kelola etalase web publik Gencar: Kegiatan Publik, Artikel Literasi, Galeri Foto, Struktur Pengurus, dan Profil Tentang.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-cms-content",
      title: "Alur Review & Publikasi Konten",
      description:
        "Admin kelompok/desa dapat membuat draft, sedangkan admin daerah dapat mereview, menyetujui, atau mempublikasikan konten ke publik.",
      side: "top",
      align: "center",
    },
  ],

  statistik: [
    {
      element: "#tour-statistik-filter",
      title: "Filter Analisis & Statistik",
      description:
        "Saring analisis data berdasarkan rentang waktu (harian/mingguan/bulanan/tahunan), jenis kegiatan, kategori muda-mudi, dan jenis kelamin.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-statistik-kpi",
      title: "Metrik Tingkat Kehadiran",
      description:
        "Pantau persentase tingkat kehadiran (Hadir Rate), total kegiatan terlaksana, rata-rata kehadiran, grafik tren, dan sebaran demografi.",
      side: "bottom",
      align: "center",
    },
  ],
};

export function startAdminPageTour(
  pageKey: AdminPageKey,
  opts?: { force?: boolean; role?: AdminRole; includeShell?: boolean }
): void {
  if (!opts?.force && isPageTourDone(pageKey)) {
    return;
  }

  const role = opts?.role ?? "admin_kelompok";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Filter steps by role
  const rawPageSteps = ADMIN_PAGE_STEPS[pageKey] || [];
  const filteredPageSteps = rawPageSteps.filter((s) => !s.roles || s.roles.includes(role));

  // Sertakan SHELL_STEPS HANYA 1x di awal (atau jika diminta eksplisit melalui tombol Panduan Fitur)
  const shouldIncludeShell = !isShellTourDone() || Boolean(opts?.includeShell);
  const shellStepsToUse = shouldIncludeShell
    ? (isMobile ? MOBILE_SHELL_STEPS : DESKTOP_SHELL_STEPS).filter((s) => !s.roles || s.roles.includes(role))
    : [];

  const combinedDefs = [...shellStepsToUse, ...filteredPageSteps];
  if (combinedDefs.length === 0) return;

  setTimeout(() => {
    const driveSteps: DriveStep[] = combinedDefs.map((def, idx) => {
      return {
        element: def.element,
        waitForElement: def.waitFor ?? 1500,
        skipMissingElement: true,
        popover: {
          title: def.title,
          description: def.description,
          side: def.side ?? "bottom",
          align: def.align ?? "center",
        },
        onHighlightStarted: () => {
          // Jika langkah adalah tab Lainnya atau item di dalam sheet, pastikan sheet terbuka
          if (
            isMobile &&
            (def.element === "#tour-admin-mobile-more-tab" || def.element.startsWith("#tour-more-"))
          ) {
            window.dispatchEvent(new CustomEvent("admin:tour:set-sheet", { detail: { open: true } }));
          }
        },
        onDeselected: () => {
          if (isMobile) {
            const nextDef = combinedDefs[idx + 1];
            // Jika langkah berikutnya bukan item sheet, tutup sheet secara otomatis
            if (!nextDef || !nextDef.element.startsWith("#tour-more-")) {
              window.dispatchEvent(new CustomEvent("admin:tour:set-sheet", { detail: { open: false } }));
            }
          }
        },
      };
    });

    const driverObj = driver({
      steps: driveSteps,
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 14,
      nextBtnText: "Lanjut →",
      prevBtnText: "← Kembali",
      doneBtnText: "Selesai",
      progressText: "{{current}} dari {{total}}",
      onDestroyStarted: () => {
        if (isMobile) {
          window.dispatchEvent(new CustomEvent("admin:tour:set-sheet", { detail: { open: false } }));
        }
        if (shouldIncludeShell) {
          markShellTourDone();
        }
        markPageTourDone(pageKey);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 450);
}
