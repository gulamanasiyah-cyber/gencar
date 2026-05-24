import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter").trim(),
  email: z.string().email("Format email tidak valid").trim().toLowerCase(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  desaId: z.preprocess(
    (val) => (typeof val === "string" && val ? Number(val) : val),
    z.number({ message: "Desa wajib dipilih" }).positive("Desa wajib dipilih")
  ),
  kelompokId: z.preprocess(
    (val) => (typeof val === "string" && val ? Number(val) : val),
    z.number({ message: "Kelompok wajib dipilih" }).positive("Kelompok wajib dipilih")
  ),
  dapukan: z.string().min(1, "Dapukan wajib dipilih"),
  jenisKelamin: z.enum(["L", "P"], { message: "Jenis kelamin harus L atau P" }),
  kategoriUsia: z.enum(["SMP", "SMA", "SMK", "Kuliah", "Bekerja", "Mandiri"], {
    message: "Pilih pekerjaan/pendidikan yang valid",
  }),
  kategori: z.enum(["Generus", "Usia Mandiri"], { message: "Kategori tidak valid" }),
  namaOrtu: z.string().min(2, "Nama orang tua minimal 2 karakter").trim(),
  noTelp: z.string().min(10, "Nomor WhatsApp minimal 10 digit").regex(/^\d+$/, "Nomor WhatsApp hanya boleh berisi angka").trim(),
  foto: z.string().url("Format foto tidak valid").optional().or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;
