CREATE TABLE `llm_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`feature` text DEFAULT 'unknown' NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`est_cost_usd` real DEFAULT 0 NOT NULL,
	`correlation_id` text
);
--> statement-breakpoint
CREATE INDEX `llm_usage_at_idx` ON `llm_usage` (`at`);--> statement-breakpoint
CREATE INDEX `llm_usage_feature_idx` ON `llm_usage` (`feature`);