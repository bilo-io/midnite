CREATE TABLE `task_check_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`trigger` text NOT NULL,
	`passed` integer NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`results` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_check_runs_task_idx` ON `task_check_runs` (`task_id`);