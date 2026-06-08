ALTER TABLE `tasks` ADD `archived_at` text;--> statement-breakpoint
CREATE INDEX `tasks_archived_idx` ON `tasks` (`archived_at`);