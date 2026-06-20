CREATE TABLE `market_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_cache_fetched_idx` ON `market_cache` (`fetched_at`);