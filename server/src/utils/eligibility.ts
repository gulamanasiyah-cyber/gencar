import { haversineM } from "../../../shared/validation";

export function calculateAge(birthDateStr?: string | null, referenceDate: Date = new Date()): number | null {
  if (!birthDateStr) return null;
  const b = new Date(birthDateStr);
  if (Number.isNaN(b.getTime())) return null;
  let age = referenceDate.getFullYear() - b.getFullYear();
  const m = referenceDate.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < b.getDate())) {
    age--;
  }
  return age;
}

export type GenerusScope = {
  id: string;
  desaId: number | null;
  kelompokId: number | null;
  jenisKelamin?: string | null;
  kategoriMudaMudi?: string | null;
  pendidikan?: string | null;
  tanggalLahir?: string | null;
};

export function isGenerusEligibleForKegiatan(
  generus: GenerusScope,
  kegiatan: any,
  pesertaEntries: any[],
  userLocation?: { lat: number; lng: number } | null
): boolean {
  if (kegiatan.gpsRequired === 1 && kegiatan.lat != null && kegiatan.lng != null) {
    if (!userLocation) return false;
    const dist = haversineM(userLocation.lat, userLocation.lng, kegiatan.lat, kegiatan.lng);
    if (dist > (kegiatan.radiusM || 100)) return false;
  }

  let isInvitedOrInScope = false;
  const directApproved = pesertaEntries.some(
    (p) =>
      p.kegiatanId === kegiatan.id &&
      p.status === "approved" &&
      ((p.generusId && p.generusId === generus.id) ||
        (p.kelompokId != null && p.kelompokId === generus.kelompokId) ||
        (p.desaId != null && p.desaId === generus.desaId))
  );

  if (directApproved) {
    isInvitedOrInScope = true;
  } else if (kegiatan.desaId == null && kegiatan.kelompokId == null) {
    isInvitedOrInScope = true;
  } else if (kegiatan.desaId != null && kegiatan.kelompokId == null && kegiatan.desaId === generus.desaId) {
    isInvitedOrInScope = true;
  } else if (kegiatan.kelompokId != null && kegiatan.kelompokId === generus.kelompokId) {
    isInvitedOrInScope = true;
  }

  if (!isInvitedOrInScope) return false;

  if (kegiatan.targetJenisKelamin && kegiatan.targetJenisKelamin !== generus.jenisKelamin) return false;
  if (kegiatan.targetKategoriMudaMudi && kegiatan.targetKategoriMudaMudi !== generus.kategoriMudaMudi) return false;
  if (kegiatan.targetPendidikan && kegiatan.targetPendidikan !== generus.pendidikan) return false;

  const age = calculateAge(generus.tanggalLahir);
  if (kegiatan.targetUsiaMin != null && (age == null || age < kegiatan.targetUsiaMin)) return false;
  if (kegiatan.targetUsiaMax != null && (age == null || age > kegiatan.targetUsiaMax)) return false;

  return true;
}

export function matchesQrScope(
  kegiatan: any,
  qrLevel: "kelompok" | "desa" | "daerah",
  qrDesaId: number | null,
  qrKelompokId: number | null
): boolean {
  if (qrLevel === "kelompok" && qrKelompokId != null) {
    return kegiatan.kelompokId === qrKelompokId;
  }
  if (qrLevel === "desa" && qrDesaId != null) {
    return kegiatan.desaId === qrDesaId && kegiatan.kelompokId == null;
  }
  if (qrLevel === "daerah") {
    return kegiatan.desaId == null && kegiatan.kelompokId == null;
  }
  return true;
}
