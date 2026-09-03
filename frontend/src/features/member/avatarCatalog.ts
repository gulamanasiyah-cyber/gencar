import type { AchievementState } from "./types";
import type { MemberIdentity } from "./types";

export type AvatarGender = "cowok" | "cewek";

export type AvatarDef = {
  id: string;
  label: string;
  gender: AvatarGender;
  file: string;
  /** achievement id that unlocks this avatar (or special handling) */
  need: string | null;
  needLabel: string;
  desc: string;
};

// 52 PNG in frontend/public/avatars (C:\Users\user\Downloads\gencar_avatar — 26 caya + 26 genta)
export const AVATARS: AvatarDef[] = [
  // ── DEFAULT (free) ──
  { id: "genta-base", label: "Genta Base", gender: "cowok", file: "genta-base.webp", need: null, needLabel: "Gratis", desc: "Peci hitam koko cream" },
  { id: "caya-base", label: "Cahya Base", gender: "cewek", file: "caya-base.webp", need: null, needLabel: "Gratis", desc: "Hijab dusty pink gamis cream" },

  // ── Common — easy first unlocks ──
  { id: "genta-bear", label: "Beruang", gender: "cowok", file: "genta-bear.webp", need: "avatar_custom", needLabel: "Tampil Beda", desc: "Onesie beruang coklat" },
  { id: "caya-bear", label: "Beruang", gender: "cewek", file: "caya-bear.webp", need: "avatar_custom", needLabel: "Tampil Beda", desc: "Onesie beruang pink" },

  { id: "genta-alien", label: "Alien", gender: "cowok", file: "genta-alien.webp", need: "streak_5", needLabel: "Menyala 5×", desc: "Alien hijau antena + UFO" },
  { id: "caya-alien", label: "Alien", gender: "cewek", file: "caya-alien.webp", need: "streak_5", needLabel: "Menyala 5×", desc: "Alien pink antena" },

  { id: "genta-pirate", label: "Pirate", gender: "cowok", file: "genta-pirate.webp", need: "streak_reset", needLabel: "Bangkit dari Abu", desc: "Bajak laut topi tengkorak" },
  { id: "caya-pirate", label: "Pirate", gender: "cewek", file: "caya-pirate.webp", need: "streak_reset", needLabel: "Bangkit dari Abu", desc: "Bajak laut bandana" },

  { id: "genta-ninja", label: "Ninja", gender: "cowok", file: "genta-ninja.webp", need: "streak_10", needLabel: "Konsisten 10×", desc: "Ninja hitam shuriken" },
  { id: "caya-ninja", label: "Kunoichi", gender: "cewek", file: "caya-ninja.webp", need: "streak_10", needLabel: "Konsisten 10×", desc: "Kunoichi hijab hitam" },

  // ── Hobi-gated (isi hobi → unlock) ──
  { id: "genta-sport", label: "Atlet", gender: "cowok", file: "genta-sport.webp", need: "hobi_olahraga", needLabel: "Hobi Olahraga", desc: "Jersey futsal + bola" },
  { id: "caya-sport", label: "Atlet", gender: "cewek", file: "caya-sport.webp", need: "hobi_olahraga", needLabel: "Hobi Olahraga", desc: "Jersey futsal + bola" },

  { id: "genta-music", label: "Musisi", gender: "cowok", file: "genta-music.webp", need: "hobi_musik", needLabel: "Hobi Musik", desc: "Vest hadroh + rebana" },
  { id: "caya-music", label: "Musisi", gender: "cewek", file: "caya-music.webp", need: "hobi_musik", needLabel: "Hobi Musik", desc: "Vest hadroh + rebana" },

  { id: "genta-reading", label: "Kutu Buku", gender: "cowok", file: "genta-reading.webp", need: "hobi_literasi", needLabel: "Hobi Literasi", desc: "Kacamata + buku Qur'an" },
  { id: "caya-reading", label: "Kutu Buku", gender: "cewek", file: "caya-reading.webp", need: "hobi_literasi", needLabel: "Hobi Literasi", desc: "Kacamata + buku tote" },

  { id: "genta-chef", label: "Chef", gender: "cowok", file: "genta-chef.webp", need: "hobi_kuliner", needLabel: "Hobi Kuliner", desc: "Topi chef putih" },
  { id: "caya-chef", label: "Chef", gender: "cewek", file: "caya-chef.webp", need: "hobi_kuliner", needLabel: "Hobi Kuliner", desc: "Topi chef hijab" },

  { id: "genta-magician", label: "Magician", gender: "cowok", file: "genta-magician.webp", need: "hobi_seni", needLabel: "Hobi Seni", desc: "Topi magician + tongkat bintang" },
  { id: "caya-magician", label: "Magician", gender: "cewek", file: "caya-magician.webp", need: "hobi_seni", needLabel: "Hobi Seni", desc: "Topi magician sparkle" },

  // ── Kegiatan / ketepatan ──
  { id: "genta-pembalap", label: "Pembalap", gender: "cowok", file: "genta-pembalap.webp", need: "pagi_early", needLabel: "Pagi Hari", desc: "Jumpsuit merah helm" },
  { id: "caya-pembalap", label: "Pembalap", gender: "cewek", file: "caya-pembalap.webp", need: "pagi_early", needLabel: "Pagi Hari", desc: "Helm pembalap hijab" },

  { id: "genta-tepat", label: "Tepat", gender: "cowok", file: "genta-tepat.webp", need: "zero_telat_50", needLabel: "Jam — 50× tepat", desc: "Jam saku sayap biru" },
  { id: "caya-tepat", label: "Tepat", gender: "cewek", file: "caya-tepat.webp", need: "zero_telat_50", needLabel: "Jam — 50× tepat", desc: "Jam sayap hijab" },

  { id: "genta-astro", label: "Astronot", gender: "cowok", file: "genta-astro.webp", need: "streak_20", needLabel: "On Fire 20×", desc: "Helm astronaut kaca" },
  { id: "caya-astro", label: "Astronot", gender: "cewek", file: "caya-astro.webp", need: "streak_20", needLabel: "On Fire 20×", desc: "Hijab astronaut" },

  // ── Epic / Legendary — batch 2 ──
  { id: "genta-robot", label: "Robot", gender: "cowok", file: "genta-robot.webp", need: "streak_40", needLabel: "Legenda 40×", desc: "Robot silver visor" },
  { id: "caya-robot", label: "Robot", gender: "cewek", file: "caya-robot.webp", need: "streak_40", needLabel: "Legenda 40×", desc: "Robot pink visor" },

  // ── Firaun / Cleopatra ──
  { id: "genta-firaun", label: "Firaun", gender: "cowok", file: "genta-firaun.webp", need: "streak_75", needLabel: "Tak Terbendung 75×", desc: "Nemes emas + jenggot palsu" },
  { id: "caya-cleopatra", label: "Cleopatra", gender: "cewek", file: "caya-cleopatra.webp", need: "streak_75", needLabel: "Tak Terbendung 75×", desc: "Mahkota cleopatra + eyeliner" },

  // ── Raja / Ratu ──
  { id: "genta-raja", label: "Raja", gender: "cowok", file: "genta-raja.webp", need: "streak_100", needLabel: "Dewa Streak 100×", desc: "Jubah emas + mahkota + scepter" },
  { id: "caya-ratu", label: "Ratu", gender: "cewek", file: "caya-ratu.webp", need: "streak_100", needLabel: "Dewa Streak 100×", desc: "Ratu mahkota + jubah" },

  // ── Haji ──
  { id: "genta-haji", label: "Haji", gender: "cowok", file: "genta-haji.webp", need: "hadir_150", needLabel: "Majestic 150×", desc: "Ihram + peci haji" },
  { id: "caya-haji", label: "Haji", gender: "cewek", file: "caya-haji.webp", need: "hadir_150", needLabel: "Majestic 150×", desc: "Mukena haji putih" },

  // ── Pramuka ──
  { id: "genta-pramuka", label: "Pramuka", gender: "cowok", file: "genta-pramuka.webp", need: "tingkat_kelompok", needLabel: "Kelompok", desc: "Seragam pramuka + hasduk" },
  { id: "caya-pramuka", label: "Pramuka", gender: "cewek", file: "caya-pramuka.webp", need: "tingkat_kelompok", needLabel: "Kelompok", desc: "Hijab pramuka + hasduk" },

  // ── Dokter ──
  { id: "genta-dokter", label: "Dokter", gender: "cowok", file: "genta-dokter.webp", need: "overcome_late", needLabel: "Maafkan Diri", desc: "Jas dokter + stetoskop" },
  { id: "caya-dokter", label: "Dokter", gender: "cewek", file: "caya-dokter.webp", need: "overcome_late", needLabel: "Maafkan Diri", desc: "Hijab dokter + stetoskop" },

  // ── Gamer ──
  { id: "genta-gamer", label: "Gamer", gender: "cowok", file: "genta-gamer.webp", need: "hobi_gaming", needLabel: "Hobi Gaming", desc: "Headset gamer + controller" },
  { id: "caya-gamer", label: "Gamer", gender: "cewek", file: "caya-gamer.webp", need: "hobi_gaming", needLabel: "Hobi Gaming", desc: "Headset gamer hijab" },

  // ── Pahlawan ──
  { id: "genta-pahlawan", label: "Pahlawan", gender: "cowok", file: "genta-pahlawan.webp", need: "tingkat_daerah", needLabel: "Daerah", desc: "Pejuang 45 + bambu runcing" },
  { id: "caya-pahlawan", label: "Pahlawan", gender: "cewek", file: "caya-pahlawan.webp", need: "tingkat_daerah", needLabel: "Daerah", desc: "Kebaya merah + selendang" },

  // ── Pengembala ──
  { id: "genta-pengembala", label: "Pengembala", gender: "cowok", file: "genta-pengembala.webp", need: "penjelajah", needLabel: "Penjelajah", desc: "Jubah gembala + tongkat + domba" },
  { id: "caya-pengembala", label: "Pengembala", gender: "cewek", file: "caya-pengembala.webp", need: "penjelajah", needLabel: "Penjelajah", desc: "Hijab gembala + domba" },

  // ── Wayang: Gatotkaca / Srikandi ──
  { id: "genta-gatotkaca", label: "Gatotkaca", gender: "cowok", file: "genta-gatotkaca.webp", need: "legenda_waktu", needLabel: "Legenda Waktu", desc: "Vest Gatotkaca + sayap" },
  { id: "caya-srikandi", label: "Srikandi", gender: "cewek", file: "caya-srikandi.webp", need: "legenda_waktu", needLabel: "Legenda Waktu", desc: "Kebaya Srikandi + busur" },

  // ── Pilot ──
  { id: "genta-pilot", label: "Pilot", gender: "cowok", file: "genta-pilot.webp", need: "zero_telat_100", needLabel: "Sempurna 100×", desc: "Seragam pilot + wing pin" },
  { id: "caya-pilot", label: "Pilot", gender: "cewek", file: "caya-pilot.webp", need: "zero_telat_100", needLabel: "Sempurna 100×", desc: "Hijab pilot + wing pin" },

  // ── Teknisi / Traveler (hobi) ──
  { id: "genta-teknisi", label: "Teknisi", gender: "cowok", file: "genta-teknisi.webp", need: "hobi_teknologi", needLabel: "Hobi Teknologi", desc: "Hoodie teknisi + laptop" },
  { id: "caya-teknisi", label: "Teknisi", gender: "cewek", file: "caya-teknisi.webp", need: "hobi_teknologi", needLabel: "Hobi Teknologi", desc: "Hoodie teknisi + laptop" },

  { id: "genta-traveler", label: "Traveler", gender: "cowok", file: "genta-traveler.webp", need: "hobi_traveling", needLabel: "Hobi Traveling", desc: "Ransel + kamera" },
  { id: "caya-traveler", label: "Traveler", gender: "cewek", file: "caya-traveler.webp", need: "hobi_traveling", needLabel: "Hobi Traveling", desc: "Ransel + kamera hijab" },
];

export function isAvatarUnlocked(
  avatarId: string,
  achievements: AchievementState[],
  _me?: Pick<MemberIdentity, "hobi">,
): boolean {
  const def = AVATARS.find((a) => a.id === avatarId);
  if (!def) return false;
  if (def.need === null) return true;
  const st = achievements.find((a) => a.id === def.need);
  return st?.unlocked ?? false;
}

export function avatarUnlockProgress(
  avatarId: string,
  achievements: AchievementState[],
): { current: number; target: number; progress: number } | null {
  const def = AVATARS.find((a) => a.id === avatarId);
  if (!def || def.need === null) return null;
  const st = achievements.find((a) => a.id === def.need);
  if (!st) return null;
  return { current: st.current, target: st.target, progress: st.progress };
}

export function getAvailableAvatars(
  gender: AvatarGender | null,
  _achievements?: AchievementState[],
): AvatarDef[] {
  if (!gender) return AVATARS;
  return AVATARS.filter((a) => a.gender === gender);
}

export function resolveGender(me: Pick<MemberIdentity, "jenisKelamin" | "nama"> & { avatarId?: string | null }): AvatarGender | null {
  if (me.jenisKelamin === "cowok" || me.jenisKelamin === "cewek") return me.jenisKelamin;
  // fallback: infer from avatarId if already chosen
  if (me.avatarId) {
    if (me.avatarId.startsWith("genta-")) return "cowok";
    if (me.avatarId.startsWith("caya-")) return "cewek";
  }
  return null;
}

export function defaultAvatarFor(gender: AvatarGender | null): string {
  if (gender === "cewek") return "caya-base";
  return "genta-base";
}

// helper for hobi check display (some achievements are hobi_* but same logic via achievements array)
export function hobiForAvatar(avatarId: string): string | null {
  const map: Record<string, string> = {
    "genta-sport": "olahraga", "caya-sport": "olahraga",
    "genta-music": "musik", "caya-music": "musik",
    "genta-reading": "literasi", "caya-reading": "literasi",
    "genta-chef": "kuliner", "caya-chef": "kuliner",
    "genta-magician": "seni", "caya-magician": "seni",
    "genta-gamer": "gaming", "caya-gamer": "gaming",
    "genta-traveler": "traveling", "caya-traveler": "traveling",
    "genta-teknisi": "teknologi", "caya-teknisi": "teknologi",
  };
  return map[avatarId] ?? null;
}

// Validate avatarId matches gender
export function isAvatarGenderMismatch(avatarId: string, gender: AvatarGender | null): boolean {
  if (!gender) return false;
  const def = AVATARS.find((a) => a.id === avatarId);
  if (!def) return false;
  return def.gender !== gender;
}
