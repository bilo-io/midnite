CREATE TABLE `gauge_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`queue_depth` integer,
	`slots_used` integer,
	`slots_total` integer,
	`tick_latency_ms` integer
);
--> statement-breakpoint
CREATE INDEX `gauge_samples_at_idx` ON `gauge_samples` (`at`);