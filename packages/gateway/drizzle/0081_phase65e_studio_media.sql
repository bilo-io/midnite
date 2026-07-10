ALTER TABLE `memory_artifacts` ADD `file_path` text;--> statement-breakpoint
ALTER TABLE `memory_artifacts` ADD `mime_type` text;--> statement-breakpoint
ALTER TABLE `memory_artifacts` ADD `file_size` integer;--> statement-breakpoint
ALTER TABLE `memory_artifacts` ADD `degraded` integer DEFAULT 0 NOT NULL;
