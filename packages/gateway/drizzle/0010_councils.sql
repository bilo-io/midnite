CREATE TABLE `council_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`council_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`provider` text DEFAULT 'claude' NOT NULL,
	`perspective` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `council_participants_council_idx` ON `council_participants` (`council_id`);--> statement-breakpoint
CREATE TABLE `council_run_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`perspective` text NOT NULL,
	`status` text NOT NULL,
	`terminal_id` text NOT NULL,
	`output` text,
	`exit_code` integer,
	`error` text,
	`label` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `council_run_participants_run_idx` ON `council_run_participants` (`run_id`);--> statement-breakpoint
CREATE TABLE `council_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`council_id` text NOT NULL,
	`topic` text NOT NULL,
	`status` text NOT NULL,
	`verdict` text,
	`label_map` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `council_runs_council_idx` ON `council_runs` (`council_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `councils` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
