-- Global full-text search index (Phase 20 Theme A).
-- A single unified FTS5 virtual table so one MATCH query ranks across every
-- domain. `type` + `entity_id` are stored-but-unindexed lookup keys back to the
-- source row; `title` and `body` are the indexed text. Maintained in the service
-- write-path (CLAUDE.md bans triggers, so there is no external-content sync trigger).
CREATE VIRTUAL TABLE `search_index` USING fts5(
  type UNINDEXED,
  entity_id UNINDEXED,
  title,
  body,
  tokenize = 'porter unicode61'
);
