-- Phase 37 Theme D1: ai_review JSON column on tasks table.
-- Stores the verdict, summary, runId, and timestamp from the last
-- AI code review workflow run that covered this task's PR.
ALTER TABLE tasks ADD COLUMN ai_review TEXT;
