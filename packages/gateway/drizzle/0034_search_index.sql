-- Unified full-text search index (Phase 20 Theme A / Decision §3). One FTS5
-- virtual table ranks across every domain: a single `MATCH` query returns
-- tasks, projects, memories, notes, councils and workflows together. Drizzle
-- cannot model FTS5 virtual tables, so this migration is hand-authored and the
-- table is kept out of the typed schema — it is maintained from the service
-- write-path (CLAUDE.md bans triggers), with a boot backfill and a reindex route.
--
--   type       discriminates the entity ('task' | 'project' | ...) — indexed so
--              a `type = ?` constraint can scope results to one domain.
--   entity_id  UNINDEXED lookup key back to the source row (never searched).
--   title      the entity's name/title (boosted at query time in Theme B).
--   body       the entity's longer text (prompt / description / content).
CREATE VIRTUAL TABLE `search_index` USING fts5(
	type,
	entity_id UNINDEXED,
	title,
	body
);
