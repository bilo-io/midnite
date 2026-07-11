CREATE TABLE `digests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`window_from` text NOT NULL,
	`window_to` text NOT NULL,
	`digest` text NOT NULL,
	`markdown` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digests_created_at_idx` ON `digests` (`created_at`);