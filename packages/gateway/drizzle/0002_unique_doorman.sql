CREATE TABLE `task_links` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`label` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_links_task_idx` ON `task_links` (`task_id`);