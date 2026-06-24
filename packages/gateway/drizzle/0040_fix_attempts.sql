-- Phase 30 Theme C: auto-fix attempt counter (separate from retryCount).
-- fixAttempts tracks how many times the agent was re-spawned to fix a failing
-- quality gate; retryCount tracks crash-recovery retries. They are independent
-- counters so budget exhaustion is always attributable to the right axis.
ALTER TABLE tasks ADD COLUMN fix_attempts INTEGER NOT NULL DEFAULT 0;
