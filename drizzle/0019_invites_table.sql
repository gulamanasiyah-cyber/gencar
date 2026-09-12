-- 0019: Tabel invites untuk registrasi mandiri scoped per admin
CREATE TABLE IF NOT EXISTS `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`scope_role` text NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`duration_label` text,
	`expires_at` text,
	`consumed_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `invites_token_hash_unique` ON `invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_token_hash_idx` ON `invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_scope_role_idx` ON `invites` (`scope_role`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_desa_id_idx` ON `invites` (`desa_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_kelompok_id_idx` ON `invites` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_created_by_idx` ON `invites` (`created_by`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invites_status_idx` ON `invites` (`status`);--> statement-breakpoint
