-- Phase 84 Theme C — project ↔ repo edges (many-to-many).
--
-- No backfill here on purpose: seeding an edge per project whose `work_dir`
-- matches a registered `repos.path` needs `realpath` (case-insensitive volumes,
-- symlinked checkouts — see Phase 84 Theme D), which SQL cannot do. The seed
-- runs once at boot in `ProjectsService.backfillProjectRepos()`, guarded so it
-- only ever inserts for projects that have no edges yet.
CREATE TABLE `project_repos` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`repo_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_repos_pair_idx` ON `project_repos` (`project_id`,`repo_id`);--> statement-breakpoint
CREATE INDEX `project_repos_project_idx` ON `project_repos` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_repos_repo_idx` ON `project_repos` (`repo_id`);
