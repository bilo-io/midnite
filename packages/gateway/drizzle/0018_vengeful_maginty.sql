ALTER TABLE `tasks` ADD `priority` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `tasks_status_priority_idx` ON `tasks` (`status`,`priority`);