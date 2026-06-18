CREATE TABLE `llm_providers` (
	`provider` text PRIMARY KEY NOT NULL,
	`api_key` text,
	`base_url` text,
	`plan_model` text,
	`act_model` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`active_provider` text DEFAULT 'anthropic' NOT NULL,
	`updated_at` text NOT NULL
);
