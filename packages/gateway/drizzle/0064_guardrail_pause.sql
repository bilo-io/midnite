ALTER TABLE `approval_settings` ADD `paused_global` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `approval_settings` ADD `paused_repos` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `approval_settings` ADD `paused_teams` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `approval_settings` ADD `paused_by` text;--> statement-breakpoint
ALTER TABLE `approval_settings` ADD `paused_at` text;