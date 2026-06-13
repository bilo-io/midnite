CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_completed_idx` ON `notes` (`completed`);--> statement-breakpoint
CREATE INDEX `notes_position_idx` ON `notes` (`position`);--> statement-breakpoint
CREATE TABLE `routine_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routine_groups_routine_idx` ON `routine_groups` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routine_items_group_idx` ON `routine_items` (`group_id`);--> statement-breakpoint
CREATE TABLE `routine_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`date` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routine_progress_routine_date_idx` ON `routine_progress` (`routine_id`,`date`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
