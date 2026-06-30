CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`team_id` text,
	`event` text NOT NULL,
	`status` text NOT NULL,
	`response_code` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook_idx` ON `webhook_deliveries` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_team_idx` ON `webhook_deliveries` (`team_id`);
