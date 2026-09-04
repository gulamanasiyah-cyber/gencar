import { and, eq, or } from "drizzle-orm";
import { kegiatanPeserta } from "../../../shared/schema";

export type GenerusScope = {
  id: string;
  desaId: number | null;
  kelompokId: number | null;
};

/**
 * Cek apakah generus tercakup undangan peserta yang SUDAH approved untuk suatu kegiatan.
 * Tercakup = row kegiatanPeserta (status approved) menarget generusId-nya langsung,
 * kelompoknya, atau desanya. Pending/rejected tidak dihitung.
 */
export async function isDiundang(db: any, kegiatanId: string, generus: GenerusScope): Promise<boolean> {
  const targets: any[] = [];
  if (generus.id) targets.push(eq(kegiatanPeserta.generusId, generus.id));
  if (generus.kelompokId != null) targets.push(eq(kegiatanPeserta.kelompokId, generus.kelompokId));
  if (generus.desaId != null) targets.push(eq(kegiatanPeserta.desaId, generus.desaId));
  if (targets.length === 0) return false;
  const found: any = await db.query.kegiatanPeserta.findFirst({
    where: and(
      eq(kegiatanPeserta.kegiatanId, kegiatanId),
      eq(kegiatanPeserta.status, "approved"),
      or(...targets),
    ),
  });
  return !!found;
}
