// mock public data — replace with /api/public/* when BE ready
export type PubKegiatan = {
  slug: string;
  judul: string;
  excerpt: string;
  cover: string;
  kategori: string;
  tanggal: string;
  lokasi: string;
  jam?: string;
  konten?: string;
};
export type ArtikelKategori = "tuntunan_ibadah" | "info_kesehatan" | "tafsir" | "kisah" | "berita";
export const ARTIKEL_KATEGORI_LABEL: Record<ArtikelKategori, string> = {
  tuntunan_ibadah: "Tuntunan Ibadah",
  info_kesehatan: "Info Kesehatan",
  tafsir: "Tafsir",
  kisah: "Kisah",
  berita: "Berita",
};

export type PubArticle = {
  slug: string;
  judul: string;
  excerpt: string;
  cover: string;
  tanggal: string;
  author: string;
  kategori: ArtikelKategori;
};

export const MOCK_KEGIATAN: PubKegiatan[] = [
  // ── upcoming (future) — biar header "Kegiatan Terdekat" + countdown kelihatan ──
  {
    slug: "ngaji-rutin-selasa-malam",
    judul: "Ngaji Rutin Selasa Malam — bedah kitab & tanya jawab",
    excerpt: "Kajian mingguan yang santai tapi ngena. Materi terapan, bukan ceramah satu arah.",
    cover: "https://picsum.photos/seed/gencar-ngaji/900/700",
    kategori: "Sambung Rutin",
    tanggal: "2026-09-02",
    lokasi: "Musala Al-Falah",
    jam: "19:30",
    konten: "<p>Kajian rutin Selasa malam — kitanya duduk melingkar, bukan baris. Tanya jawab bebas, pulang bawa 1 amalan yang langsung dipraktikin.</p>",
  },
  {
    slug: "festival-anak-cengkareng",
    judul: "Festival Anak Cengkareng — lomba, bazaar, dan panggung kreasi",
    excerpt: "Seharian penuh buat anak-anak: lomba mewarnai, bazaar UMKM, dan panggung kreasi.",
    cover: "https://picsum.photos/seed/gencar-festival/900/700",
    kategori: "Lainnya",
    tanggal: "2026-09-15",
    lokasi: "Lapangan Cengkareng",
    jam: "08:00",
  },
  {
    slug: "pelatihan-kepemimpinan-muda",
    judul: "Pelatihan Kepemimpinan Muda — dari anggota jadi penggerak",
    excerpt: "Workshop 1 hari: public speaking, manajemen konflik, dan cara bikin keputusan bareng.",
    cover: "https://picsum.photos/seed/gencar-leadership/900/700",
    kategori: "Pemantapan",
    tanggal: "2026-09-20",
    lokasi: "Aula Kecamatan",
    jam: "09:00",
  },
  {
    slug: "jalan-sehat-keluarga",
    judul: "Jalan Sehat Keluarga — start Masjid Al-Ikhlas, finish ngopi bareng",
    excerpt: "Rute 3 km keliling Cengkareng Timur. Doorprize sepeda, tapi yang penting silaturahmi.",
    cover: "https://picsum.photos/seed/gencar-jalan-sehat/900/700",
    kategori: "Keakraban",
    tanggal: "2026-10-04",
    lokasi: "Masjid Al-Ikhlas",
    jam: "06:30",
  },
  {
    slug: "workshop-konten-kreatif-2",
    judul: "Workshop Konten Kreatif #2 — editing reels yang nggak cringe",
    excerpt: "Belajar ngedit reels & poster yang enak dilihat. Bawa HP aja, langsung praktek.",
    cover: "https://picsum.photos/seed/gencar-konten-2/900/700",
    kategori: "Lainnya",
    tanggal: "2026-10-12",
    lokasi: "Basecamp Gencar",
    jam: "10:00",
  },
  {
    slug: "sambung-akbar-q4",
    judul: "Sambung Akbar Q4 — temu 500 muda-mudi se-Cengkareng",
    excerpt: "Sambung terbesar tahun ini. Kajian + deklarasi komitmen bareng.",
    cover: "https://picsum.photos/seed/gencar-akbar-q4/900/700",
    kategori: "Sambung Rutin",
    tanggal: "2026-11-08",
    lokasi: "Aula Cengkareng",
    jam: "19:00",
  },
  // ── past (sudah lewat) ──
  {
    slug: "kerja-bakti-cengkareng-bersih",
    judul: "Kerja Bakti Cengkareng Bersih — gotong royong bareng warga",
    excerpt: "Aksi bersih lingkungan kolaborasi muda-mudi, karang taruna, dan warga. Titik kumpul Masjid Al-Ikhlas.",
    cover: "https://picsum.photos/seed/gencar-kerja-bakti/900/700",
    kategori: "Keakraban",
    tanggal: "2026-03-15",
    lokasi: "Cengkareng Timur",
    jam: "07:00",
    konten: "<p>Kerja bakti jadi ritual bulanan Gencar. Bukan seremonial — sapu, angkut, cat ulang pos ronda. Dokumentasi lengkap di galeri.</p><h2>Kenapa ini penting</h2><p>Lingkungan bersih bikin betah. Anak muda yang turun langsung, warga yang lihat langsung percaya.</p><blockquote>Gotong royong itu bukan nostalgia, tapi sistem operasi.</blockquote>",
  },
  {
    slug: "sambung-rutin-akbar-maret",
    judul: "Sambung Rutin Akbar — 300 muda-mudi, satu frekuensi",
    excerpt: "Kajian tematik + sharing circle. Kurasi materi terapan, bukan ceramah satu arah.",
    cover: "https://picsum.photos/seed/gencar-sambung/900/700",
    kategori: "Sambung Rutin",
    tanggal: "2026-03-08",
    lokasi: "Aula Cengkareng",
    jam: "19:30",
  },
  {
    slug: "pemantapan-kader-intensif",
    judul: "Pemantapan Kader — dari panitia jadi penanggung jawab",
    excerpt: "Workshop intensif: public speaking, manajemen acara, dan etika kepanitiaan.",
    cover: "https://picsum.photos/seed/gencar-kader/900/700",
    kategori: "Pemantapan",
    tanggal: "2026-02-28",
    lokasi: "Basecamp Gencar",
    jam: "13:00",
  },
  {
    slug: "futsal-persahabatan-antar-rw",
    judul: "Futsal Persahabatan Antar-RW — kalah menang tetap ngopi",
    excerpt: "Laga persahabatan yang ujungnya musyawarah. Olahraga sebagai jembatan.",
    cover: "https://picsum.photos/seed/gencar-futsal/900/700",
    kategori: "Keakraban",
    tanggal: "2026-02-20",
    lokasi: "Lapangan Cengkareng",
    jam: "15:00",
  },
  {
    slug: "kelas-kreatif-desain-poster",
    judul: "Kelas Kreatif: Desain Poster Dakwah yang Nggak Ngebosenin",
    excerpt: "Belajar Canva, tipografi, dan hierarki visual. Output langsung jadi poster kegiatan.",
    cover: "https://picsum.photos/seed/gencar-desain/900/700",
    kategori: "Lainnya",
    tanggal: "2026-02-12",
    lokasi: "Ruang Kreatif",
    jam: "10:00",
  },
  {
    slug: "bakti-sosial-ramadhan-berbagi",
    judul: "Bakti Sosial Ramadhan — paket sembako & takjil on the road",
    excerpt: "Distribusi 200 paket + takjil keliling. Donasi transparan, laporan publik.",
    cover: "https://picsum.photos/seed/gencar-ramadhan/900/700",
    kategori: "Keakraban",
    tanggal: "2026-02-02",
    lokasi: "Cengkareng Barat",
    jam: "16:00",
  },
];

export const MOCK_ARTIKEL: PubArticle[] = [
  {
    slug: "cara-bikin-kegiatan-yang-orang-mau-datang",
    judul: "Cara bikin kegiatan yang orang mau datang (tanpa spam broadcast)",
    excerpt: "Rumus sederhana: janji jelas, tempat jelas, pulang bawa cerita.",
    cover: "https://picsum.photos/seed/gencar-artikel-1/700/480",
    tanggal: "2026-03-10",
    author: "Tim Gencar",
    kategori: "tuntunan_ibadah",
  },
  {
    slug: "kenapa-dokumentasi-kegiatan-itu-penting",
    judul: "Kenapa dokumentasi kegiatan itu penting — bukan buat pamer",
    excerpt: "Arsip yang rapi bikin regenerasi nggak mulai dari nol.",
    cover: "https://picsum.photos/seed/gencar-artikel-2/700/480",
    tanggal: "2026-03-02",
    author: "Tim Gencar",
    kategori: "kisah",
  },
  {
    slug: "ngelola-komunitas-tanpa-burnout",
    judul: "Ngelola komunitas tanpa burnout: sistem kecil yang jalan terus",
    excerpt: "Checklist, rotasi, dan dokumentasi — tiga hal yang menyelamatkan panitia.",
    cover: "https://picsum.photos/seed/gencar-artikel-3/700/480",
    tanggal: "2026-02-18",
    author: "Tim Gencar",
    kategori: "info_kesehatan",
  },
  {
    slug: "briefing-panitia-15-menit-yang-efektif",
    judul: "Briefing panitia 15 menit yang efektif — bukan rapat 2 jam",
    excerpt: "Format briefing yang bikin semua tau tugasnya sebelum acara mulai.",
    cover: "https://picsum.photos/seed/gencar-artikel-4/700/480",
    tanggal: "2026-02-10",
    author: "Tim Gencar",
    kategori: "berita",
  },
  {
    slug: "desain-poster-dakwah-yang-nggak-norak",
    judul: "Desain poster dakwah yang nggak norak — hierarki visual 101",
    excerpt: "Tipografi, kontras, dan whitespace yang bikin poster kebaca, bukan rame.",
    cover: "https://picsum.photos/seed/gencar-artikel-5/700/480",
    tanggal: "2026-02-04",
    author: "Kreatif Gencar",
    kategori: "tafsir",
  },
  {
    slug: "cara-nulis-laporan-kegiatan-yang-dibaca",
    judul: "Cara nulis laporan kegiatan yang dibaca — bukan diarsip doang",
    excerpt: "Struktur laporan 1 halaman yang bikin generasi next ngerti konteksnya.",
    cover: "https://picsum.photos/seed/gencar-artikel-6/700/480",
    tanggal: "2026-01-28",
    author: "Tim Gencar",
    kategori: "tuntunan_ibadah",
  },
  {
    slug: "rekrut-panitia-baru-tanpa-maksa",
    judul: "Rekrut panitia baru tanpa maksa — sistem kaderisasi pelan-pelan",
    excerpt: "Cara ngajak yang bikin orang mau, bukan karena nggak enak nolak.",
    cover: "https://picsum.photos/seed/gencar-artikel-7/700/480",
    tanggal: "2026-01-20",
    author: "Kaderisasi",
    kategori: "kisah",
  },
  {
    slug: "mc-acara-komunitas-yang-nggak-kaku",
    judul: "MC acara komunitas yang nggak kaku — ngobrol, bukan pidato",
    excerpt: "Teknik public speaking santai yang bikin audiens betah dengerin.",
    cover: "https://picsum.photos/seed/gencar-artikel-8/700/480",
    tanggal: "2026-01-14",
    author: "Tim Gencar",
    kategori: "info_kesehatan",
  },
  {
    slug: "kelola-kas-komunitas-transparan",
    judul: "Kelola kas komunitas biar transparan — template laporan keuangan",
    excerpt: "Pencatatan sederhana yang bikin semua anggota tau uangnya kemana.",
    cover: "https://picsum.photos/seed/gencar-artikel-9/700/480",
    tanggal: "2026-01-08",
    author: "Bendahara",
    kategori: "berita",
  },
  {
    slug: "dokumentasi-foto-yang-storytelling",
    judul: "Dokumentasi foto yang storytelling — bukan cuma foto bareng",
    excerpt: "Angle, momen, dan sequencing yang bikin foto kegiatan bercerita.",
    cover: "https://picsum.photos/seed/gencar-artikel-10/700/480",
    tanggal: "2026-01-02",
    author: "Kreatif Gencar",
    kategori: "tafsir",
  },
  {
    slug: "follow-up-setelah-kegiatan",
    judul: "Follow-up setelah kegiatan — biar nggak hilang momentum",
    excerpt: "Apa yang dilakuin 24 jam setelah acara biar efeknya nggak berhenti.",
    cover: "https://picsum.photos/seed/gencar-artikel-11/700/480",
    tanggal: "2025-12-22",
    author: "Tim Gencar",
    kategori: "tuntunan_ibadah",
  },
  {
    slug: "kolaborasi-antar-komunitas",
    judul: "Kolaborasi antar komunitas — saingan jadi barengan",
    excerpt: "Cara ngajak komunitas lain kerja bareng tanpa rebutan panggung.",
    cover: "https://picsum.photos/seed/gencar-artikel-12/700/480",
    tanggal: "2025-12-15",
    author: "Humas Gencar",
    kategori: "berita",
  },
];

export type PengurusLevel = "pimpinan" | "sekretariat" | "bidang" | "koordinator"
export type PubPengurus = { id?: string; nama: string; role: string; foto: string; level: PengurusLevel; bio?: string | null; kontakWa?: string | null; urutan?: number }
export const MOCK_PENGURUS: PubPengurus[] = [
  { id: "1", nama: "Fulan A", role: "Ketua Umum", foto: "https://picsum.photos/seed/pengurus-1/400/400", level: "pimpinan", bio: "Penanggung jawab harian — putuskan arah, jaga ritme kegiatan.", kontakWa: "6281230001000", urutan: 0 },
  { id: "2", nama: "Fulanah B", role: "Sekretaris", foto: "https://picsum.photos/seed/pengurus-2/400/400", level: "sekretariat", bio: "Arsip, surat, dan jadwal — yang bikin semua kebagian info.", urutan: 1 },
  { id: "3", nama: "Fulan C", role: "Bendahara", foto: "https://picsum.photos/seed/pengurus-3/400/400", level: "sekretariat", bio: "Kelola kas & laporan — transparan, tercatat.", urutan: 2 },
  { id: "4", nama: "Fulan D", role: "Kaderisasi", foto: "https://picsum.photos/seed/pengurus-4/400/400", level: "bidang", bio: "Rekrut, dampingi, dan rotasi panitia biar regenerasi jalan.", urutan: 0 },
  { id: "5", nama: "Fulan E", role: "Humas", foto: "https://picsum.photos/seed/pengurus-5/400/400", level: "bidang", bio: "Jembatan ke warga, kampus, dan media — ceritanya nyampe.", urutan: 1 },
  { id: "6", nama: "Fulan F", role: "Kreatif", foto: "https://picsum.photos/seed/pengurus-6/400/400", level: "bidang", bio: "Poster, foto, video — yang bikin kegiatan kelihatan, bukan cuma kedengeran.", urutan: 2 },
];

export type PubStory = { nama: string; peran: string; angkatan: string; foto: string; quote: string; konteks: string };
export const MOCK_STORIES: PubStory[] = [
  {
    nama: "Rafi — Peserta Sambung Rutin",
    peran: "Mahasiswa, Cengkareng Barat",
    angkatan: "Gabung 2024",
    foto: "https://picsum.photos/seed/story-rafi/400/400",
    quote: "Awalnya cuma diajak teman. Eh, yang bikin betah bukan materinya aja — tapi habis kajian ngobrolnya nyambung.",
    konteks: "Rafi sekarang jadi notulen tetap. Catatannya yang paling rapi — jadi arsip regenerasi.",
  },
  {
    nama: "Bu Siti — Warga RW 04",
    peran: "Ibu rumah tangga",
    angkatan: "Dukung sejak 2022",
    foto: "https://picsum.photos/seed/story-siti/400/400",
    quote: "Anak-anak Gencar itu kalau kerja bakti nggak setengah-setengah. Sampai selokan pun kinclong.",
    konteks: "Warga yang awalnya nonton dari teras, sekarang sediain es teh tiap kerja bakti.",
  },
  {
    nama: "Dimas — Koordinator Lapangan",
    peran: "Pengurus harian",
    angkatan: "Panitia sejak 2021",
    foto: "https://picsum.photos/seed/story-dimas/400/400",
    quote: "Sistem kecil yang jalan terus lebih penting dari acara besar yang sekali lalu hilang.",
    konteks: "Dimas yang bikin checklist panitia 1 halaman — dipakai sampai sekarang.",
  },
];

export const TENTANG_TIMELINE = [
  { year: "2019", title: "Ngumpul pertama", desc: "Berawal dari 12 orang di musala. Nggak ada nama, cuma niat: bikin wadah yang kepake." },
  { year: "2021", title: "Kegiatan rutin jalan", desc: "Sambung mingguan + kerja bakti bulanan. Absensi masih manual, dokumentasi pakai HP pinjam." },
  { year: "2024", title: "Etalase publik dibuka", desc: "Kegiatan yang layak publik mulai dikurasi. Foto jelas, cerita ditulis, bukan cuma di grup WA." },
  { year: "Sekarang", title: "Rumah yang kebuka", desc: "Siapa mau ikut tinggal datang. Siapa mau bantu tinggal ngobrol. Sesimpel itu." },
];

export const TENTANG_NILAI = [
  { title: "Terlihat, bukan terlihat keren", body: "Foto apa adanya, tanggal jelas, lokasi presisi. Kalau kegiatan beneran jalan, nggak perlu filter.", proof: "Lihat 48 kegiatan publik →", href: "/kegiatan" },
  { title: "Kecil yang jalan terus", body: "Checklist 1 halaman, rotasi panitia, arsip rapi. Sistem kecil > acara besar sekali lalu hilang.", proof: "Cara kita ngelola →", href: "/artikel" },
  { title: "Yang ngerjain, yang cerita", body: "Yang turun ke lapangan yang nulis laporannya. Jadi ceritanya nggak mengarang — kebaca jujurnya.", proof: "Baca cerita mereka →", href: "#cerita" },
];
