CREATE TABLE `pr_status` (
	`task_id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`number` integer NOT NULL,
	`state` text NOT NULL,
	`checks` text DEFAULT 'none' NOT NULL,
	`review_decision` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pr_status_state_idx` ON `pr_status` (`state`);