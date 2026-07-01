CREATE TABLE `slides` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slide_count` integer DEFAULT 0 NOT NULL,
	`format` text DEFAULT 'md' NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` text,
	`team_id` text
);
--> statement-breakpoint
CREATE INDEX `slides_updated_at_idx` ON `slides` (`updated_at`);
