CREATE TABLE `chat_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`team_id` text,
	`text` text NOT NULL,
	`intent_type` text NOT NULL,
	`inference_path` text NOT NULL,
	`affected_ids` text NOT NULL,
	`revert_plan` text NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text
);
--> statement-breakpoint
CREATE INDEX `chat_commands_user_idx` ON `chat_commands` (`user_id`);