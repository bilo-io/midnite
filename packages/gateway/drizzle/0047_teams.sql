CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_slug_idx` ON `teams` (`slug`);
--> statement-breakpoint
CREATE INDEX `teams_created_by_idx` ON `teams` (`created_by`);
--> statement-breakpoint
CREATE TABLE `team_memberships` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL DEFAULT 'member',
	`joined_at` text NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `team_memberships_user_idx` ON `team_memberships` (`user_id`);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`invited_by` text NOT NULL,
	`email` text,
	`token` text NOT NULL,
	`role` text NOT NULL DEFAULT 'member',
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invites_token_idx` ON `team_invites` (`token`);
--> statement-breakpoint
CREATE INDEX `team_invites_team_idx` ON `team_invites` (`team_id`);
