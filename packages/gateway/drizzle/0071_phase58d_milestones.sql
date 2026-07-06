CREATE TABLE `roadmap_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` text,
	`team_id` text
);
--> statement-breakpoint
CREATE INDEX `roadmap_milestones_project_idx` ON `roadmap_milestones` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `roadmap_milestones_created_by_idx` ON `roadmap_milestones` (`created_by`);--> statement-breakpoint
CREATE INDEX `roadmap_milestones_team_idx` ON `roadmap_milestones` (`team_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `milestone_id` text;--> statement-breakpoint
CREATE INDEX `tasks_milestone_idx` ON `tasks` (`milestone_id`);