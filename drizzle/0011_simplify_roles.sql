-- 0011: simplify roles to admin_daerah, admin_desa, admin_kelompok, generus
-- Remap any legacy roles in existing users table
UPDATE `users` SET `role` = 'admin_daerah' WHERE `role` IN ('admin', 'pengurus_daerah', 'kmm_daerah', 'admin_keuangan', 'admin_kegiatan', 'creator');--> statement-breakpoint
UPDATE `users` SET `role` = 'admin_desa' WHERE `role` = 'desa';--> statement-breakpoint
UPDATE `users` SET `role` = 'admin_kelompok' WHERE `role` = 'kelompok';--> statement-breakpoint
UPDATE `users` SET `role` = 'generus' WHERE `role` IN ('peserta', 'usia_mandiri', 'pending', 'tim_pnkb', 'admin_romantic_room', 'tim_pnkb_gambuh', 'admin_pdkt');--> statement-breakpoint
