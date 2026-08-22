-- Phase 84 Theme A — give workflow credentials an owner.
--
-- Both columns are **nullable and unbackfilled on purpose**. A null `user_id` means
-- "shared with the whole install", which is exactly what every pre-existing row is: the
-- `github` PAT, the Slack token, the SMTP credential were all configured once for
-- everybody. Backfilling them to whoever happens to run the migration would silently
-- take them away from every other user and break the executors that resolve them.
--
-- `team_id` is written but not resolved on this phase (Decision §8): connections resolve
-- on `user_id` alone — one GitHub account per person, reused across their teams — and the
-- column exists so team-shared connections can arrive later without a second migration.
ALTER TABLE `workflow_credentials` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `workflow_credentials` ADD `team_id` text;--> statement-breakpoint
CREATE INDEX `workflow_credentials_user_idx` ON `workflow_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `workflow_credentials_type_idx` ON `workflow_credentials` (`type`);
