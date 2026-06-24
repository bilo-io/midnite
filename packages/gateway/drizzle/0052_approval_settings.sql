CREATE TABLE `approval_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL DEFAULT 'manual',
	`updated_at` text NOT NULL
);
