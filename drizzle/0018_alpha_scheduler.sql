-- 0018: Penanda kegiatan selesai diproses alpha sweep
ALTER TABLE `kegiatan` ADD `alpha_processed_at` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kegiatan_alpha_processed_at_idx` ON `kegiatan` (`alpha_processed_at`);--> statement-breakpoint
