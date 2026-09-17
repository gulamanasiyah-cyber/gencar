import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_STORAGE_KEY = "gencar_tour_member_v1";

export function isMemberTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function setMemberTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "completed");
  } catch {}
}

export function startMemberTour(options?: { force?: boolean }): void {
  if (!options?.force && isMemberTourCompleted()) {
    return;
  }

  // Tunggu sebentar agar elemen DOM ter-render sempurna
  setTimeout(() => {
    const driverObj = driver({
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
        setMemberTourCompleted();
        driverObj.destroy();
      },
      steps: [
        {
          element: "#tour-member-hero",
          popover: {
            title: "Jadwal & Waktu Kegiatan",
            description: "Pantau waktu saat ini, nama agenda aktif hari ini, lokasi, dan rentang jam mulai s/d selesai.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-member-scanner",
          popover: {
            title: "Scanner Presensi QR",
            description: "Arahkan kamera ke QR Wilayah yang terpasang di tempat kegiatan untuk mencatat kehadiran secara instan.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-member-gps",
          popover: {
            title: "Cek Lokasi & Radius GPS",
            description: "Gunakan tombol ini untuk memverifikasi apakah perangkat Anda sudah berada dalam radius lokasi acara.",
            side: "top",
            align: "end",
          },
        },
        {
          element: "#tour-member-kalender",
          popover: {
            title: "Kalender & Agenda Terdekat",
            description: "Semua jadwal kegiatan kelompok, desa, maupun daerah tersusun di kalender ini. Klik tanggal untuk melihat detailnya.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-member-izin",
          popover: {
            title: "Pengajuan Izin Kegiatan",
            description: "Jika berhalangan hadir pada kegiatan mendatang, Anda dapat mengajukan izin lebih awal melalui menu ini.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-member-riwayat",
          popover: {
            title: "Riwayat & Jam Kehadiran",
            description: "Daftar riwayat kehadiran Anda lengkap dengan jam check-in aktual, status izin, dan catatan kehadiran.",
            side: "top",
            align: "center",
          },
        },
        {
          element: ".tour-member-nav-pekerjaan",
          popover: {
            title: "Menu Pekerjaan & Opportunity",
            description: "Akses halaman khusus untuk melihat dan membagikan lowongan pekerjaan, peluang usaha, atau kerja sampingan dari sesama anggota se-Daerah.",
            side: "top",
            align: "center",
          },
        },
      ],
    });

    driverObj.drive();
  }, 400);
}
