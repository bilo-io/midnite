-- Phase 36: workflow template marketplace.
-- Stores reusable, shareable workflow definitions that users can install
-- as a new workflow with credential slots mapped to their own credentials.
-- System templates (built-in seeds) have author_id = NULL.
CREATE TABLE `workflow_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`tags` text NOT NULL DEFAULT '[]',
	`credential_slots` text NOT NULL DEFAULT '[]',
	`definition` text NOT NULL,
	`thumbnail` text,
	`published` integer NOT NULL DEFAULT 1,
	`author_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_templates_slug_idx` ON `workflow_templates` (`slug`);
--> statement-breakpoint
CREATE INDEX `workflow_templates_category_idx` ON `workflow_templates` (`category`, `published`);
--> statement-breakpoint
CREATE INDEX `workflow_templates_author_idx` ON `workflow_templates` (`author_id`);
--> statement-breakpoint
-- installed_from_template_id on workflows: record-keeping so AiReviewService can
-- check if a run came from the ai-code-review template (Phase 37 Theme D2).
ALTER TABLE workflows ADD COLUMN installed_from_template_id TEXT;
