-- Phase 37 Theme C1: owner_repo field on repos table.
-- Stores the GitHub "owner/repo" slug (e.g. "bilo-io/midnite") used to
-- route incoming webhook events to the right workflow instance and to
-- construct the "Connect GitHub webhook" instructions in the UI.
ALTER TABLE repos ADD COLUMN owner_repo TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX repos_owner_repo_idx ON repos(owner_repo) WHERE owner_repo IS NOT NULL;
