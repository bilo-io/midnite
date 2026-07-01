CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text,
	`created_by` text,
	`url` text NOT NULL,
	`provider` text NOT NULL,
	`event_filter` text NOT NULL,
	`secret` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `webhooks_team_idx` ON `webhooks` (`team_id`);