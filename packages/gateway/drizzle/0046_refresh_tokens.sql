-- Phase 33: JWT refresh tokens stored as hashes (plaintext never at rest).
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_idx` ON `refresh_tokens` (`token_hash`);
