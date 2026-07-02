CREATE TABLE `task_failures` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`class` text NOT NULL,
	`detail` text NOT NULL,
	`exit_code` integer,
	`last_output` text,
	`retry_index` integer NOT NULL,
	`team_id` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_failures_task_idx` ON `task_failures` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_failures_class_idx` ON `task_failures` (`class`);
