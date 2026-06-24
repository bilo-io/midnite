ALTER TABLE `tasks` ADD `created_by` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `team_id` text;
--> statement-breakpoint
ALTER TABLE `repos` ADD `created_by` text;
--> statement-breakpoint
ALTER TABLE `repos` ADD `team_id` text;
--> statement-breakpoint
ALTER TABLE `workflows` ADD `created_by` text;
--> statement-breakpoint
ALTER TABLE `workflows` ADD `team_id` text;
--> statement-breakpoint
CREATE INDEX `tasks_created_by_idx` ON `tasks` (`created_by`);
--> statement-breakpoint
CREATE INDEX `tasks_team_id_idx` ON `tasks` (`team_id`);
--> statement-breakpoint
CREATE INDEX `repos_created_by_idx` ON `repos` (`created_by`);
--> statement-breakpoint
CREATE INDEX `workflows_created_by_idx` ON `workflows` (`created_by`);
