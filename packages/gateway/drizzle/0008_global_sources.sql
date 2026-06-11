CREATE TABLE `global_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`title` text,
	`favicon_url` text,
	`fetched_at` text,
	`created_at` text NOT NULL
);
