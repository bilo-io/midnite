CREATE TABLE `memory_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`title` text,
	`favicon_url` text,
	`fetched_at` text,
	`created_at` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memory_sources_memory_idx` ON `memory_sources` (`memory_id`);--> statement-breakpoint
ALTER TABLE `global_sources` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_sources` ADD `position` integer DEFAULT 0 NOT NULL;