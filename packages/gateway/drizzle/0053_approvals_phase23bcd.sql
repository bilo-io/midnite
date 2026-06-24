CREATE TABLE `approval_log` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`task_id` text,
	`tool_name` text NOT NULL,
	`summary` text NOT NULL,
	`resolution` text NOT NULL,
	`rule_id` text,
	`decided_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `approval_log_session_idx` ON `approval_log` (`session_id`);
--> statement-breakpoint
CREATE INDEX `approval_log_task_idx` ON `approval_log` (`task_id`);
--> statement-breakpoint
CREATE INDEX `approval_log_time_idx` ON `approval_log` (`created_at`);
