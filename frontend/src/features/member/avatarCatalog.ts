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

// 27 PNG in frontend/public/avatars (C:\Users\user\Downloads\gencar_avatar)
// 13 caya + 14 genta (genta-robot extra). Pair unlock condition identical per theme.
export const AVATARS: AvatarDef[] = [
  // ── DEFAULT (free) ──
  { id: "genta-base", label: "Genta Base", gender: "cowok", file: "genta-base.png", need: null, needLabel: "Gratis", desc: "Peci hitam koko cream" },
  { id: "caya-base", label: "Cahya Base", gender: "cewek", file: "caya-base.png", need: null, needLabel: "Gratis", desc: "Hijab dusty pink gamis cream" },

  // ── Common — easy first unlocks ──
  { id: "genta-bear", label: "Beruang", gender: "cowok", file: "genta-bear.png", need: "avatar_custom", needLabel: "Tampil Beda", desc: "Onesie beruang coklat" },
  { id: "caya-bear", label: "Beruang", gender: "cewek", file: "caya-bear.png", need: "avatar_custom", needLabel: "Tampil Beda", desc: "Onesie beruang pink" },

  { id: "genta-alien", label: "Alien", gender: "cowok", file: "genta-alien.png", need: "streak_5", needLabel: "Menyala 5×", desc: "Alien hijau antena + UFO" },
  { id: "caya-alien", label: "Alien", gender: "cewek", file: "caya-alien.png", need: "streak_5", needLabel: "Menyala 5×", desc: "Alien pink antena" },

  { id: "genta-pirate", label: "Pirate", gender: "cowok", file: "genta-pirate.png", need: "streak_reset", needLabel: "Bangkit dari Abu", desc: "Bajak laut topi tengkorak" },
  { id: "caya-pirate", label: "Pirate", gender: "cewek", file: "caya-pirate.png", need: "streak_reset", needLabel: "Bangkit dari Abu", desc: "Bajak laut bandana" },

  { id: "genta-ninja", label: "Ninja", gender: "cowok", file: "genta-ninja.png", need: "streak_10", needLabel: "Konsisten 10×", desc: "Ninja hitam shuriken" },
  { id: "caya-ninja", label: "Kunoichi", gender: "cewek", file: "caya-ninja.png", need: "streak_10", needLabel: "Konsisten 10×", desc: "Kunoichi hijab hitam" },

  // ── Hobi-gated (isi hobi → unlock) ──
  { id: "genta-sport", label: "Atlet", gender: "cowok", file: "genta-sport.png", need: "hobi_olahraga", needLabel: "Hobi Olahraga", desc: "Jersey futsal + bola" },
  { id: "caya-sport", label: "Atlet", gender: "cewek", file: "caya-sport.png", need: "hobi_olahraga", needLabel: "Hobi Olahraga", desc: "Jersey futsal + bola" },

  { id: "genta-music", label: "Musisi", gender: "cowok", file: "genta-music.png", need: "hobi_musik", needLabel: "Hobi Musik", desc: "Vest hadroh + rebana" },
  { id: "caya-music", label: "Musisi", gender: "cewek", file: "caya-music.png", need: "hobi_musik", needLabel: "Hobi Musik", desc: "Vest hadroh + rebana" },

  { id: "genta-reading", label: "Kutu Buku", gender: "cowok", file: "genta-reading.png", need: "hobi_literasi", needLabel: "Hobi Literasi", desc: "Kacamata + buku Qur'an" },
  { id: "caya-reading", label: "Kutu Buku", gender: "cewek", file: "caya-reading.png", need: "hobi_literasi", needLabel: "Hobi Literasi", desc: "Kacamata + buku tote" },

  { id: "genta-chef", label: "Chef", gender: "cowok", file: "genta-chef.png", need: "hobi_kuliner", needLabel: "Hobi Kuliner", desc: "Topi chef putih" },
  { id: "caya-chef", label: "Chef", gender: "cewek", file: "caya-chef.png", need: "hobi_kuliner", needLabel: "Hobi Kuliner", desc: "Topi chef hijab" },

  { id: "genta-magician", label: "Magician", gender: "cowok", file: "genta-magician.png", need: "hobi_seni", needLabel: "Hobi Seni", desc: "Topi magician + tongkat bintang" },
  { id: "caya-magician", label: "Magician", gender: "cewek", file: "caya-magician.png", need: "hobi_seni", needLabel: "Hobi Seni", desc: "Topi magician sparkle" },

  // ── Kegiatan / ketepatan ──
  { id: "genta-pembalap", label: "Pembalap", gender: "cowok", file: "genta-pembalap.png", need: "pagi_early", needLabel: "Pagi Hari", desc: "Jumpsuit merah helm" },
  { id: "caya-pembalap", label: "Pembalap", gender: "cewek", file: "caya-pembalap.png", need: "pagi_early", needLabel: "Pagi Hari", desc: "Helm pembalap hijab" },

  { id: "genta-tepat", label: "Tepat", gender: "cowok", file: "genta-tepat.png", need: "zero_telat_50", needLabel: "Jam — 50× tepat", desc: "Jam saku sayap biru" },
  { id: "caya-tepat", label: "Tepat", gender: "cewek", file: "caya-tepat.png", need: "zero_telat_50", needLabel: "Jam — 50× tepat", desc: "Jam sayap hijab" },

  { id: "genta-astro", label: "Astronot", gender: "cowok", file: "genta-astro.png", need: "streak_20", needLabel: "On Fire 20×", desc: "Helm astronaut kaca" },
  { id: "caya-astro", label: "Astronot", gender: "cewek", file: "caya-astro.png", need: "streak_20", needLabel: "On Fire 20×", desc: "Hijab astronaut" },

  // ── Epic — extra (only genta has file now) ──
  { id: "genta-robot", label: "Robot", gender: "cowok", file: "genta-robot.png", need: "streak_40", needLabel: "Legenda 40×", desc: "Robot silver visor" },
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
