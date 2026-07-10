PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_memory_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`url` text,
	`kind` text NOT NULL,
	`title` text,
	`favicon_url` text,
	`fetched_at` text,
	`created_at` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`extracted_text` text,
	`ingest_state` text,
	`ingest_error` text,
	`file_name` text,
	`mime_type` text,
	`storage_path` text,
	`byte_size` integer
);
--> statement-breakpoint
INSERT INTO `__new_memory_sources`("id", "memory_id", "url", "kind", "title", "favicon_url", "fetched_at", "created_at", "position") SELECT "id", "memory_id", "url", "kind", "title", "favicon_url", "fetched_at", "created_at", "position" FROM `memory_sources`;--> statement-breakpoint
DROP TABLE `memory_sources`;--> statement-breakpoint
ALTER TABLE `__new_memory_sources` RENAME TO `memory_sources`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `memory_sources_memory_idx` ON `memory_sources` (`memory_id`);