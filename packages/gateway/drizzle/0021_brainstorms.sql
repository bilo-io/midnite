CREATE TABLE `brainstorm_contributors` (
	`id` text PRIMARY KEY NOT NULL,
	`brainstorm_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`provider` text DEFAULT 'claude' NOT NULL,
	`lens` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brainstorm_contributors_brainstorm_idx` ON `brainstorm_contributors` (`brainstorm_id`);--> statement-breakpoint
CREATE TABLE `brainstorm_run_contributors` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`contributor_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`lens` text NOT NULL,
	`status` text NOT NULL,
	`terminal_id` text NOT NULL,
	`output` text,
	`exit_code` integer,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `brainstorm_run_contributors_run_idx` ON `brainstorm_run_contributors` (`run_id`);--> statement-breakpoint
CREATE TABLE `brainstorm_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`brainstorm_id` text NOT NULL,
	`prompt` text NOT NULL,
	`mode` text DEFAULT 'shortlist' NOT NULL,
	`status` text NOT NULL,
	`synth_provider` text,
	`synthesis` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `brainstorm_runs_brainstorm_idx` ON `brainstorm_runs` (`brainstorm_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `brainstorms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`synth_provider` text DEFAULT 'gemini' NOT NULL,
	`default_mode` text DEFAULT 'shortlist' NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
