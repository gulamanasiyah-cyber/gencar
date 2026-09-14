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

export type TourAction =
  | "openKegiatanForm"
  | "closeKegiatanForm"
  | "openAddAnggota"
  | "closeAddAnggota"
  | "openAddUser"
  | "closeAddUser";

export type TourStepDef = {
  element: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  before?: TourAction;
  after?: TourAction;
  waitFor?: number;
  roles?: AdminRole[];
};

export type TourHandlers = Partial<Record<TourAction, () => void>>;

const STORAGE_PREFIX = "gencar_tour_admin_v2_";

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
  } catch {}
}

const SHELL_STEPS: TourStepDef[] = [
  {
    element: "#tour-admin-badge",
    title: "Hak Akses & Wilayah",
    description:
      "Menampilkan peran kepengurusan Anda (Daerah / Desa / Kelompok) serta cakupan wilayah yang dikelola.",
    side: "bottom",
    align: "start",
  },
  {
    element: "#tour-admin-sidebar",
    title: "Navigasi Menu Utama",
    description:
      "Akses cepat ke seluruh modul operasional: Anggota, Kegiatan, Pengajuan, User, QR Presensi, CMS, dan Statistik.",
    side: "right",
    align: "start",
  },
];

export const ADMIN_PAGE_STEPS: Record<AdminPageKey, TourStepDef[]> = {
  anggota: [
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
    {
      element: "#tour-kegiatan-form-kategori",
      title: "Form: Kategori & Judul Acara",
      description:
        "Pilih kategori acara (Sambung Rutin auto-template judul, Keakraban, Pemantapan, atau Kategori Custom).",
      side: "bottom",
      align: "start",
      before: "openKegiatanForm",
      waitFor: 350,
    },
    {
      element: "#tour-kegiatan-form-jadwal",
      title: "Form: Tanggal & Waktu Acara",
      description:
        "Atur tanggal pelaksanaan, jam mulai, jam selesai (waktu pulang), serta opsi acara multi-hari / lintas hari.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-kegiatan-form-lokasi",
      title: "Form: Lokasi & Validasi GPS",
      description:
        "Pilih titik koordinat di peta dan radius presensi (50m/100m/200m). Jika dikosongkan, absensi fleksibel tanpa GPS.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-kegiatan-form-peserta",
      title: "Form: Target Peserta Wajib",
      description:
        "Tentukan siapa yang wajib hadir: seluruh anggota di wilayah Anda atau filter spesifik (pendidikan, usia, desa/kelompok).",
      side: "top",
      align: "start",
    },
    {
      element: "#tour-kegiatan-form-submit",
      title: "Form: Simpan Kegiatan",
      description:
        "Simpan kegiatan untuk mempublikasikannya ke kalender generus dan mengaktifkan jadwal presensi wilayah.",
      side: "top",
      align: "center",
      after: "closeKegiatanForm",
    },
  ],

  pengajuan: [
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
    ...SHELL_STEPS,
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
  opts?: { force?: boolean; role?: AdminRole; handlers?: TourHandlers }
): void {
  if (!opts?.force && isPageTourDone(pageKey)) {
    return;
  }

  const role = opts?.role ?? "admin_kelompok";
  const handlers = opts?.handlers ?? {};
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Filter steps by role
  const rawSteps = ADMIN_PAGE_STEPS[pageKey] || [];
  const filteredDefs = rawSteps.filter((s) => !s.roles || s.roles.includes(role));

  if (filteredDefs.length === 0) return;

  setTimeout(() => {
    let lastActiveAction: TourAction | undefined;

    const driveSteps: DriveStep[] = filteredDefs.map((def) => {
      // Switch element selector for mobile where needed
      let selector = def.element;
      if (isMobile) {
        if (selector === "#tour-admin-badge") selector = "#tour-admin-badge-mobile";
        else if (selector === "#tour-admin-sidebar") selector = "#tour-admin-mobile-nav";
      }

      return {
        element: selector,
        waitForElement: def.waitFor ?? 1500,
        skipMissingElement: true,
        popover: {
          title: def.title,
          description: def.description,
          side: def.side ?? "bottom",
          align: def.align ?? "center",
        },
        onHighlightStarted: () => {
          if (def.before && handlers[def.before]) {
            handlers[def.before]!();
            lastActiveAction = def.before;
          }
        },
        onDeselected: () => {
          if (def.after && handlers[def.after]) {
            handlers[def.after]!();
            if (lastActiveAction === def.before) lastActiveAction = undefined;
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
        // Cleanup modal if left open
        if (lastActiveAction === "openKegiatanForm" && handlers.closeKegiatanForm) {
          handlers.closeKegiatanForm();
        } else if (lastActiveAction === "openAddAnggota" && handlers.closeAddAnggota) {
          handlers.closeAddAnggota();
        } else if (lastActiveAction === "openAddUser" && handlers.closeAddUser) {
          handlers.closeAddUser();
        }
        markPageTourDone(pageKey);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 450);
}
