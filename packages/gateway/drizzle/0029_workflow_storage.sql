CREATE TABLE `workflow_storage` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`scope` text,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_storage_workflow_key_idx` ON `workflow_storage` (`workflow_id`,`key`);