import { AVATARS } from "./avatarCatalog";

export type MemberIdentity = {
  id: string;
  nama: string;
  namaOrtu?: string | null;
  desa: string;
  kelompok: string;
  pendidikan: string;
  pekerjaan?: string | null;
  noTelp: string;
  kategoriMudaMudi: "pribumi" | "perantauan";
  asalDaerah: string | null;
  domisiliAnak: string;
  domisiliOrtu: string | null;
  isOrtuSama: boolean;
  foto?: string | null;
  /** Static avatar id e.g. genta-astro / caya-base (replaces DiceBear) */
  avatarId?: string | null;
  /** Avatar gender for picker filter */
  jenisKelamin?: "cowok" | "cewek" | null;
  /** @deprecated DiceBear avatar style key */
  avatarStyle?: string | null;
  /** @deprecated Seed for DiceBear */
  avatarSeed?: string | null;
  email?: string;
  nomorUnik?: string;
  status: "aktif" | "pending";
  /** Hobi — JSON array stringified or comma-separated list of HobbyKey */
  hobi?: string | null;
  /** Hobi custom teks bebas (untuk kategori "lainnya") */
  hobiCustom?: string | null;
  /** Detail per-hobi — JSON stringified Record<HobbyKey, string> */
  hobiDetail?: string | null;
  /** Timestamp terakhir kali hobi diubah */
  hobiUpdatedAt?: string | null;
};

export type MemberKehadiran = {
  total: number;
  hadir: number;
  izin: number;
  alpha: number;
  hadirRate: number;
  telat?: number;
  rataRataTelatMenit?: number;
  riwayatTelat?: { tanggal: string; judul: string; menit: number; bulan?: number; tahun?: number; jamAbsen?: string; jamKegiatan?: string }[];
  tren: { label: string; hadir: number; izin: number; alpha: number; telat?: number }[];
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
  hobi: '["olahraga","traveling"]',
  hobiCustom: null,
  hobiDetail: null,
};

export const DEMO_KEHADIRAN: MemberKehadiran = {
  total: 18,
  hadir: 14,
  izin: 3,
  alpha: 1,
  hadirRate: 78,
  telat: 24,
  rataRataTelatMenit: 16,
  riwayatTelat: [
    { tanggal: "07 Mei", judul: "Sambung Muda-Mudi", menit: 12, bulan: 4, tahun: 2026 },
    { tanggal: "28 Apr", judul: "Materi Pra-Nikah", menit: 10, bulan: 3, tahun: 2026 },
    { tanggal: "14 Apr", judul: "Pengajian Rutin", menit: 20, bulan: 3, tahun: 2026 },
    { tanggal: "09 Apr", judul: "Sambung Kelompok Fajar C", menit: 8, bulan: 3, tahun: 2026 },
    { tanggal: "02 Apr", judul: "Keakraban: Futsal Bareng", menit: 18, bulan: 3, tahun: 2026 },
    { tanggal: "28 Mar", judul: "Kajian Tematik Generus", menit: 25, bulan: 2, tahun: 2026 },
    { tanggal: "21 Mar", judul: "Musyawarah Daerah", menit: 14, bulan: 2, tahun: 2026 },
    { tanggal: "15 Mar", judul: "Sambung Gabungan Cengkareng", menit: 15, bulan: 2, tahun: 2026 },
    { tanggal: "08 Mar", judul: "Pengajian Wilayah", menit: 8, bulan: 2, tahun: 2026 },
    { tanggal: "02 Mar", judul: "Pemantapan Pra-Nikah Lanjut", menit: 22, bulan: 2, tahun: 2026 },
    { tanggal: "25 Feb", judul: "Sambung Muda-Mudi Rutin", menit: 11, bulan: 1, tahun: 2026 },
    { tanggal: "18 Feb", judul: "Futsal Bareng Generus", menit: 9, bulan: 1, tahun: 2026 },
    { tanggal: "11 Feb", judul: "Materi Pra-Nikah Sesi 2", menit: 17, bulan: 1, tahun: 2026 },
    { tanggal: "04 Feb", judul: "Pengajian Rutin Kamis", menit: 13, bulan: 1, tahun: 2026 },
    { tanggal: "28 Jan", judul: "Kajian Rutin Malam", menit: 19, bulan: 0, tahun: 2026 },
    { tanggal: "21 Jan", judul: "Musyawarah Kelompok", menit: 25, bulan: 0, tahun: 2026 },
    { tanggal: "15 Jan", judul: "Sambung Gabungan Wilayah", menit: 7, bulan: 0, tahun: 2026 },
    { tanggal: "08 Jan", judul: "Pengajian Wilayah Barat", menit: 12, bulan: 0, tahun: 2026 },
    { tanggal: "03 Jan", judul: "Tadarus Bersama", menit: 16, bulan: 0, tahun: 2026 },
    { tanggal: "27 Des", judul: "Sambung Akhir Tahun", menit: 30, bulan: 11, tahun: 2025 },
    { tanggal: "20 Des", judul: "Evaluasi Generus", menit: 14, bulan: 11, tahun: 2025 },
    { tanggal: "13 Des", judul: "Latihan Hadroh", menit: 9, bulan: 11, tahun: 2025 },
    { tanggal: "06 Des", judul: "Bakti Sosial Generus", menit: 22, bulan: 11, tahun: 2025 },
    { tanggal: "29 Nov", judul: "Pengajian Akbar", menit: 18, bulan: 10, tahun: 2025 },
  ],
  tren: [
    { label: "Jan", hadir: 4, izin: 1, alpha: 0, telat: 5 },
    { label: "Feb", hadir: 5, izin: 0, alpha: 1, telat: 4 },
    { label: "Mar", hadir: 3, izin: 2, alpha: 0, telat: 6 },
    { label: "Apr", hadir: 2, izin: 0, alpha: 0, telat: 5 },
  ],
};

/* ─── Hobi taxonomy ────────────────────────────────────────────────── */
export const HOBBY_KEYS = ["olahraga", "traveling", "seni", "musik", "kuliner", "teknologi", "literasi", "gaming", "lainnya"] as const;
export type HobbyKey = (typeof HOBBY_KEYS)[number];

export const HOBBY_META: Record<HobbyKey, { label: string; color: string; bg: string; icon: string }> = {
  olahraga:  { label: "Olahraga",           color: "#16a34a", bg: "#f0fdf4", icon: "mdi:volleyball" },
  traveling: { label: "Traveling",          color: "#0ea5e9", bg: "#f0f9ff", icon: "mdi:airplane" },
  seni:      { label: "Seni & Kreativitas", color: "#9333ea", bg: "#faf5ff", icon: "mdi:palette" },
  musik:     { label: "Musik",              color: "#db2777", bg: "#fdf2f8", icon: "mdi:music" },
  kuliner:   { label: "Kuliner",            color: "#ea580c", bg: "#fff7ed", icon: "mdi:chef-hat" },
  teknologi: { label: "Teknologi",          color: "#2563eb", bg: "#eff6ff", icon: "mdi:laptop" },
  literasi:  { label: "Literasi",           color: "#d97706", bg: "#fffbeb", icon: "mdi:book-open-page-variant" },
  gaming:    { label: "Gaming",             color: "#64748b", bg: "#f8fafc", icon: "mdi:gamepad-variant" },
  lainnya:   { label: "Lainnya",            color: "#94a3b8", bg: "#f8fafc", icon: "mdi:sparkles" },
};

export const HOBBY_DETAIL_PLACEHOLDER: Record<HobbyKey, string> = {
  olahraga: "Contoh: Futsal, Badminton, Lari…",
  traveling: "Contoh: Camping, Healing, Jalan-jalan…",
  seni: "Contoh: Lukis, Desain, Fotografi…",
  musik: "Contoh: Hadroh, Gitar, Vokal…",
  kuliner: "Contoh: Masak, Jajan, Kopi…",
  teknologi: "Contoh: Coding, Robotik, AI…",
  literasi: "Contoh: Baca novel, Menulis, Diskusi buku…",
  gaming: "Contoh: Mobile Legends, Valorant…",
  lainnya: "Tulis hobi lainnya…",
};

export function parseHobi(hobi: string | null | undefined): Set<HobbyKey> {
  if (!hobi) return new Set();
  const raw = hobi.trim();
  if (!raw) return new Set();
  let arr: string[] = [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed.map(String);
      else arr = raw.split(/[,;|]/);
    } catch {
      arr = raw.split(/[,;|]/);
    }
  } else {
    arr = raw.split(/[,;|]/);
  }
  const set = new Set<HobbyKey>();
  for (const s of arr) {
    const k = s.trim().toLowerCase() as HobbyKey;
    if ((HOBBY_KEYS as readonly string[]).includes(k)) set.add(k);
  }
  return set;
}

export function serializeHobi(keys: HobbyKey[]): string {
  return JSON.stringify(keys);
}

export function parseHobiDetail(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  const s = raw.trim();
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, string>;
  } catch {}
  return {};
}

export function serializeHobiDetail(detail: Record<string, string>): string | null {
  const entries = Object.entries(detail).filter(([, v]) => v?.trim());
  if (entries.length === 0) return null;
  return JSON.stringify(Object.fromEntries(entries));
}

/* ─── Achievement System ─────────────────────────────────────────────── */

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type AchievementCategory = "kehadiran" | "streak" | "ketepatan" | "kegiatan" | "profil";

export type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
};

export type AchievementState = AchievementDef & {
  unlocked: boolean;
  progress: number;   // 0-1
  current: number;
  target: number;
  unlockedAt?: string; // ISO date
};

export const RARITY_META: Record<AchievementRarity, { label: string; color: string; bg: string; border: string; glow: string }> = {
  common:    { label: "Common",    color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", glow: "#94a3b833" },
  uncommon:  { label: "Uncommon",  color: "#16a34a", bg: "#f0fdf4", border: "#86efac", glow: "#22c55e33" },
  rare:      { label: "Rare",      color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", glow: "#3b82f633" },
  epic:      { label: "Epic",      color: "#9333ea", bg: "#faf5ff", border: "#d8b4fe", glow: "#a855f733" },
  legendary: { label: "Legendary", color: "#d97706", bg: "#fffbeb", border: "#fcd34d", glow: "#f59e0b33" },
  mythic:    { label: "Mythic",    color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", glow: "#ef444433" },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Kehadiran (8) ──
  { id: "pertama_kali",   name: "Langkah Pertama",  desc: "Absen pertama kali",                     icon: "mdi:foot-print",            category: "kehadiran",  rarity: "common" },
  { id: "hadir_5",        name: "Rajin",            desc: "Hadir 5× total",                         icon: "mdi:account-check",         category: "kehadiran",  rarity: "common" },
  { id: "hadir_10",       name: "Penuh Semangat",   desc: "Hadir 10× total",                        icon: "mdi:account-group",         category: "kehadiran",  rarity: "common" },
  { id: "hadir_25",       name: "Sulung",           desc: "Hadir 25× total",                        icon: "mdi:shield-star",           category: "kehadiran",  rarity: "uncommon" },
  { id: "hadir_50",       name: "Veteran",          desc: "Hadir 50× total",                        icon: "mdi:medal",                category: "kehadiran",  rarity: "rare" },
  { id: "hadir_100",      name: "Centurion",        desc: "Hadir 100× total",                       icon: "mdi:emoticon-cool",         category: "kehadiran",  rarity: "epic" },
  { id: "hadir_150",      name: "Majestic",         desc: "Hadir 150× total",                       icon: "mdi:crown",                category: "kehadiran",  rarity: "legendary" },
  { id: "hadir_200",      name: "Abadi",            desc: "Hadir 200× total",                       icon: "mdi:infinity",             category: "kehadiran",  rarity: "legendary" },

  // ── Streak (8) ──
  { id: "streak_5",       name: "Menyala",          desc: "Streak beruntun 5×",                     icon: "mdi:fire",                 category: "streak",     rarity: "common" },
  { id: "streak_10",      name: "Konsisten",        desc: "Streak beruntun 10×",                    icon: "mdi:fire",                 category: "streak",     rarity: "uncommon" },
  { id: "streak_20",      name: "On Fire",          desc: "Streak beruntun 20×",                    icon: "mdi:fire",                 category: "streak",     rarity: "rare" },
  { id: "streak_40",      name: "Legenda",          desc: "Streak beruntun 40×",                    icon: "mdi:fire",                 category: "streak",     rarity: "legendary" },
  { id: "streak_75",      name: "Tak Terbendung",   desc: "Streak beruntun 75×",                    icon: "mdi:fire",                 category: "streak",     rarity: "legendary" },
  { id: "streak_100",     name: "Dewa Streak",      desc: "Streak beruntun 100×",                   icon: "mdi:fire",                 category: "streak",     rarity: "mythic" },
  { id: "streak_reset",   name: "Bangkit dari Abu", desc: "Streak reset lalu capai 5× lagi",        icon: "mdi:phoenix",              category: "streak",     rarity: "uncommon" },
  { id: "streak_salvage", name: "Penyelamat",       desc: "Streak 4× lalu hadir tepat waktu",        icon: "mdi:lifebuoy",             category: "streak",     rarity: "rare" },

  // ── Ketepatan Waktu (8) ──
  { id: "zero_telat",     name: "Tepat Waktu",      desc: "0 keterlambatan tercatat",               icon: "mdi:clock-check",          category: "ketepatan",  rarity: "common" },
  { id: "zero_telat_25",  name: "Presisi",          desc: "25× hadir tanpa telat",                  icon: "mdi:clock-check",          category: "ketepatan",  rarity: "uncommon" },
  { id: "zero_telat_50",  name: "Jam",              desc: "50× hadir tanpa telat",                  icon: "mdi:clock-check",          category: "ketepatan",  rarity: "rare" },
  { id: "zero_telat_100", name: "Sempurna",         desc: "100× hadir tanpa telat",                 icon: "mdi:clock-check",          category: "ketepatan",  rarity: "epic" },
  { id: "first_late",     name: "Terlambat Sedikit",desc: "Pertama kali terlambat",                 icon: "mdi:clock-alert",          category: "ketepatan",  rarity: "common" },
  { id: "telat_5",        name: "Agak Telat",       desc: "5× keterlambatan",                       icon: "mdi:clock-alert",          category: "ketepatan",  rarity: "uncommon" },
  { id: "telat_10",       name: "Chronic",          desc: "10× keterlambatan",                      icon: "mdi:clock-alert",          category: "ketepatan",  rarity: "rare" },
  { id: "overcome_late",  name: "Maafkan Diri",     desc: "Setelah ≥3 telat, hadir 10× tanpa telat",icon: "mdi:heart-pulse",          category: "ketepatan",  rarity: "epic" },

  // ── Kegiatan (12) ──
  { id: "double_duty",    name: "Double Duty",      desc: "Hadir 2× di hari yang sama",             icon: "mdi:calendar-check",       category: "kegiatan",   rarity: "common" },
  { id: "siang_malam",    name: "Siang-Malam",      desc: "Absen siang + malam di hari yang sama",  icon: "mdi:weather-sunset",       category: "kegiatan",   rarity: "uncommon" },
  { id: "jelajah_lokasi", name: "Jelajah Lokasi",   desc: "Hadir di 5 lokasi berbeda",              icon: "mdi:map-marker-distance",  category: "kegiatan",   rarity: "epic" },
  { id: "tingkat_kelompok", name: "Kelompok",       desc: "Hadir di kegiatan tingkat kelompok",      icon: "mdi:home-group",           category: "kegiatan",   rarity: "common" },
  { id: "tingkat_desa",   name: "Desa",             desc: "Hadir di kegiatan tingkat desa",          icon: "mdi:home-city",            category: "kegiatan",   rarity: "common" },
  { id: "tingkat_daerah", name: "Daerah",           desc: "Hadir di kegiatan tingkat daerah",        icon: "mdi:map-marker-radius",    category: "kegiatan",   rarity: "common" },
  { id: "izin_pertama",   name: "Izin Resmi",       desc: "Pertama kali mengajukan izin",           icon: "mdi:clipboard-check",      category: "kegiatan",   rarity: "common" },
  { id: "pagi_early",     name: "Pagi Hari",        desc: "Absen sebelum jam 07:00",                icon: "mdi:weather-sunset-up",    category: "kegiatan",   rarity: "common" },
  { id: "absen_weekend",  name: "Akhir Pekan",      desc: "Hadir di kegiatan weekend",              icon: "mdi:calendar-weekend",     category: "kegiatan",   rarity: "uncommon" },
  { id: "consec_3",       name: "3 Hari Berturut",  desc: "Hadir 3 hari berturut-turut",            icon: "mdi:calendar-check",       category: "kegiatan",   rarity: "common" },
  { id: "consec_7",       name: "Seminggu Penuh",   desc: "Hadir 7 hari berturut-turut",            icon: "mdi:calendar-week",        category: "kegiatan",   rarity: "uncommon" },
  { id: "legenda_waktu",  name: "Legenda Waktu",    desc: "Lengkapi 4 slot: Pagi/Siang/Sore/Malam", icon: "mdi:clock-time-four",      category: "kegiatan",   rarity: "legendary" },

  // ── Profil (8 + 8 hobby specific Duo) ──
  { id: "hobi_isi",       name: "Punya Hobi",       desc: "Isi minimal 1 hobi di profil",           icon: "mdi:heart",                category: "profil",     rarity: "common" },
  { id: "avatar_custom",  name: "Tampil Beda",       desc: "Ganti avatar dari default",              icon: "mdi:face-man",             category: "profil",     rarity: "common" },
  { id: "avatar_legend",  name: "Kolektor Avatar",   desc: "Buka minimal 20 avatar",                 icon: "mdi:face-man-profile",     category: "profil",     rarity: "uncommon" },
  { id: "qr_download",    name: "QR Master",         desc: "Download QR identity card",              icon: "mdi:qrcode",               category: "profil",     rarity: "common" },
  { id: "domisili_match", name: "Setia Kampung",     desc: "Domisili anak = domisili ortu",          icon: "mdi:home-heart",           category: "profil",     rarity: "common" },
  { id: "penjelajah",     name: "Penjelajah",        desc: "Merantau jauh dari kampung halaman",    icon: "mdi:sail-boat",            category: "profil",     rarity: "common" },
  { id: "hobi_kolektor",  name: "Kolektor Hobi",     desc: "Koleksi 3 tipe hobi berbeda",            icon: "mdi:palette",              category: "profil",     rarity: "uncommon" },
  { id: "tampil_kece",    name: "Tampil Kece",       desc: "Upload foto profil custom",              icon: "mdi:camera",               category: "profil",     rarity: "common" },
  // ── Hobi Specific — semua Duo ──
  { id: "hobi_olahraga",  name: "Atlet GENCAR",     desc: "Hobi Olahraga",                          icon: "mdi:volleyball",           category: "profil",     rarity: "common" },
  { id: "hobi_traveling", name: "Petualang",        desc: "Hobi Traveling",                         icon: "mdi:airplane",             category: "profil",     rarity: "common" },
  { id: "hobi_seni",      name: "Seniman",          desc: "Hobi Seni & Kreativitas",                icon: "mdi:palette",              category: "profil",     rarity: "common" },
  { id: "hobi_musik",     name: "Musisi",           desc: "Hobi Musik",                             icon: "mdi:music",                category: "profil",     rarity: "common" },
  { id: "hobi_kuliner",   name: "Foodie",           desc: "Hobi Kuliner",                           icon: "mdi:chef-hat",             category: "profil",     rarity: "common" },
  { id: "hobi_teknologi", name: "Tekno",            desc: "Hobi Teknologi",                         icon: "mdi:laptop",               category: "profil",     rarity: "common" },
  { id: "hobi_literasi",  name: "Kutu Buku",        desc: "Hobi Literasi",                          icon: "mdi:book-open-page-variant", category: "profil",   rarity: "common" },
  { id: "hobi_gaming",    name: "Gamer",            desc: "Hobi Gaming",                            icon: "mdi:gamepad-variant",      category: "profil",     rarity: "common" },
];

export const CATEGORY_META: Record<AchievementCategory, { label: string; icon: string; color: string }> = {
  kehadiran: { label: "Kehadiran",  icon: "mdi:calendar-check",    color: "#d03804" },
  streak:    { label: "Streak",     icon: "mdi:fire",              color: "#f59e0b" },
  ketepatan: { label: "Ketepatan",  icon: "mdi:clock-check",       color: "#0ea5e9" },
  kegiatan:  { label: "Kegiatan",   icon: "mdi:shape",             color: "#16a34a" },
  profil:    { label: "Profil",     icon: "mdi:account-details",   color: "#8b5cf6" },
};

/* ─── Achievement computation helper ────────────────────────────────── */

export type AchievementInput = {
  kehadiran: MemberKehadiran;
  identity: MemberIdentity;
  /** Kegiatan history (for kategori/tingkat checks). */
  kegiatan?: MemberKegiatan[];
  /** How many times avatar was changed (persisted elsewhere). */
  avatarChanges?: number;
  /** Whether QR was ever downloaded. */
  qrDownloaded?: boolean;
  /** Whether streak ever reset. */
  everReset?: boolean;
  /** Whether a near-reset was saved (streak 4 → hadir on time). */
  everSaved?: boolean;
};

export function computeAchievements(input: AchievementInput): AchievementState[] {
  const { kehadiran: k, identity: me, kegiatan: kg = [] } = input;
  const streak = computeStreak(k);
  const zeroLateCount = Math.max(0, k.hadir - (k.telat ?? 0));
  const hasKelompok = kg.some((g) => g.statusAbsen === "hadir" && g.tingkat === "kelompok");
  const hasDesa = kg.some((g) => g.statusAbsen === "hadir" && g.tingkat === "desa");
  const hasDaerah = kg.some((g) => g.statusAbsen === "hadir" && g.tingkat === "daerah");
  const domisiliMatch = me.isOrtuSama || (Boolean(me.domisiliOrtu) && me.domisiliOrtu === me.domisiliAnak);
  const hobiSet = parseHobi(me.hobi);

  const eval_ = (def: AchievementDef, current: number, target: number): AchievementState => ({
    ...def,
    unlocked: current >= target,
    progress: Math.min(1, current / target),
    current,
    target,
  });

  // Precompute kegiatan time-based achievements
  const hadirKg = kg.filter((g) => g.statusAbsen === "hadir");
  // double_duty: 2 hadir same tanggal
  const tanggalCount = new Map<string, number>();
  for (const g of hadirKg) tanggalCount.set(g.tanggal, (tanggalCount.get(g.tanggal) ?? 0) + 1);
  void [...tanggalCount.values()].some((c) => c >= 2);
  const maxDoubleDuty = Math.max(0, ...[...tanggalCount.values()], 0);

  // siang_malam: same tanggal has siang (10-14:59) and malam (18-03:59)
  const tanggalSlots = new Map<string, Set<string>>();
  for (const g of hadirKg) {
    if (!g.jam) continue;
    const slot = getTimeSlot(g.jam);
    if (!slot) continue;
    // categorize as siang vs malam for this achievement
    const cat = slot === "siang" ? "siang" : slot === "malam" ? "malam" : null;
    if (!cat) continue;
    if (!tanggalSlots.has(g.tanggal)) tanggalSlots.set(g.tanggal, new Set());
    tanggalSlots.get(g.tanggal)!.add(cat);
  }
  const hasSiangMalam = [...tanggalSlots.values()].some((s) => s.has("siang") && s.has("malam"));

  // jelajah_lokasi: distinct lokasi
  const lokasiSet = new Set(hadirKg.filter((g) => g.lokasi?.trim()).map((g) => g.lokasi!.toLowerCase().trim()));

  // legenda_waktu: 4 slots
  const allSlots = new Set<string>();
  for (const g of hadirKg) {
    if (!g.jam) continue;
    const slot = getTimeSlot(g.jam);
    if (slot) allSlots.add(slot);
  }

  return ACHIEVEMENTS.map((def) => {
    switch (def.id) {
      // Kehadiran
      case "pertama_kali":   return eval_(def, k.hadir, 1);
      case "hadir_5":        return eval_(def, k.hadir, 5);
      case "hadir_10":       return eval_(def, k.hadir, 10);
      case "hadir_25":       return eval_(def, k.hadir, 25);
      case "hadir_50":       return eval_(def, k.hadir, 50);
      case "hadir_100":      return eval_(def, k.hadir, 100);
      case "hadir_150":      return eval_(def, k.hadir, 150);
      case "hadir_200":      return eval_(def, k.hadir, 200);

      // Streak
      case "streak_5":       return eval_(def, streak, 5);
      case "streak_10":      return eval_(def, streak, 10);
      case "streak_20":      return eval_(def, streak, 20);
      case "streak_40":      return eval_(def, streak, 40);
      case "streak_75":      return eval_(def, streak, 75);
      case "streak_100":     return eval_(def, streak, 100);
      case "streak_reset":   return eval_(def, input.everReset ? 1 : 0, 1);
      case "streak_salvage": return eval_(def, input.everSaved ? 1 : 0, 1);

      // Ketepatan
      case "zero_telat":     return eval_(def, (k.telat ?? 0) === 0 ? k.hadir : 0, 1);
      case "zero_telat_25":  return eval_(def, zeroLateCount, 25);
      case "zero_telat_50":  return eval_(def, zeroLateCount, 50);
      case "zero_telat_100": return eval_(def, zeroLateCount, 100);
      case "first_late":     return eval_(def, k.telat ?? 0, 1);
      case "telat_5":        return eval_(def, k.telat ?? 0, 5);
      case "telat_10":       return eval_(def, k.telat ?? 0, 10);
      case "overcome_late":  return eval_(def, (k.telat ?? 0) >= 3 && zeroLateCount >= 10 ? 1 : 0, 1);

      // Kegiatan
      case "double_duty":    return eval_(def, maxDoubleDuty, 2);
      case "siang_malam":    return eval_(def, hasSiangMalam ? 1 : 0, 1);
      case "jelajah_lokasi": return eval_(def, lokasiSet.size, 5);
      case "tingkat_kelompok": return eval_(def, hasKelompok ? 1 : 0, 1);
      case "tingkat_desa":   return eval_(def, hasDesa ? 1 : 0, 1);
      case "tingkat_daerah": return eval_(def, hasDaerah ? 1 : 0, 1);
      case "izin_pertama":   return eval_(def, k.izin, 1);
      case "pagi_early":     return eval_(def, kg.filter((g) => g.statusAbsen === "hadir" && g.jam && g.jam < "07:00").length, 1);
      case "absen_weekend":  return eval_(def, kg.filter((g) => g.statusAbsen === "hadir" && isWeekend(g.tanggal)).length, 1);
      case "consec_3":       return eval_(def, computeConsecDays(k), 3);
      case "consec_7":       return eval_(def, computeConsecDays(k), 7);
      case "legenda_waktu":  return eval_(def, allSlots.size, 4);

      // Profil
      case "hobi_isi":       return eval_(def, hobiSet.size, 1);
      case "avatar_custom":  return eval_(def, (me.avatarId && me.avatarId !== "genta-base" && me.avatarId !== "caya-base") || (me.avatarStyle && me.avatarStyle !== "initials") ? 1 : 0, 1);
      case "avatar_legend":  {
        // Hitung total avatar yang terbuka untuk gender anggota
        const gender = me.jenisKelamin === "cewek" || (me.avatarId && me.avatarId.startsWith("caya-")) ? "cewek" : "cowok";
        const myAvatars = (AVATARS || []).filter((a: any) => a.gender === gender);
        let unlockedCount = 0;
        for (const av of myAvatars) {
          if (!av.need) { unlockedCount++; }
          else if (av.need === "pertama_kali" && k.hadir >= 1) { unlockedCount++; }
          else if (av.need === "hadir_5" && k.hadir >= 5) { unlockedCount++; }
          else if (av.need === "hadir_10" && k.hadir >= 10) { unlockedCount++; }
          else if (av.need === "hadir_25" && k.hadir >= 25) { unlockedCount++; }
          else if (av.need === "hadir_50" && k.hadir >= 50) { unlockedCount++; }
          else if (av.need === "hadir_100" && k.hadir >= 100) { unlockedCount++; }
          else if (av.need === "hadir_150" && k.hadir >= 150) { unlockedCount++; }
          else if (av.need === "hadir_200" && k.hadir >= 200) { unlockedCount++; }
          else if (av.need === "streak_5" && streak >= 5) { unlockedCount++; }
          else if (av.need === "streak_10" && streak >= 10) { unlockedCount++; }
          else if (av.need === "streak_20" && streak >= 20) { unlockedCount++; }
          else if (av.need === "streak_40" && streak >= 40) { unlockedCount++; }
          else if (av.need === "streak_75" && streak >= 75) { unlockedCount++; }
          else if (av.need === "streak_100" && streak >= 100) { unlockedCount++; }
          else if (av.need === "zero_telat" && (k.telat ?? 0) === 0 && k.hadir > 0) { unlockedCount++; }
          else if (av.need === "zero_telat_25" && zeroLateCount >= 25) { unlockedCount++; }
          else if (av.need === "zero_telat_50" && zeroLateCount >= 50) { unlockedCount++; }
          else if (av.need === "zero_telat_100" && zeroLateCount >= 100) { unlockedCount++; }
          else if (av.need === "hobi_isi" && hobiSet.size >= 1) { unlockedCount++; }
          else if (av.need.startsWith("hobi_") && hobiSet.has(av.need.replace("hobi_", "") as HobbyKey)) { unlockedCount++; }
          else if (av.need === "avatar_custom" && ((me.avatarId && me.avatarId !== "genta-base" && me.avatarId !== "caya-base") || (me.avatarStyle && me.avatarStyle !== "initials"))) { unlockedCount++; }
          else if (av.need === "qr_download" && input.qrDownloaded) { unlockedCount++; }
          else if (av.need === "domisili_match" && domisiliMatch) { unlockedCount++; }
          else if (av.need === "penjelajah" && !domisiliMatch && me.kategoriMudaMudi === "perantauan") { unlockedCount++; }
          else if (av.need === "tingkat_kelompok" && hasKelompok) { unlockedCount++; }
          else if (av.need === "tingkat_desa" && hasDesa) { unlockedCount++; }
          else if (av.need === "tingkat_daerah" && hasDaerah) { unlockedCount++; }
          else if (av.need === "absen_weekend" && kg.some((g) => g.statusAbsen === "hadir" && isWeekend(g.tanggal))) { unlockedCount++; }
          else if (av.need === "consec_3" && computeConsecDays(k) >= 3) { unlockedCount++; }
          else if (av.need === "consec_7" && computeConsecDays(k) >= 7) { unlockedCount++; }
          else if (av.need === "jelajah_lokasi" && lokasiSet.size >= 5) { unlockedCount++; }
          else if (av.need === "legenda_waktu" && allSlots.size >= 4) { unlockedCount++; }
        }
        return eval_(def, unlockedCount, 20);
      }
      case "qr_download":    return eval_(def, input.qrDownloaded ? 1 : 0, 1);
      case "domisili_match": return eval_(def, domisiliMatch ? 1 : 0, 1);
      case "penjelajah":     return eval_(def, !domisiliMatch && me.kategoriMudaMudi === "perantauan" ? 1 : 0, 1);
      case "hobi_kolektor":  return eval_(def, hobiSet.size, 3);
      case "tampil_kece":    return eval_(def, me.foto && String(me.foto).trim() !== "" ? 1 : 0, 1);
      // Hobi specific — Duo (per tipe)
      case "hobi_olahraga":  return eval_(def, hobiSet.has("olahraga") ? 1 : 0, 1);
      case "hobi_traveling": return eval_(def, hobiSet.has("traveling") ? 1 : 0, 1);
      case "hobi_seni":      return eval_(def, hobiSet.has("seni") ? 1 : 0, 1);
      case "hobi_musik":     return eval_(def, hobiSet.has("musik") ? 1 : 0, 1);
      case "hobi_kuliner":   return eval_(def, hobiSet.has("kuliner") ? 1 : 0, 1);
      case "hobi_teknologi": return eval_(def, hobiSet.has("teknologi") ? 1 : 0, 1);
      case "hobi_literasi":  return eval_(def, hobiSet.has("literasi") ? 1 : 0, 1);
      case "hobi_gaming":    return eval_(def, hobiSet.has("gaming") ? 1 : 0, 1);
      default: return eval_(def, 0, 1);
    }
  });
}

function computeStreak(k: MemberKehadiran): number {
  let s = 0;
  for (let i = k.tren.length - 1; i >= 0; i--) {
    const m = k.tren[i]!;
    if (m.hadir > 0) s += m.hadir;
    else if (m.alpha > 0) break;
    else if (m.izin > 0) break;
  }
  return s;
}

function computeConsecDays(k: MemberKehadiran): number {
  // Approximate: sum consecutive monthly hadir from latest
  let c = 0;
  for (let i = k.tren.length - 1; i >= 0; i--) {
    if (k.tren[i]!.hadir > 0) c += k.tren[i]!.hadir;
    else break;
  }
  return c;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

function getTimeSlot(jam: string): "pagi" | "siang" | "sore" | "malam" | null {
  if (!jam || !jam.includes(":")) return null;
  const h = parseInt(jam.split(":")[0]!, 10);
  if (isNaN(h)) return null;
  if (h >= 4 && h < 10) return "pagi";
  if (h >= 10 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam"; // 18-03:59
}

export type MemberKegiatan = {
  id: string;
  judul: string;
  kategori?: string;
  tingkat?: string;
  tanggal: string;
  tanggalSelesai?: string | null;
  jam: string;
  jamMulai?: string | null;
  jamSelesai?: string | null;
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
