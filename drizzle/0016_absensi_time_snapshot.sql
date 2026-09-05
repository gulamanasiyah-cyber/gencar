-- 0016: Absensi auto-detect — rentang waktu kegiatan + snapshot wilayah
ALTER TABLE `kegiatan` ADD `tanggal_selesai` text;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `jam_mulai` text;--> statement-breakpoint
ALTER TABLE `kegiatan` ADD `jam_selesai` text;--> statement-breakpoint
UPDATE `kegiatan` SET `jam_mulai` = `jam` WHERE `jam_mulai` IS NULL AND `jam` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `absensi` ADD `desa_id` integer;--> statement-breakpoint
ALTER TABLE `absensi` ADD `kelompok_id` integer;--> statement-breakpoint
ALTER TABLE `absensi` ADD `catatan` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `absensi_desa_id_idx` ON `absensi` (`desa_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `absensi_kelompok_id_idx` ON `absensi` (`kelompok_id`);--> statement-breakpoint
