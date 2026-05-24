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
  jenisKelamin: z.string().min(1, "Jenis Kelamin wajib dipilih"),
  kategoriUsia: z.string().min(1, "Kategori Usia wajib dipilih"),
  kategori: z.enum(["Generus", "Usia Mandiri"], { message: "Kategori tidak valid" }),
  namaOrtu: z.string().min(2, "Nama Orangtua wajib diisi"),
  tempatLahir: z.string().min(2, "Tempat Lahir wajib diisi"),
  tanggalLahir: z.string().min(1, "Tanggal Lahir wajib diisi"),
  noTelp: z.string().min(10, "Nomor WhatsApp minimal 10 digit").regex(/^\d+$/, "Nomor WhatsApp hanya boleh berisi angka").trim(),
  noTelpOrtu: z.string().min(10, "Nomor WhatsApp Ortu minimal 10 digit").regex(/^\d+$/, "Nomor WhatsApp Ortu hanya boleh berisi angka").trim(),
  alamat: z.string().min(3, "Alamat lengkap wajib diisi"),
  foto: z.string().url("Format foto tidak valid").min(1, "Foto profil wajib diunggah"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
