-- 0021: Tabel lowongan dan lowongan_reports untuk fitur Pekerjaan & Opportunity
CREATE TABLE IF NOT EXISTS `lowongan` (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`deskripsi` text NOT NULL,
	`pemberi` text NOT NULL,
	`tipe` text NOT NULL,
	`lokasi` text NOT NULL,
	`kontak` text NOT NULL,
	`expires_at` text NOT NULL,
	`author_id` text,
	`report_count` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`hidden_reason` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lowongan_hidden_expires_idx` ON `lowongan` (`hidden`, `expires_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lowongan_tipe_idx` ON `lowongan` (`tipe`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lowongan_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`lowongan_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`lowongan_id`) REFERENCES `lowongan`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `lowongan_reports_unique_idx` ON `lowongan_reports` (`lowongan_id`, `reporter_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lowongan_reports_lowongan_id_idx` ON `lowongan_reports` (`lowongan_id`);--> statement-breakpoint
