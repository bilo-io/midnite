CREATE TABLE `memory_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`error` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memory_chat_messages_memory_idx` ON `memory_chat_messages` (`memory_id`);
