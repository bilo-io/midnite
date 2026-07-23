ALTER TABLE `tasks` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `tasks_status_position_idx` ON `tasks` (`status`,`position`);