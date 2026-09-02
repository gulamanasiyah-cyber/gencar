CREATE TABLE IF NOT EXISTS `kegiatan_peserta` (
  `id` text PRIMARY KEY NOT NULL,
  `kegiatan_id` text NOT NULL,
  `generus_id` text,
  `kelompok_id` integer,
  `desa_id` integer,
  `created_at` text DEFAULT (datetime('now')),
  FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_peserta_kegiatan_id_idx` ON `kegiatan_peserta` (`kegiatan_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_peserta_generus_id_idx` ON `kegiatan_peserta` (`generus_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_peserta_kelompok_id_idx` ON `kegiatan_peserta` (`kelompok_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_peserta_desa_id_idx` ON `kegiatan_peserta` (`desa_id`);
