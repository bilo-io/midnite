DROP TABLE IF EXISTS `council_run_participants`;--> statement-breakpoint
DROP TABLE IF EXISTS `council_participants`;--> statement-breakpoint
DROP TABLE IF EXISTS `council_runs`;--> statement-breakpoint
DROP TABLE IF EXISTS `councils`;--> statement-breakpoint
DROP TABLE IF EXISTS `brainstorm_run_contributors`;--> statement-breakpoint
DROP TABLE IF EXISTS `brainstorm_runs`;--> statement-breakpoint
DROP TABLE IF EXISTS `brainstorm_contributors`;--> statement-breakpoint
DROP TABLE IF EXISTS `brainstorms`;--> statement-breakpoint
CREATE TABLE `council_members` (
	`id` text PRIMARY KEY NOT NULL,
	`council_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`provider` text DEFAULT 'claude' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `council_members_council_idx` ON `council_members` (`council_id`);--> statement-breakpoint
CREATE TABLE `council_run_members` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`terminal_id` text NOT NULL,
	`output` text,
	`exit_code` integer,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `council_run_members_run_idx` ON `council_run_members` (`run_id`);--> statement-breakpoint
CREATE TABLE `council_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`council_id` text NOT NULL,
	`prompt` text NOT NULL,
	`format` text DEFAULT 'brainstorm' NOT NULL,
	`status` text NOT NULL,
	`synth_provider` text,
	`synthesis` text,
	`syntheses` text,
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
	`synth_provider` text DEFAULT 'gemini' NOT NULL,
	`default_format` text DEFAULT 'brainstorm' NOT NULL,
	`custom_prompt` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
