import { useEffect, useState } from "react";
import { createAvatar } from "@dicebear/core";
import type { MemberIdentity } from "./types";

// Curated DiceBear styles — lazy-loaded to keep bundle small
export const AVATAR_STYLES = [
  "adventurer",
  "avataaars",
  "bigSmile",
  "lorelei",
  "micah",
  "miniavs",
  "personas",
  "notionists",
  "openPeeps",
  "funEmoji",
  "bottts",
  "croodles",
] as const;

export type AvatarStyle = typeof AVATAR_STYLES[number];

const STYLE_LABELS: Record<AvatarStyle, string> = {
  adventurer: "Adventurer",
  avataaars: "Avataaars",
  bigSmile: "Big Smile",
  lorelei: "Lorelei",
  micah: "Micah",
  miniavs: "Miniavs",
  personas: "Personas",
  notionists: "Notionists",
  openPeeps: "Open Peeps",
  funEmoji: "Fun Emoji",
  bottts: "Bottts",
  croodles: "Croodles",
};

export function avatarLabel(s: string) {
  return STYLE_LABELS[s as AvatarStyle] ?? s;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Lazy-load a single DiceBear style module on demand
async function loadStyleModule(style: string): Promise<any> {
  switch (style) {
    case "adventurer": return await import("@dicebear/adventurer");
    case "avataaars": return await import("@dicebear/avataaars");
    case "bigSmile": return await import("@dicebear/big-smile");
    case "lorelei": return await import("@dicebear/lorelei");
    case "micah": return await import("@dicebear/micah");
    case "miniavs": return await import("@dicebear/miniavs");
    case "personas": return await import("@dicebear/personas");
    case "notionists": return await import("@dicebear/notionists");
    case "openPeeps": return await import("@dicebear/open-peeps");
    case "funEmoji": return await import("@dicebear/fun-emoji");
    case "bottts": return await import("@dicebear/bottts");
    case "croodles": return await import("@dicebear/croodles");
    default: return await import("@dicebear/adventurer");
  }
}

export function getAvatarVariant(me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi">): number {
  const key = `${me.nama}|${me.nomorUnik ?? me.id}|${me.kategoriMudaMudi}`;
  return hashStr(key) % AVATAR_STYLES.length;
}

export function resolveAvatar(me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi"> & { avatarStyle?: string | null; avatarSeed?: string | null }) {
  if (me.avatarStyle && AVATAR_STYLES.includes(me.avatarStyle as AvatarStyle)) {
    return { style: me.avatarStyle as AvatarStyle, seed: me.avatarSeed ?? me.nama };
  }
  const idx = getAvatarVariant(me);
  const style = AVATAR_STYLES[idx]!;
  return { style, seed: me.nama };
}

function useDicebearSvg(style: string, seed: string, size: number): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadStyleModule(style).then((mod: any) => {
      if (cancelled) return;
      const styleObj = mod.default ?? mod;
      const avatar = createAvatar(styleObj, {
        seed,
        size,
        backgroundColor: ["fff7ed", "fde8c8", "fde68a", "fef3c7"],
      });
      setSvg(avatar.toString());
    }).catch(() => {
      if (!cancelled) setSvg(null);
    });
    return () => { cancelled = true; };
  }, [style, seed, size]);
  return svg;
}

export function MemberAvatar({
  me,
  size = 40,
  className,
  style,
}: {
  me: Pick<MemberIdentity, "nama" | "nomorUnik" | "id" | "kategoriMudaMudi"> & { foto?: string | null; avatarStyle?: string | null; avatarSeed?: string | null };
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

  const { style: avatarStyle, seed } = resolveAvatar(me);
  const svg = useDicebearSvg(avatarStyle, seed, size);

  if (!svg) {
    // Skeleton while lazy module loads
    return <span style={{ width: size, height: size, borderRadius: 999, background: "#fff7ed", border: "2px solid #fff", display: "block", ...style }} aria-hidden />;
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        borderRadius: 999,
        border: "2px solid #fff",
        boxShadow: "0 2px 12px rgba(27,15,10,0.08)",
        overflow: "hidden",
        background: "#fff7ed",
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label={me.nama}
      role="img"
    />
  );
}

export function DicebearPreview({ style, seed, size = 64 }: { style: string; seed: string; size?: number }) {
  const svg = useDicebearSvg(style, seed, size);
  if (!svg) return <span style={{ width: size, height: size, borderRadius: 999, background: "#fff7ed", border: "1px solid #f0dfc8", display: "block" }} />;
  return <span style={{ width: size, height: size, display: "grid", placeItems: "center", borderRadius: 999, overflow: "hidden", background: "#fff7ed", border: "1px solid #f0dfc8" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default MemberAvatar;
