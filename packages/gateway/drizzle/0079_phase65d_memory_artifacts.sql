CREATE TABLE `memory_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`kind` text NOT NULL,
	`format` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memory_artifacts_memory_idx` ON `memory_artifacts` (`memory_id`);
