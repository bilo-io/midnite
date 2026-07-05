CREATE TABLE `pr_review_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`path` text NOT NULL,
	`line` integer NOT NULL,
	`side` text NOT NULL,
	`body` text NOT NULL,
	`author` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`github_comment_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pr_review_comments_task_author_idx` ON `pr_review_comments` (`task_id`,`author`,`state`);