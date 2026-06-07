CREATE TABLE `node_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`node_id` text NOT NULL,
	`node_type` text NOT NULL,
	`status` text NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`logs` text,
	`started_at` text,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `node_runs_run_idx` ON `node_runs` (`run_id`);--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`status` text NOT NULL,
	`trigger_source` text NOT NULL,
	`input` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `workflow_runs_workflow_idx` ON `workflow_runs` (`workflow_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT 0 NOT NULL,
	`trigger_type` text DEFAULT 'manual' NOT NULL,
	`trigger` text NOT NULL,
	`graph` text NOT NULL,
	`webhook_secret_hash` text,
	`last_fired_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflows_enabled_idx` ON `workflows` (`enabled`);--> statement-breakpoint
CREATE INDEX `workflows_trigger_type_idx` ON `workflows` (`trigger_type`);