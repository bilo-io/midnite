-- Phase 23 A1: durable tool-approval rules.
-- Each row is a 'global' scope rule evaluated before broadcasting to a human;
-- enabled=0 rules are skipped at evaluation time.
CREATE TABLE `approval_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL DEFAULT 1,
	`effect` text NOT NULL,
	`tool_name` text NOT NULL,
	`match` text,
	`scope` text NOT NULL DEFAULT 'global',
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `approval_rules_tool_idx` ON `approval_rules` (`tool_name`);
--> statement-breakpoint
CREATE INDEX `approval_rules_enabled_idx` ON `approval_rules` (`enabled`);
