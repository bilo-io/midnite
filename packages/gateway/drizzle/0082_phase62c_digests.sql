CREATE TABLE `digests` (
	`id` text PRIMARY KEY NOT NULL,
	`window_from` text NOT NULL,
	`window_to` text NOT NULL,
	`task_count` integer DEFAULT 0 NOT NULL,
	`has_headline` integer DEFAULT 0 NOT NULL,
	`digest` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digests_created_at_idx` ON `digests` (`created_at`);
