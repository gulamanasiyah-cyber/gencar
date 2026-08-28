import type { MemberIdentity } from "./types";
import { AVATARS, defaultAvatarFor, resolveGender } from "./avatarCatalog";

// Static PNG avatars — replaces DiceBear
export const AVATAR_BASE_PATH = "/avatars";

export function avatarUrl(avatarId: string | null | undefined, fallbackGender: "cowok" | "cewek" | null = null): string {
  const id = avatarId && AVATARS.some((a) => a.id === avatarId) ? avatarId : defaultAvatarFor(fallbackGender);
  const def = AVATARS.find((a) => a.id === id);
  return `${AVATAR_BASE_PATH}/${def?.file ?? "genta-base.png"}`;
}

export function resolveAvatarId(me: Pick<MemberIdentity, "avatarId" | "jenisKelamin" | "nama" | "avatarStyle">): string {
  if (me.avatarId && AVATARS.some((a) => a.id === me.avatarId)) return me.avatarId;
  // migrate legacy DiceBear: map any old avatarStyle to base by gender
  const g = resolveGender(me as any);
  return defaultAvatarFor(g);
}

// Keep for backwards compat — not used for static avatars but trophy "Kolektor Avatar" counts changes
export function getAvatarVariant(_me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi">): number {
  return 0;
}

export function resolveAvatar(me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi" | "avatarStyle" | "avatarSeed" | "avatarId" | "jenisKelamin"> & { avatarStyle?: string | null; avatarSeed?: string | null; avatarId?: string | null; jenisKelamin?: string | null }) {
  const id = resolveAvatarId(me as any);
  return { style: id as any, seed: me.nama, avatarId: id };
}

export function avatarLabel(s: string) {
  const def = AVATARS.find((a) => a.id === s);
  return def?.label ?? s;
}

export function MemberAvatar({
  me,
  size = 40,
  className,
  style,
}: {
  me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi"> & { foto?: string | null; avatarStyle?: string | null; avatarSeed?: string | null; avatarId?: string | null; jenisKelamin?: string | null };
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (me.foto) {
    return (
      <img
        src={me.foto}
        alt={me.nama}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: "2px solid #fff", boxShadow: "0 2px 12px rgba(27,15,10,0.10)", display: "block", ...style }}
      />
    );
  }

  const gender = resolveGender(me as any);
  const avatarId = (me.avatarId && AVATARS.some((a) => a.id === me.avatarId)) ? me.avatarId : defaultAvatarFor(gender);
  const url = avatarUrl(avatarId, gender);

  return (
    <img
      src={url}
      alt={me.nama}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: "2px solid #fff", boxShadow: "0 2px 12px rgba(27,15,10,0.08)", display: "block", background: "#fff7ed", ...style }}
      loading="eager"
    />
  );
}

export function DicebearPreview({ style, seed: _seed, size = 64 }: { style: string; seed: string; size?: number }) {
  // Backwards compat: render static avatar by id if style matches an avatar id
  const avatarId = AVATARS.some((a) => a.id === style) ? style : defaultAvatarFor(null);
  const url = avatarUrl(avatarId);
  return <img src={url} alt={style} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", background: "#fff7ed", border: "1px solid #f0dfc8", display: "block" }} />;
}

export default MemberAvatar;
