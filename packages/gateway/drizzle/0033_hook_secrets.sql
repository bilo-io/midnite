CREATE TABLE `hook_secrets` (
	`session_id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`created_at` text NOT NULL
);
