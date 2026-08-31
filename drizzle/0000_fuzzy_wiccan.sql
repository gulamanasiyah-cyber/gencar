CREATE TABLE `absensi` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text NOT NULL,
	`generus_id` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')),
	`keterangan` text DEFAULT 'hadir',
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `absensi_kegiatan_id_idx` ON `absensi` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `absensi_generus_id_idx` ON `absensi` (`generus_id`);--> statement-breakpoint
CREATE TABLE `artikel` (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`konten` text NOT NULL,
	`ringkasan` text,
	`cover_image` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tipe` text DEFAULT 'artikel' NOT NULL,
	`author_id` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `desa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `generus` (
	`id` text PRIMARY KEY NOT NULL,
	`nomor_unik` text NOT NULL,
	`nama` text NOT NULL,
	`tempat_lahir` text,
	`tanggal_lahir` text,
	`jenis_kelamin` text NOT NULL,
	`kategori_usia` text NOT NULL,
	`alamat` text,
	`no_telp` text,
	`pendidikan` text,
	`pekerjaan` text,
	`status_nikah` text DEFAULT 'Belum Menikah',
	`hobi` text,
	`makanan_minuman_favorit` text,
	`suku` text,
	`foto` text,
	`avatar_id` text,
	`desa_id` integer,
	`kelompok_id` integer,
	`instagram` text,
	`is_generus` integer DEFAULT 0,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generus_nomor_unik_unique` ON `generus` (`nomor_unik`);--> statement-breakpoint
CREATE INDEX `generus_nama_idx` ON `generus` (`nama`);--> statement-breakpoint
CREATE INDEX `generus_desa_id_idx` ON `generus` (`desa_id`);--> statement-breakpoint
CREATE INDEX `generus_kelompok_id_idx` ON `generus` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX `generus_kategori_usia_idx` ON `generus` (`kategori_usia`);--> statement-breakpoint
CREATE INDEX `generus_jenis_kelamin_idx` ON `generus` (`jenis_kelamin`);--> statement-breakpoint
CREATE INDEX `generus_status_nikah_idx` ON `generus` (`status_nikah`);--> statement-breakpoint
CREATE INDEX `generus_is_generus_idx` ON `generus` (`is_generus`);--> statement-breakpoint
CREATE INDEX `generus_no_telp_idx` ON `generus` (`no_telp`);--> statement-breakpoint
CREATE TABLE `id_card_builder_data` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`daerah` text,
	`desa` text,
	`role` text,
	`dapukan` text,
	`foto` text,
	`nomor_unik` text NOT NULL,
	`jenis_kelamin` text,
	`kegiatan_id` text,
	`gradient` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `id_card_builder_nomor_unik_idx` ON `id_card_builder_data` (`nomor_unik`);--> statement-breakpoint
CREATE INDEX `id_card_builder_kegiatan_id_idx` ON `id_card_builder_data` (`kegiatan_id`);--> statement-breakpoint
CREATE TABLE `kegiatan` (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`deskripsi` text,
	`tanggal` text NOT NULL,
	`lokasi` text,
	`desa_id` integer,
	`kelompok_id` integer,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `kegiatan_desa_id_idx` ON `kegiatan` (`desa_id`);--> statement-breakpoint
CREATE INDEX `kegiatan_kelompok_id_idx` ON `kegiatan` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX `kegiatan_tanggal_idx` ON `kegiatan` (`tanggal`);--> statement-breakpoint
CREATE TABLE `kelompok` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`desa_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandiri` (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL,
	`nomor_urut` integer,
	`status_pdkt` text DEFAULT 'Aktif',
	`catatan` text,
	`last_session_token` text,
	`device_id` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mandiri_generus_id_idx` ON `mandiri` (`generus_id`);--> statement-breakpoint
CREATE TABLE `mandiri_absensi` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text NOT NULL,
	`generus_id` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')),
	`keterangan` text DEFAULT 'hadir',
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mandiri_absensi_kegiatan_id_idx` ON `mandiri_absensi` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `mandiri_absensi_generus_id_idx` ON `mandiri_absensi` (`generus_id`);--> statement-breakpoint
CREATE TABLE `mandiri_antrean` (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL,
	`status` text DEFAULT 'Menunggu',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandiri_desa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kota` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `mandiri_kegiatan` (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`deskripsi` text,
	`tanggal` text NOT NULL,
	`lokasi` text,
	`kota` text NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`kelompok_id`) REFERENCES `mandiri_kelompok`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `mandiri_kelompok` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`mandiri_desa_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandiri_kuisioner` (
	`id` text PRIMARY KEY NOT NULL,
	`pemilihan_id` text,
	`pengisi_id` text NOT NULL,
	`nama_pnkb` text,
	`no_hp_pnkb` text,
	`tanggapan` text,
	`rekomendasi` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pemilihan_id`) REFERENCES `mandiri_pemilihan`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pengisi_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandiri_kunjungan` (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL,
	`room_id` text NOT NULL,
	`pemilihan_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `mandiri_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pemilihan_id`) REFERENCES `mandiri_pemilihan`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `mandiri_kunjungan_generus_id_idx` ON `mandiri_kunjungan` (`generus_id`);--> statement-breakpoint
CREATE INDEX `mandiri_kunjungan_room_id_idx` ON `mandiri_kunjungan` (`room_id`);--> statement-breakpoint
CREATE TABLE `mandiri_pemilihan` (
	`id` text PRIMARY KEY NOT NULL,
	`pengirim_id` text NOT NULL,
	`penerima_id` text NOT NULL,
	`status` text DEFAULT 'Menunggu',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pengirim_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`penerima_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandiri_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`pemilihan_id` text,
	`status` text DEFAULT 'Kosong',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pemilihan_id`) REFERENCES `mandiri_pemilihan`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rab` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`item` text NOT NULL,
	`volume` integer NOT NULL,
	`satuan` text NOT NULL,
	`harga_satuan` integer NOT NULL,
	`total_harga` integer NOT NULL,
	`keterangan` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rab_kegiatan_id_idx` ON `rab` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `rab_mandiri_kegiatan_id_idx` ON `rab` (`mandiri_kegiatan_id`);--> statement-breakpoint
CREATE TABLE `rab_approval` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`status_pengurus` text DEFAULT 'pending',
	`status_admin` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`catatan_admin` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rab_approval_kegiatan_id_idx` ON `rab_approval` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `rab_approval_mandiri_kegiatan_id_idx` ON `rab_approval` (`mandiri_kegiatan_id`);--> statement-breakpoint
CREATE TABLE `rundown` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`waktu` text NOT NULL,
	`agenda` text NOT NULL,
	`pic` text,
	`keterangan` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rundown_kegiatan_id_idx` ON `rundown` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `rundown_mandiri_kegiatan_id_idx` ON `rundown` (`mandiri_kegiatan_id`);--> statement-breakpoint
CREATE TABLE `rundown_approval` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`status_pengurus` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rundown_approval_kegiatan_id_idx` ON `rundown_approval` (`kegiatan_id`);--> statement-breakpoint
CREATE INDEX `rundown_approval_mandiri_kegiatan_id_idx` ON `rundown_approval` (`mandiri_kegiatan_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'pending' NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`generus_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_desa_id_idx` ON `users` (`desa_id`);--> statement-breakpoint
CREATE INDEX `users_kelompok_id_idx` ON `users` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_generus_id_idx` ON `users` (`generus_id`);--> statement-breakpoint
CREATE TABLE `users_old` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'generus' NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`generus_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_old_email_unique` ON `users_old` (`email`);--> statement-breakpoint
CREATE INDEX `users_old_name_idx` ON `users_old` (`name`);--> statement-breakpoint
CREATE INDEX `users_old_email_idx` ON `users_old` (`email`);--> statement-breakpoint
CREATE INDEX `users_old_desa_id_idx` ON `users_old` (`desa_id`);--> statement-breakpoint
CREATE INDEX `users_old_kelompok_id_idx` ON `users_old` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX `users_old_role_idx` ON `users_old` (`role`);--> statement-breakpoint
CREATE INDEX `users_old_generus_id_idx` ON `users_old` (`generus_id`);--> statement-breakpoint
CREATE TABLE `visitor_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_stats_country_code_unique` ON `visitor_stats` (`country_code`);