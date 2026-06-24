CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`payload` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX `audit_user_time_idx` ON `audit_log` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);
