ALTER TABLE `council_runs` ADD `project_id` text;--> statement-breakpoint
CREATE INDEX `council_runs_project_idx` ON `council_runs` (`project_id`);
