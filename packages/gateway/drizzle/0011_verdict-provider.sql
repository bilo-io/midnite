ALTER TABLE `council_runs` ADD `verdict_provider` text;--> statement-breakpoint
ALTER TABLE `councils` ADD `verdict_provider` text DEFAULT 'gemini' NOT NULL;