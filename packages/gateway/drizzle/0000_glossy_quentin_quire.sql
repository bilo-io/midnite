CREATE TABLE `task_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`path` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`original_name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_attachments_task_idx` ON `task_attachments` (`task_id`);--> statement-breakpoint
CREATE TABLE `task_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`at` text NOT NULL,
	`kind` text NOT NULL,
	`data` text
);
--> statement-breakpoint
CREATE INDEX `task_events_task_at_idx` ON `task_events` (`task_id`,`at`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`prompt` text,
	`repo` text,
	`agent_id` text,
	`session_id` text,
	`pr_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);