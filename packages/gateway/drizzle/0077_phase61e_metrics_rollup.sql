CREATE TABLE `metrics_rollup` (
	`key` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`bucket_start` text NOT NULL,
	`source` text NOT NULL,
	`repo` text,
	`provider` text,
	`model` text,
	`run_count` integer,
	`done_count` integer,
	`abandoned_count` integer,
	`failed_count` integer,
	`cancelled_count` integer,
	`total_duration_ms` integer,
	`retried_runs` integer,
	`calls` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`est_cost_usd` real,
	`avg_queue_depth` real,
	`avg_slots_used` real,
	`avg_tick_latency_ms` real,
	`sample_count` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `metrics_rollup_period_bucket_idx` ON `metrics_rollup` (`period`,`bucket_start`);
