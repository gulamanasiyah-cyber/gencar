export type MemberIdentity = {
  id: string;
  nama: string;
  desa: string;
  kelompok: string;
  pendidikan: string;
  noTelp: string;
  kategoriMudaMudi: "pribumi" | "perantauan";
  asalDaerah: string | null;
  domisiliAnak: string;
  domisiliOrtu: string | null;
  isOrtuSama: boolean;
  foto?: string | null;
  nomorUnik?: string;
  status: "aktif" | "pending";
};

export type MemberKehadiran = {
  total: number;
  hadir: number;
  izin: number;
  alpha: number;
  hadirRate: number;
  tren: { label: string; hadir: number; izin: number; alpha: number }[];
};

export const DEMO_SELF: MemberIdentity = {
  id: "m_self",
  nama: "Fajar Pratama",
  desa: "Fajar",
  kelompok: "Fajar C",
  pendidikan: "SMA",
  noTelp: "081234509999",
  kategoriMudaMudi: "pribumi",
  asalDaerah: null,
  domisiliAnak: "Jl. Fajar No 12, RT 02/RW 05",
  domisiliOrtu: null,
  isOrtuSama: true,
  foto: null,
  nomorUnik: "JB2-2026-0042",
  status: "aktif",
};

export const DEMO_KEHADIRAN: MemberKehadiran = {
  total: 18,
  hadir: 14,
  izin: 3,
  alpha: 1,
  hadirRate: 78,
  tren: [
    { label: "Jan", hadir: 4, izin: 1, alpha: 0 },
    { label: "Feb", hadir: 5, izin: 0, alpha: 1 },
    { label: "Mar", hadir: 3, izin: 2, alpha: 0 },
    { label: "Apr", hadir: 2, izin: 0, alpha: 0 },
  ],
};

export type MemberKegiatan = {
  id: string;
  judul: string;
  kategori?: string;
  tingkat?: string;
  tanggal: string;
  jam: string;
  lokasi: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  statusAbsen?: "hadir" | "izin" | "alpha" | null;
};

export const DEMO_KEGIATAN_MEMBER: MemberKegiatan[] = [
  { id: "k1", judul: "Sambung Muda-Mudi Kelompok Fajar C", tanggal: "2026-05-08", jam: "19:30", lokasi: "Masjid Fajar", lat: -6.14, lng: 106.7, radiusM: 100 },
  { id: "k2", judul: "Keakraban: Futsal Bareng", tanggal: "2026-05-09", jam: "08:00", lokasi: "Lapangan Duri", lat: -6.141, lng: 106.705, radiusM: 120 },
  { id: "k3", judul: "Pemantapan Materi Pra-Nikah", tanggal: "2026-05-10", jam: "13:00", lokasi: "Aula Daerah Cengkareng", lat: null, lng: null, radiusM: 100 },
];
