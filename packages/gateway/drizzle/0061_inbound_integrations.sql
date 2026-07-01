CREATE TABLE `inbound_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text,
	`created_by` text,
	`provider` text NOT NULL,
	`event_filter` text NOT NULL,
	`secret` text NOT NULL,
	`default_repo` text,
	`default_project_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inbound_sources_team_idx` ON `inbound_sources` (`team_id`);--> statement-breakpoint
CREATE TABLE `inbound_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`team_id` text,
	`provider` text NOT NULL,
	`event` text,
	`external_id` text,
	`result` text NOT NULL,
	`task_id` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inbound_deliveries_source_idx` ON `inbound_deliveries` (`source_id`);--> statement-breakpoint
CREATE INDEX `inbound_deliveries_team_idx` ON `inbound_deliveries` (`team_id`);
