-- 0013: Add approval fields to kegiatan_peserta
-- status: pending | approved | rejected (default: approved for backward compat)
-- requestedBy: userId siapa yang mengundang
-- approvedBy: userId siapa yang approve/reject

ALTER TABLE `kegiatan_peserta` ADD COLUMN `status` text NOT NULL DEFAULT 'approved';
ALTER TABLE `kegiatan_peserta` ADD COLUMN `requested_by` text;
ALTER TABLE `kegiatan_peserta` ADD COLUMN `approved_by` text;
ALTER TABLE `kegiatan_peserta` ADD COLUMN `updated_at` text DEFAULT (datetime('now'));

CREATE INDEX IF NOT EXISTS `kegiatan_peserta_status_idx` ON `kegiatan_peserta` (`status`);
