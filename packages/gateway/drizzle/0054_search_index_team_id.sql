-- Phase 38 Theme A: add team_id to FTS5 search_index.
-- FTS5 virtual tables cannot be ALTERed; drop + recreate is the only option.
-- The empty table is backfilled by SearchService.onApplicationBootstrap on startup.
DROP TABLE IF EXISTS `search_index`;
--> statement-breakpoint
CREATE VIRTUAL TABLE `search_index` USING fts5(
  type UNINDEXED,
  entity_id UNINDEXED,
  team_id UNINDEXED,
  title,
  body,
  tokenize = 'porter unicode61'
);
