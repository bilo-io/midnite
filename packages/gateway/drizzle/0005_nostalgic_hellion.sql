CREATE TABLE `heartbeat_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`trigger_source` text NOT NULL,
	`model` text,
	`system_prompt` text,
	`prompt` text,
	`output` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `heartbeat_runs_started_idx` ON `heartbeat_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `primary_agent` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`heartbeat_enabled` integer DEFAULT 0 NOT NULL,
	`heartbeat_prompt` text DEFAULT '' NOT NULL,
	`heartbeat_interval_h` integer DEFAULT 4 NOT NULL,
	`last_heartbeat_at` text,
	`last_heartbeat_run_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subagents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
