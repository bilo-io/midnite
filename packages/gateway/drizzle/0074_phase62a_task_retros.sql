CREATE TABLE `task_retros` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`outcome` text NOT NULL,
	`has_narrative` integer DEFAULT 0 NOT NULL,
	`retro` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_retros_task_id_unique` ON `task_retros` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_retros_outcome_idx` ON `task_retros` (`outcome`);