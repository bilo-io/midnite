-- Phase 40 Theme A: idea entity + AI chat messages + project origin link.
-- ideas: the core entity. status progresses draft → refined → promoted.
-- idea_messages: the per-idea AI conversation history (user + assistant turns).
-- projects.idea_id: nullable back-link from the derived project to its source idea.
CREATE TABLE `ideas` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text,
  `created_by` text,
  `title` text NOT NULL,
  `body` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'draft',
  `project_id` text,
  `tags` text NOT NULL DEFAULT '[]',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ideas_team_idx` ON `ideas` (`team_id`);
--> statement-breakpoint
CREATE INDEX `ideas_status_idx` ON `ideas` (`status`);
--> statement-breakpoint
CREATE TABLE `idea_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `idea_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idea_messages_idea_idx` ON `idea_messages` (`idea_id`, `created_at`);
--> statement-breakpoint
ALTER TABLE `projects` ADD `idea_id` text;
