CREATE TABLE `milestone_dependencies` (
	`milestone_id` text NOT NULL,
	`depends_on_milestone_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`milestone_id`, `depends_on_milestone_id`)
);
--> statement-breakpoint
CREATE INDEX `milestone_dependencies_depends_on_idx` ON `milestone_dependencies` (`depends_on_milestone_id`);
