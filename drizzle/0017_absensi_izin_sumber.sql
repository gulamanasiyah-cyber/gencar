-- 0017: izin_sumber penanda asal status izin (ajuan vs bentrok)
ALTER TABLE `absensi` ADD `izin_sumber` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `absensi_izin_sumber_idx` ON `absensi` (`izin_sumber`);--> statement-breakpoint
