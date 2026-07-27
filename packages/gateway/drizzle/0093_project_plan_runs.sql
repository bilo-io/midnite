CREATE TABLE `project_plan_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`terminal_id` text NOT NULL,
	`output` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `project_plan_runs_project_idx` ON `project_plan_runs` (`project_id`,`started_at`);
