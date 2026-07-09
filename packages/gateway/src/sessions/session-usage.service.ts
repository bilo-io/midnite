import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SessionUsage } from '@midnite/shared';

import { estimateSessionCostUsd } from '../usage/lib/pricing';
import {
  SessionUsageRepository,
  type SessionUsageAttributionRow,
} from './session-usage.repository';
import { harvestTranscriptUsage } from './lib/transcript-usage';
import type { SessionUsageRow } from '../db/schema';

/**
 * Harvests real token usage from a Claude Code transcript and persists it per
 * session (Phase 61 A). Called on the Stop hook (which carries `transcript_path`)
 * — fail-open: a bad path or unreadable file logs `debug` and no-ops, never
 * throwing into the hook. Reads are exposed to the sessions cockpit so the
 * context gauge shows measured numbers when available.
 */
@Injectable()
export class SessionUsageService {
  private readonly logger = new Logger(SessionUsageService.name);

  constructor(
    @Inject(SessionUsageRepository) private readonly repo: SessionUsageRepository,
  ) {}

  /**
   * Parse a transcript and upsert the session's usage. `transcriptPath` comes
   * from the Stop-hook payload. No-ops when the path is missing/unreadable or the
   * transcript carries no usage records. Returns the stored usage, or null.
   */
  async harvestFromTranscript(
    sessionId: string,
    transcriptPath: string | undefined,
    now: string = new Date().toISOString(),
  ): Promise<SessionUsage | null> {
    if (!transcriptPath) return null;
    let harvested;
    try {
      harvested = await harvestTranscriptUsage(transcriptPath);
    } catch (err) {
      this.logger.debug(`transcript harvest failed for ${sessionId}: ${String(err)}`);
      return null;
    }
    if (!harvested) return null;

    const model = harvested.model;
    const estCostUsd = model
      ? estimateSessionCostUsd(model, {
          inputTokens: harvested.inputTokens,
          outputTokens: harvested.outputTokens,
          cachedReadTokens: harvested.cachedReadTokens,
          cachedWriteTokens: harvested.cachedWriteTokens,
        })
      : null;

    const agentCli = this.safeAgentCli();
    this.repo.upsert({
      sessionId,
      agentCli,
      model: model ?? null,
      inputTokens: harvested.inputTokens,
      outputTokens: harvested.outputTokens,
      cachedReadTokens: harvested.cachedReadTokens,
      cachedWriteTokens: harvested.cachedWriteTokens,
      contextTokens: harvested.contextTokens,
      estCostUsd,
      updatedAt: now,
    });

    return this.toContract({
      sessionId,
      agentCli: agentCli ?? null,
      model: model ?? null,
      inputTokens: harvested.inputTokens,
      outputTokens: harvested.outputTokens,
      cachedReadTokens: harvested.cachedReadTokens,
      cachedWriteTokens: harvested.cachedWriteTokens,
      contextTokens: harvested.contextTokens,
      estCostUsd,
      updatedAt: now,
    });
  }

  /** The measured usage for a session, or null when nothing has been harvested. */
  get(sessionId: string): SessionUsage | null {
    const row = this.repo.get(sessionId);
    return row ? this.toContract(row) : null;
  }

  /** Measured usage for many sessions, keyed by id (the list read path). */
  getManyMap(sessionIds: string[]): Map<string, SessionUsage> {
    const map = new Map<string, SessionUsage>();
    for (const row of this.repo.getMany(sessionIds)) {
      map.set(row.sessionId, this.toContract(row));
    }
    return map;
  }

  /**
   * Harvested rows in the [from, to] window (by harvest time), each joined to
   * its task's title/repo/project — the raw input for cost attribution
   * (Phase 61 B). Aggregation into buckets lives in `UsageService`.
   */
  listAttributionInRange(from?: string, to?: string): SessionUsageAttributionRow[] {
    return this.repo.listAttributionInRange(from, to);
  }

  private safeAgentCli(): string | null {
    try {
      return this.repo.getAgentCli();
    } catch {
      return null;
    }
  }

  private toContract(row: SessionUsageRow): SessionUsage {
    return {
      sessionId: row.sessionId,
      agentCli: row.agentCli ?? undefined,
      model: row.model ?? undefined,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cachedReadTokens: row.cachedReadTokens,
      cachedWriteTokens: row.cachedWriteTokens,
      contextTokens: row.contextTokens,
      estCostUsd: row.estCostUsd ?? null,
      measured: true,
      updatedAt: row.updatedAt,
    };
  }
}
