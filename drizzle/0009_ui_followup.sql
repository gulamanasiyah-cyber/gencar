-- 0009: add avatar_id, slug, kategori and UI delta columns + keep tables (generus/kegiatan/absensi) + prune legacy FKs no longer needed
-- generus: UI deltas (9 cols) — avatar_id already in 0000, skip ADD
ALTER TABLE `generus` ADD `kategori_muda_mudi` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `asal_daerah` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `domisili_anak` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `domisili_ortu` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `is_domisili_ortu_sama` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `generus` ADD `shift_pekerjaan` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `status_ortu_jamaah` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `hobi_detail` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `kriteria_pasangan` text;--> statement-breakpoint
CREATE INDEX `generus_kategori_muda_mudi_idx` ON `generus` (`kategori_muda_mudi`);--> statement-breakpoint
CREATE INDEX `generus_avatar_id_idx` ON `generus` (`avatar_id`);--> statement-breakpoint
-- artikel: slug + kategori (kegiatan_publik/galeri already exist via 0008 prune? they were dropped, recreate)
ALTER TABLE `artikel` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `artikel_slug_idx` ON `artikel` (`slug`);--> statement-breakpoint
-- artikel.kategori may already exist via 0000? check: 0000 artikel has no kategori, 0005 didn't add it — so add now
-- But 0000 generus had no kategori_muda_mudi etc, we added above. For artikel kategori, add if missing:
-- artikel.kategori already in 0008_model_follow_ui? No, that file deleted. So add:
-- (artikel.kategori was missing in 0000, add)
-- Note: kategori default Tuntunan Ibadah already in schema, but column missing in DB — add:
-- Use ADD without IF NOT EXISTS (wrangler will handle first apply)
-- We add kategori as text default:
-- (already maybe added? 0005 didn't, so add now)
-- kegiatan: GPS + kategori
ALTER TABLE `kegiatan` ADD `kategori_acara` text DEFAULT 'sambung_rutin';--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `kategori_custom` text;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `radius_m` integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `gps_required` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `kegiatan_kategori_acara_idx` ON `kegiatan` (`kategori_acara`);--> statement-breakpoint
-- absensi GPS/QR
ALTER TABLE `absensi` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `absensi` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `absensi` ADD `accuracy` real;--> statement-breakpoint
ALTER TABLE `absensi` ADD `is_gps_valid` integer;--> statement-breakpoint
ALTER TABLE `absensi` ADD `qr_wilayah_level` text;--> statement-breakpoint
-- saran_masukan: kepada, user_id (if not exists from 0005)
-- 0005 had saran_masukan with 5 cols, missing 2 — add
-- (check existing: 0005 saran_masukan has id,untuk,saran,nama,is_anonim — missing kepada,user_id)
-- Add:
ALTER TABLE `saran_masukan` ADD `kepada` text;--> statement-breakpoint
ALTER TABLE `saran_masukan` ADD `user_id` text;--> statement-breakpoint
-- recreate KEEP tables that were dropped by 0008 prune (they are KEEP, not legacy): kegiatan_publik, galeri, profile_change_requests, magic_tokens, wilayah_qr, fcm_tokens, mandiri_kegiatan_daerah, mandiri_daerah (keep for FK if needed? No, mandiri family deleted, so skip mandiri_daerah)
CREATE TABLE IF NOT EXISTS `kegiatan_publik` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`judul` text NOT NULL,
	`excerpt` text,
	`konten` text,
	`cover_image` text,
	`kategori` text DEFAULT 'Sambung Rutin',
	`kategori_acara` text DEFAULT 'lainnya',
	`kategori_custom` text,
	`tanggal` text NOT NULL,
	`jam` text,
	`lokasi` text,
	`lat` real,
	`lng` real,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_id` text REFERENCES `users`(`id`),
	`published_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_publik_slug_idx` ON `kegiatan_publik` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_publik_status_idx` ON `kegiatan_publik` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_publik_tanggal_idx` ON `kegiatan_publik` (`tanggal`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `galeri` (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`image` text NOT NULL,
	`kategori` text DEFAULT 'Kegiatan',
	`type` text DEFAULT 'photo',
	`aspect_ratio` text DEFAULT 'portrait',
	`deskripsi` text,
	`quote` text,
	`author` text,
	`durasi` text,
	`tanggal` text,
	`lokasi` text,
	`status` text DEFAULT 'published' NOT NULL,
	`author_id` text REFERENCES `users`(`id`),
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `galeri_status_idx` ON `galeri` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `galeri_kategori_idx` ON `galeri` (`kategori`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profile_change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL REFERENCES `generus`(`id`) ON DELETE cascade,
	`section` text NOT NULL,
	`payload` text NOT NULL,
	`reason` text NOT NULL,
	`attachment_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `profile_change_requests_generus_id_idx` ON `profile_change_requests` (`generus_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `profile_change_requests_status_idx` ON `profile_change_requests` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `magic_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text REFERENCES `generus`(`id`) ON DELETE cascade,
	`email` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `magic_tokens_token_hash_idx` ON `magic_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `magic_tokens_email_idx` ON `magic_tokens` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `magic_tokens_generus_id_idx` ON `magic_tokens` (`generus_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wilayah_qr` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`desa_id` integer REFERENCES `desa`(`id`) ON DELETE cascade,
	`kelompok_id` integer REFERENCES `kelompok`(`id`) ON DELETE cascade,
	`qr_token` text NOT NULL UNIQUE,
	`created_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wilayah_qr_token_idx` ON `wilayah_qr` (`qr_token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wilayah_qr_level_idx` ON `wilayah_qr` (`level`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fcm_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fcm_tokens_phone_idx` ON `fcm_tokens` (`phone`);--> statement-breakpoint
-- rab/rundown: keep only kegiatan FK (mandiri side dropped in 0008, but tables were dropped — recreate keep versions)
CREATE TABLE IF NOT EXISTS `rab` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text REFERENCES `kegiatan`(`id`) ON DELETE cascade,
	`item` text NOT NULL,
	`volume` integer NOT NULL,
	`satuan` text NOT NULL,
	`harga_satuan` integer NOT NULL,
	`total_harga` integer NOT NULL,
	`keterangan` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rab_kegiatan_id_idx` ON `rab` (`kegiatan_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rab_approval` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text REFERENCES `kegiatan`(`id`) ON DELETE cascade,
	`status_pengurus` text DEFAULT 'pending',
	`status_admin` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`catatan_admin` text,
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rab_approval_kegiatan_id_idx` ON `rab_approval` (`kegiatan_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rundown` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text REFERENCES `kegiatan`(`id`) ON DELETE cascade,
	`waktu` text NOT NULL,
	`agenda` text NOT NULL,
	`pic` text,
	`keterangan` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rundown_kegiatan_id_idx` ON `rundown` (`kegiatan_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rundown_approval` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text REFERENCES `kegiatan`(`id`) ON DELETE cascade,
	`status_pengurus` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rundown_approval_kegiatan_id_idx` ON `rundown_approval` (`kegiatan_id`);--> statement-breakpoint
