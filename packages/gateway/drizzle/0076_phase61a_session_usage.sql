CREATE TABLE `session_usage` (
	`session_id` text PRIMARY KEY NOT NULL,
	`agent_cli` text,
	`model` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_read_tokens` integer DEFAULT 0 NOT NULL,
	`cached_write_tokens` integer DEFAULT 0 NOT NULL,
	`context_tokens` integer DEFAULT 0 NOT NULL,
	`est_cost_usd` real,
	`updated_at` text NOT NULL
);
