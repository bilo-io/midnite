CREATE TABLE `agent_run_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`duration_ms` integer,
	`outcome` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`repo` text
);
--> statement-breakpoint
CREATE INDEX `agent_run_stats_task_idx` ON `agent_run_stats` (`task_id`);--> statement-breakpoint
CREATE INDEX `agent_run_stats_started_idx` ON `agent_run_stats` (`started_at`);