CREATE TABLE `project_docs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`color` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `project_docs_project_idx` ON `project_docs` (`project_id`);
