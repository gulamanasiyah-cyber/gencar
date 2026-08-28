import { z } from "zod";

// ── Admin 3 tingkat — daerah singleton implisit (tanpa pilih Daerah) ──
export const adminRoles = ["admin_daerah", "admin_desa", "admin_kelompok"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const pendidikanEnum = ["SD", "SMP", "SMA", "Sedang menempuh perguruan tinggi", "Sarjana"] as const;

export const kategoriMudaMudiEnum = ["perantauan", "pribumi"] as const;
export const kategoriAcaraEnum = ["sambung_rutin", "keakraban", "pemantapan", "lainnya"] as const;
export const hobiEnum = ["olahraga", "traveling", "seni", "musik", "kuliner", "teknologi", "literasi", "gaming", "lainnya"] as const;
export type HobiKey = (typeof hobiEnum)[number];

export const shiftModeEnum = ["tetap", "fleksibel"] as const;

export const shiftPekerjaanSchema = z.union([
  z.object({ mode: z.literal("tetap"), masuk: z.string().regex(/^\d{2}:\d{2}$/), pulang: z.string().regex(/^\d{2}:\d{2}$/) }),
  z.object({
    mode: z.literal("fleksibel"),
    shifts: z.array(z.object({ nama: z.string().min(1), masuk: z.string().regex(/^\d{2}:\d{2}$/), pulang: z.string().regex(/^\d{2}:\d{2}$/) })).min(1),
  }),
]);

// Admin mendaftarkan Generus (domisili terbalik: anak wajib, ortu kondisional)
export const generusAdminCreateSchema = z
  .object({
    nama: z.string().min(2).max(100).trim(),
    tempatLahir: z.string().min(2),
    tanggalLahir: z.string().min(1),
    noTelp: z.string().min(10).regex(/^\d+$/).trim(),
    pendidikan: z.enum(pendidikanEnum),
    jenisKelamin: z.enum(["L", "P"]),
    kategoriMudaMudi: z.enum(kategoriMudaMudiEnum).nullable().optional(),
    asalDaerah: z.string().nullable().optional(),
    domisiliAnak: z.string().min(3, "Domisili anak wajib diisi"),
    isDomisiliOrtuSama: z.boolean().default(true),
    domisiliOrtu: z.string().nullable().optional(),
    desaId: z.number().int().positive().nullable().optional(),
    kelompokId: z.number().int().positive().nullable().optional(),
    shiftPekerjaan: z.string().nullable().optional(), // JSON string P1 hidden
    statusOrtuJamaah: z.enum(["sudah", "belum"]).nullable().optional(), // P1
    foto: z.string().url().nullable().optional(),
    hobi: z.array(z.enum(hobiEnum)).max(8).nullable().optional(),
    hobiCustom: z.string().max(40).nullable().optional(),
    hobiDetail: z.string().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kategoriMudaMudi === "perantauan" && !v.asalDaerah?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Asal daerah wajib jika perantauan", path: ["asalDaerah"] });
    }
    if (!v.isDomisiliOrtuSama && !v.domisiliOrtu?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Domisili ortu wajib jika tidak sama dengan anak", path: ["domisiliOrtu"] });
    }
  });

export const kegiatanCreateSchema = z
  .object({
    judul: z.string().min(2).max(200),
    deskripsi: z.string().nullable().optional(),
    kategoriAcara: z.enum(kategoriAcaraEnum),
    kategoriCustom: z.string().nullable().optional(),
    tanggal: z.string().min(1),
    jam: z.string().nullable().optional(),
    lokasi: z.string().nullable().optional(),
    desaId: z.number().int().positive().nullable().optional(),
    kelompokId: z.number().int().positive().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    radiusM: z.number().int().positive().default(100),
    gpsRequired: z.number().int().min(0).max(1).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.kategoriAcara === "lainnya" && !v.kategoriCustom?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kategori custom wajib jika Lainnya", path: ["kategoriCustom"] });
    }
  });

export function sambungJudulTemplate(level: "daerah" | "desa" | "kelompok", namaWilayah: string): string {
  const tingkat = level === "daerah" ? "Daerah" : level === "desa" ? "Desa" : "Kelompok";
  const nama = level === "daerah" ? "" : ` ${namaWilayah}`;
  return `Sambung Muda-Mudi ${tingkat}${nama}`.trim();
}

export const pengurusLevelEnum = ["pimpinan", "sekretariat", "bidang", "koordinator"] as const;

export const pengurusCreateSchema = z.object({
  nama: z.string().min(2).max(80).trim(),
  dapukan: z.string().min(2).max(80).trim(),
  foto: z.string().url().nullable().optional().or(z.literal("")),
  level: z.enum(pengurusLevelEnum).default("bidang"),
  bio: z.string().max(280).nullable().optional(),
  kontakWa: z.string().max(20).nullable().optional(),
  urutan: z.number().int().min(0).max(999).default(0),
});

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
