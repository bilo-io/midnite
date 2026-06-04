CREATE TABLE `project_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`title` text,
	`favicon_url` text,
	`fetched_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `project_sources_project_idx` ON `project_sources` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tag` text NOT NULL,
	`color` text NOT NULL,
	`plan` text,
	`plan_updated_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` text;--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);