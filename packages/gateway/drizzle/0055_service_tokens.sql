-- Phase 38 Theme B: service account tokens for CI/CD + scripted integrations.
-- token_hash stores SHA-256(raw_token) — the raw token is never persisted.
-- prefix is the first 8 chars of the raw token, for identification in list views.
CREATE TABLE `service_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `token_hash` text NOT NULL,
  `prefix` text NOT NULL,
  `team_id` text,
  `created_by` text,
  `last_used_at` text,
  `expires_at` text,
  `revoked_at` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_tokens_hash_idx` ON `service_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `service_tokens_team_idx` ON `service_tokens` (`team_id`);
