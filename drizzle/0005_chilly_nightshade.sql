CREATE TABLE `organisasi_pengurus` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`dapukan` text NOT NULL,
	`foto` text,
	`urutan` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `saran_masukan` (
	`id` text PRIMARY KEY NOT NULL,
	`untuk` text NOT NULL,
	`saran` text NOT NULL,
	`nama` text,
	`is_anonim` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
ALTER TABLE `artikel` ADD `rating_sum` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `artikel` ADD `rating_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `form_panitia_dan_pengurus` ADD `kegiatan_id` text REFERENCES mandiri_kegiatan(id);--> statement-breakpoint
ALTER TABLE `generus` ADD `nama_ortu` text;--> statement-breakpoint
ALTER TABLE `generus` ADD `kategori` text DEFAULT 'Generus';--> statement-breakpoint
ALTER TABLE `generus` ADD `no_telp_ortu` text;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `jam` text;--> statement-breakpoint
ALTER TABLE `mandiri` ADD `kegiatan_id` text REFERENCES mandiri_kegiatan(id);--> statement-breakpoint
ALTER TABLE `mandiri_kunjungan` ADD `kegiatan_id` text REFERENCES mandiri_kegiatan(id);--> statement-breakpoint
ALTER TABLE `mandiri_pemilihan` ADD `kegiatan_id` text REFERENCES mandiri_kegiatan(id);--> statement-breakpoint
CREATE INDEX `mandiri_pemilihan_pengirim_id_idx` ON `mandiri_pemilihan` (`pengirim_id`);--> statement-breakpoint
CREATE INDEX `mandiri_pemilihan_penerima_id_idx` ON `mandiri_pemilihan` (`penerima_id`);--> statement-breakpoint
ALTER TABLE `mandiri_rooms` ADD `started_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_plain` text;