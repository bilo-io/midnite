CREATE TABLE `sso_auth_state` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`redirect` text,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sso_auth_state_expires_idx` ON `sso_auth_state` (`expires_at`);
