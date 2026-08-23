-- Phase 84 Theme E — link a task to a GitHub Projects v2 item.
--
-- Modelled on `pr_status`: a satellite table for synced remote state, so the task row
-- stays clean and Theme F's poller has a small table to select stale rows from rather
-- than scanning every task.
--
-- Unlike `pr_status` (keyed on task_id alone) this carries its own `id`, because the
-- status mapping is a child table and needs something to point at.
CREATE TABLE `github_project_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`team_id` text,
	-- Projects v2 ids are opaque GraphQL node ids, never numbers.
	`project_node_id` text NOT NULL,
	`item_node_id` text NOT NULL,
	`project_title` text NOT NULL,
	`project_url` text NOT NULL,
	-- The single-select field a status maps onto. Null when the board has none, which is
	-- legal: the link still shows the item, pushes are simply no-ops.
	`status_field_node_id` text,
	-- The item's REAL column on GitHub as of the last read — not what midnite pushed.
	`status_option_name` text,
	`item_url` text NOT NULL,
	`last_synced_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
-- One link per task: the card shows a single board, and two links would make "which
-- column is this task in?" unanswerable.
CREATE UNIQUE INDEX `github_project_items_task_idx` ON `github_project_items` (`task_id`);--> statement-breakpoint
-- Mirrors `user_identities`' (provider, providerUserId) shape: the same GitHub item must
-- not be adopted by two different tasks.
CREATE UNIQUE INDEX `github_project_items_node_idx` ON `github_project_items` (`project_node_id`,`item_node_id`);--> statement-breakpoint

-- Status → column, one row per mapped status (normalised rather than a JSON blob).
-- A status with no row is a deliberate no-op on push: plenty of boards have no "Waiting"
-- column, and erroring would make a perfectly normal setup look broken.
CREATE TABLE `github_project_status_map` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`status` text NOT NULL,
	`option_id` text NOT NULL,
	-- Denormalised so the card renders without a GraphQL round-trip; refreshed on re-map.
	`option_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_project_status_map_pair_idx` ON `github_project_status_map` (`item_id`,`status`);--> statement-breakpoint
CREATE INDEX `github_project_status_map_item_idx` ON `github_project_status_map` (`item_id`);
