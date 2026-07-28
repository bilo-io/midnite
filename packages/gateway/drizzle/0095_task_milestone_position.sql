ALTER TABLE `tasks` ADD `milestone_position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `tasks_milestone_position_idx` ON `tasks` (`milestone_id`,`milestone_position`);
