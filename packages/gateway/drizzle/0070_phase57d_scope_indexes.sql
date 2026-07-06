-- Phase 57 D — only the genuinely-missing scope indexes. `tasks_created_by_idx`,
-- `tasks_team_id_idx`, and `workflows_created_by_idx` already exist (migration
-- 0048); they're now declared in schema.ts to reconcile the drift, but must NOT
-- be re-created here or the migration errors ("index already exists").
CREATE INDEX `projects_created_by_idx` ON `projects` (`created_by`);--> statement-breakpoint
CREATE INDEX `projects_team_idx` ON `projects` (`team_id`);--> statement-breakpoint
CREATE INDEX `workflows_team_idx` ON `workflows` (`team_id`);
