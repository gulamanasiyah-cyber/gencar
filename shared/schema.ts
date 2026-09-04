import { sql } from "drizzle-orm";
import { text, integer, sqliteTable, index, real } from "drizzle-orm/sqlite-core";

// ── Desa / Kelompok (tanpa tabel daerah — singleton Cengkareng implisit) ──
export const desa = sqliteTable("desa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const kelompok = sqliteTable("kelompok", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  desaId: integer("desa_id")
    .notNull()
    .references(() => desa.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Generus (muda-mudi) — delta: perantauan/pribumi, domisili terbalik, pendidikan enum, shift JSON ──
export const generus = sqliteTable("generus", {
  id: text("id").primaryKey(),
  nomorUnik: text("nomor_unik").notNull().unique(),
  nama: text("nama").notNull(),
  namaOrtu: text("nama_ortu"),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: text("tanggal_lahir"),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull(),
  kategoriUsia: text("kategori_usia", {
    enum: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK", "Kuliah", "Bekerja", "Mandiri"],
  }).notNull(),
  kategori: text("kategori", { enum: ["Generus", "Usia Mandiri"] }).default("Generus"),
  // P0: muda/mudi perantauan vs pribumi
  kategoriMudaMudi: text("kategori_muda_mudi", { enum: ["perantauan", "pribumi"] }),
  asalDaerah: text("asal_daerah"), // wajib jika perantauan
  // P0: domisili terbalik — anak wajib, ortu kondisional
  domisiliAnak: text("domisili_anak"),
  domisiliOrtu: text("domisili_ortu"),
  isDomisiliOrtuSama: integer("is_domisili_ortu_sama").default(1),
  // pendidikan P0 enum — SD/SMP/SMA/Sedang menempuh perguruan tinggi/Sarjana
  pendidikan: text("pendidikan"),
  pekerjaan: text("pekerjaan"),
  statusNikah: text("status_nikah", { enum: ["Belum Menikah", "Menikah"] }).default("Belum Menikah"),
  // P1: shift fleksibel JSON {mode, masuk, pulang, shifts[]}
  shiftPekerjaan: text("shift_pekerjaan"), // JSON string nullable
  statusOrtuJamaah: text("status_ortu_jamaah", { enum: ["sudah", "belum"] }),
  alamat: text("alamat"),
  noTelp: text("no_telp"),
  noTelpOrtu: text("no_telp_ortu"),
  hobi: text("hobi"),
  hobiDetail: text("hobi_detail"),
  hobiUpdatedAt: text("hobi_updated_at"),
  makananMinumanFavorit: text("makanan_minuman_favorit"),
  suku: text("suku"),
  foto: text("foto"),
  avatarId: text("avatar_id"),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "set null" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "set null" }),
  instagram: text("instagram"),
  kriteriaPasangan: text("kriteria_pasangan"),
  isGenerus: integer("is_generus").default(0),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  namaIdx: index("generus_nama_idx").on(table.nama),
  desaIdIdx: index("generus_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("generus_kelompok_id_idx").on(table.kelompokId),
  kategoriUsiaIdx: index("generus_kategori_usia_idx").on(table.kategoriUsia),
  jenisKelaminIdx: index("generus_jenis_kelamin_idx").on(table.jenisKelamin),
  statusNikahIdx: index("generus_status_nikah_idx").on(table.statusNikah),
  isGenerusIdx: index("generus_is_generus_idx").on(table.isGenerus),
  noTelpIdx: index("generus_no_telp_idx").on(table.noTelp),
  kategoriMudaMudiIdx: index("generus_kategori_muda_mudi_idx").on(table.kategoriMudaMudi),
  avatarIdIdx: index("generus_avatar_id_idx").on(table.avatarId),
}));

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordPlain: text("password_plain"),
  role: text("role", { enum: ["admin_daerah", "admin_desa", "admin_kelompok", "generus"] })
    .notNull()
    .default("generus"),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "set null" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "set null" }),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  nameIdx: index("users_name_idx").on(table.name),
  emailIdx: index("users_email_idx").on(table.email),
  desaIdIdx: index("users_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("users_kelompok_id_idx").on(table.kelompokId),
  roleIdx: index("users_role_idx").on(table.role),
  generusIdIdx: index("users_generus_id_idx").on(table.generusId),
}));

// ── Kegiatan — delta: kategoriAcara enum + kategoriCustom + judul template + GPS ──
export const kegiatan = sqliteTable("kegiatan", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  kategoriAcara: text("kategori_acara", { enum: ["sambung_rutin", "keakraban", "pemantapan", "lainnya"] }).default("sambung_rutin"),
  kategoriCustom: text("kategori_custom"),
  tanggal: text("tanggal").notNull(),
  jam: text("jam"),
  lokasi: text("lokasi"),
  lat: real("lat"),
  lng: real("lng"),
  radiusM: integer("radius_m").default(100),
  gpsRequired: integer("gps_required").default(0),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  desaIdIdx: index("kegiatan_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("kegiatan_kelompok_id_idx").on(table.kelompokId),
  tanggalIdx: index("kegiatan_tanggal_idx").on(table.tanggal),
  kategoriAcaraIdx: index("kegiatan_kategori_acara_idx").on(table.kategoriAcara),
}));

// ── Absensi — delta: lat/lng/accuracy/isGpsValid + qrWilayahLevel ──
export const absensi = sqliteTable("absensi", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id")
    .notNull()
    .references(() => kegiatan.id),
  generusId: text("generus_id")
    .notNull()
    .references(() => generus.id),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
  keterangan: text("keterangan", { enum: ["hadir", "izin", "alpha"] }).default("hadir"),
  lat: real("lat"),
  lng: real("lng"),
  accuracy: real("accuracy"),
  isGpsValid: integer("is_gps_valid"),
  qrWilayahLevel: text("qr_wilayah_level", { enum: ["kelompok", "desa", "daerah"] }),
}, (table) => ({
  kegiatanIdIdx: index("absensi_kegiatan_id_idx").on(table.kegiatanId),
  generusIdIdx: index("absensi_generus_id_idx").on(table.generusId),
}));

// ── Kegiatan Peserta Wajib — target peserta yang wajib hadir ──
export const kegiatanPeserta = sqliteTable("kegiatan_peserta", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").notNull().references(() => kegiatan.id, { onDelete: "cascade" }),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("approved").notNull(),
  requestedBy: text("requested_by"),
  approvedBy: text("approved_by"),
  catatan: text("catatan"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("kegiatan_peserta_kegiatan_id_idx").on(table.kegiatanId),
  generusIdIdx: index("kegiatan_peserta_generus_id_idx").on(table.generusId),
  kelompokIdIdx: index("kegiatan_peserta_kelompok_id_idx").on(table.kelompokId),
  desaIdIdx: index("kegiatan_peserta_desa_id_idx").on(table.desaId),
  statusIdx: index("kegiatan_peserta_status_idx").on(table.status),
}));

// ── Magic tokens — onboarding 30m sekali pakai ──
export const magicTokens = sqliteTable("magic_tokens", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  tokenHashIdx: index("magic_tokens_token_hash_idx").on(table.tokenHash),
  emailIdx: index("magic_tokens_email_idx").on(table.email),
  generusIdIdx: index("magic_tokens_generus_id_idx").on(table.generusId),
}));

// ── Wilayah QR statis — 1 per kelompok/desa/daerah ──
export const wilayahQr = sqliteTable("wilayah_qr", {
  id: text("id").primaryKey(),
  level: text("level", { enum: ["kelompok", "desa", "daerah"] }).notNull(),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  qrToken: text("qr_token").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  qrTokenIdx: index("wilayah_qr_token_idx").on(table.qrToken),
  levelIdx: index("wilayah_qr_level_idx").on(table.level),
  desaIdIdx: index("wilayah_qr_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("wilayah_qr_kelompok_id_idx").on(table.kelompokId),
}));

// ── Artikel / Berita (publik via status) ──
export const artikel = sqliteTable("artikel", {
  id: text("id").primaryKey(),
  slug: text("slug").unique(),
  judul: text("judul").notNull(),
  konten: text("konten").notNull(),
  ringkasan: text("ringkasan"),
  kategori: text("kategori").default("Tuntunan Ibadah"),
  coverImage: text("cover_image"),
  status: text("status", { enum: ["pending", "published", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  tipe: text("tipe", { enum: ["berita", "artikel"] })
    .notNull()
    .default("artikel"),
  authorId: text("author_id")
    .references(() => users.id, { onDelete: "set null" }),
  publishedAt: text("published_at"),
  ratingSum: integer("rating_sum").default(0),
  ratingCount: integer("rating_count").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  slugIdx: index("artikel_slug_idx").on(table.slug),
}));

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const visitorStats = sqliteTable("visitor_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryCode: text("country_code").notNull().unique(),
  countryName: text("country_name").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const pengurusLevelEnum = ["pimpinan", "sekretariat", "bidang", "koordinator"] as const;

export const organisasiPengurus = sqliteTable("organisasi_pengurus", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  dapukan: text("dapukan").notNull(),
  foto: text("foto"),
  level: text("level", { enum: ["pimpinan", "sekretariat", "bidang", "koordinator"] }).default("bidang"),
  bio: text("bio"),
  kontakWa: text("kontak_wa"),
  urutan: integer("urutan").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const kegiatanPublik = sqliteTable("kegiatan_publik", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  judul: text("judul").notNull(),
  excerpt: text("excerpt"),
  konten: text("konten"),
  coverImage: text("cover_image"),
  kategori: text("kategori").default("Sambung Rutin"),
  kategoriAcara: text("kategori_acara", { enum: ["sambung_rutin", "keakraban", "pemantapan", "lainnya"] }).default("lainnya"),
  kategoriCustom: text("kategori_custom"),
  tanggal: text("tanggal").notNull(),
  jam: text("jam"),
  lokasi: text("lokasi"),
  lat: real("lat"),
  lng: real("lng"),
  status: text("status", { enum: ["draft", "pending_review", "published", "rejected"] }).notNull().default("draft"),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (t) => ({
  slugIdx: index("kegiatan_publik_slug_idx").on(t.slug),
  statusIdx: index("kegiatan_publik_status_idx").on(t.status),
  tanggalIdx: index("kegiatan_publik_tanggal_idx").on(t.tanggal),
}));

export const galeri = sqliteTable("galeri", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  image: text("image").notNull(),
  kategori: text("kategori").default("Kegiatan"),
  type: text("type", { enum: ["photo", "reel", "quote"] }).default("photo"),
  aspectRatio: text("aspect_ratio", { enum: ["portrait", "landscape", "square", "tall"] }).default("portrait"),
  deskripsi: text("deskripsi"),
  quote: text("quote"),
  author: text("author"),
  durasi: text("durasi"),
  tanggal: text("tanggal"),
  lokasi: text("lokasi"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("published"),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (t) => ({
  statusIdx: index("galeri_status_idx").on(t.status),
  kategoriIdx: index("galeri_kategori_idx").on(t.kategori),
}));

export const saranMasukan = sqliteTable("saran_masukan", {
  id: text("id").primaryKey(),
  untuk: text("untuk").notNull(),
  kepada: text("kepada"),
  saran: text("saran").notNull(),
  nama: text("nama"), userId: text("user_id"),
  isAnonim: integer("is_anonim").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const profileChangeRequests = sqliteTable("profile_change_requests", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  section: text("section", { enum: ["kontak", "wilayah", "identitas"] }).notNull(),
  payload: text("payload").notNull(),
  reason: text("reason").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  generusIdIdx: index("profile_change_requests_generus_id_idx").on(table.generusId),
  statusIdx: index("profile_change_requests_status_idx").on(table.status),
}));

export type ProfileChangeRequest = typeof profileChangeRequests.$inferSelect;

export type Desa = typeof desa.$inferSelect;
export type Kelompok = typeof kelompok.$inferSelect;
export type User = typeof users.$inferSelect;
export type Generus = typeof generus.$inferSelect;
export type Kegiatan = typeof kegiatan.$inferSelect;
export type Absensi = typeof absensi.$inferSelect;
export type Artikel = typeof artikel.$inferSelect;
export type VisitorStats = typeof visitorStats.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type KegiatanPublik = typeof kegiatanPublik.$inferSelect;
export type Galeri = typeof galeri.$inferSelect;
export type MagicToken = typeof magicTokens.$inferSelect;
export type WilayahQr = typeof wilayahQr.$inferSelect;

export type NewDesa = typeof desa.$inferInsert;
export type NewKelompok = typeof kelompok.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewGenerus = typeof generus.$inferInsert;
export type NewKegiatan = typeof kegiatan.$inferInsert;
export type NewAbsensi = typeof absensi.$inferInsert;
export type NewArtikel = typeof artikel.$inferInsert;
export type NewVisitorStats = typeof visitorStats.$inferInsert;
export type NewSettings = typeof settings.$inferInsert;
export type NewKegiatanPublik = typeof kegiatanPublik.$inferInsert;
export type NewGaleri = typeof galeri.$inferInsert;
export type NewOrganisasiPengurus = typeof organisasiPengurus.$inferInsert;
export type NewSaranMasukan = typeof saranMasukan.$inferInsert;
export type NewProfileChangeRequest = typeof profileChangeRequests.$inferInsert;
export type NewMagicToken = typeof magicTokens.$inferInsert;
export type NewWilayahQr = typeof wilayahQr.$inferInsert;

export const rab = sqliteTable("rab", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  volume: integer("volume").notNull(),
  satuan: text("satuan").notNull(),
  hargaSatuan: integer("harga_satuan").notNull(),
  totalHarga: integer("total_harga").notNull(),
  keterangan: text("keterangan"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rab_kegiatan_id_idx").on(table.kegiatanId),
}));

export const rabApproval = sqliteTable("rab_approval", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  statusPengurus: text("status_pengurus", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  statusAdmin: text("status_admin", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  isSubmitted: integer("is_submitted").default(0),
  catatanPengurus: text("catatan_pengurus"),
  catatanAdmin: text("catatan_admin"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rab_approval_kegiatan_id_idx").on(table.kegiatanId),
}));

export const rundown = sqliteTable("rundown", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  waktu: text("waktu").notNull(),
  agenda: text("agenda").notNull(),
  pic: text("pic"),
  keterangan: text("keterangan"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rundown_kegiatan_id_idx").on(table.kegiatanId),
}));

export const rundownApproval = sqliteTable("rundown_approval", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  statusPengurus: text("status_pengurus", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  isSubmitted: integer("is_submitted").default(0),
  catatanPengurus: text("catatan_pengurus"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rundown_approval_kegiatan_id_idx").on(table.kegiatanId),
}));

export type Rab = typeof rab.$inferSelect;
export type RabApproval = typeof rabApproval.$inferSelect;
export type Rundown = typeof rundown.$inferSelect;
export type RundownApproval = typeof rundownApproval.$inferSelect;
export type NewRab = typeof rab.$inferInsert;
export type NewRabApproval = typeof rabApproval.$inferInsert;
export type NewRundown = typeof rundown.$inferInsert;
export type NewRundownApproval = typeof rundownApproval.$inferInsert;

export const fcmTokens = sqliteTable("fcm_tokens", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  token: text("token").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  phoneIdx: index("fcm_tokens_phone_idx").on(table.phone),
}));

export type FcmToken = typeof fcmTokens.$inferSelect;
export type NewFcmToken = typeof fcmTokens.$inferInsert;
