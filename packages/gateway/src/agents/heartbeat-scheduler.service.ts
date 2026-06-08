import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { HeartbeatRun, HeartbeatTriggerSource, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AnthropicService } from '../agent/anthropic.service';
import { AgentsRepository } from './agents.repository';

const MS_PER_HOUR = 3_600_000;
const HEARTBEAT_MAX_TOKENS = 4096;

/**
 * A single gateway-owned tick loop (never parallel) that fires the primary
 * agent's heartbeat prompt once its interval has elapsed since the last fire.
 * The cadence is user data (primary.heartbeatIntervalH); this loop's tick is
 * coarse config. Mirrors WorkflowScheduler structurally but uses a simple
 * elapsed-since-lastHeartbeatAt check rather than cron.
 */
@Injectable()
export class HeartbeatScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatScheduler.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private abort: AbortController | undefined;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(AgentsRepository) private readonly repo: AgentsRepository,
    @Inject(AnthropicService) private readonly anthropic: AnthropicService,
  ) {}

  onModuleInit(): void {
    if (!this.config.agents.heartbeatEnabled) {
      this.logger.log('agents heartbeat disabled — scheduler not started');
      return;
    }
    const tickMs = this.config.agents.schedulerTickMs;
    this.timer = setInterval(() => this.tick(), tickMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    this.logger.log(`heartbeat scheduler started (tick=${tickMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.abort?.abort();
  }

  private tick(): void {
    if (this.running) return;
    const row = this.repo.getPrimary();
    // No primary configured, heartbeat off, or nothing to say → nothing to do.
    if (!row || row.heartbeatEnabled === 0 || !row.heartbeatPrompt.trim()) return;

    const intervalMs = row.heartbeatIntervalH * MS_PER_HOUR;
    const last = row.lastHeartbeatAt ? Date.parse(row.lastHeartbeatAt) : 0;
    const due = !row.lastHeartbeatAt || Date.now() - last >= intervalMs;
    if (!due) return;

    void this.executeHeartbeat('schedule').catch((err) => {
      this.logger.warn(
        `heartbeat tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  /**
   * Run the heartbeat once and record the outcome. Used by the tick (source
   * 'schedule') and the manual endpoint ('manual'). Manual bypasses the due
   * check and the feature flag but still honours `anthropic.enabled`. Always
   * returns the recorded run; never throws.
   */
  async executeHeartbeat(triggerSource: HeartbeatTriggerSource): Promise<HeartbeatRun> {
    const startedAt = new Date().toISOString();
    const id = randomUUID();
    const row = this.repo.getPrimary();
    const description = row?.description ?? '';
    const prompt = row?.heartbeatPrompt?.trim() ?? '';

    if (this.running) {
      return this.recordSkipped(id, triggerSource, startedAt, description, prompt, {
        error: 'another heartbeat run is already in progress',
      });
    }
    if (!prompt) {
      return this.recordSkipped(id, triggerSource, startedAt, description, prompt, {
        error: 'heartbeat prompt is empty',
      });
    }
    if (!this.anthropic.enabled) {
      return this.recordSkipped(id, triggerSource, startedAt, description, prompt, {
        error: 'AI is disabled — set ANTHROPIC_API_KEY or run `claude` to log in.',
        advance: triggerSource === 'schedule',
      });
    }

    this.running = true;
    this.abort = new AbortController();
    const model = this.anthropic.getActModel();

    // Insert the running row and advance the schedule clock BEFORE awaiting, so a
    // slow call can't be re-triggered by the next tick and a crash mid-run won't
    // double-fire (lastHeartbeatAt has already moved).
    this.repo.insertHeartbeatRun({
      id,
      status: 'running',
      triggerSource,
      model,
      systemPrompt: description || null,
      prompt,
      output: null,
      error: null,
      startedAt,
      finishedAt: null,
    });
    if (triggerSource === 'schedule') this.repo.advanceHeartbeat(startedAt, id);
    else this.repo.setLastHeartbeatRunId(id);

    try {
      const client = this.anthropic.getClient();
      const message = await client.messages.create(
        {
          model,
          max_tokens: HEARTBEAT_MAX_TOKENS,
          ...(description ? { system: description } : {}),
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: this.abort.signal },
      );
      const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      // The run row was inserted synchronously above, so the update always returns it.
      const updated = this.repo.updateHeartbeatRun(id, {
        status: 'succeeded',
        output: text,
        finishedAt: new Date().toISOString(),
      })!;
      return this.repo.hydrateRun(updated);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`heartbeat run ${id} failed: ${errorMsg}`);
      const updated = this.repo.updateHeartbeatRun(id, {
        status: 'failed',
        error: errorMsg,
        finishedAt: new Date().toISOString(),
      })!;
      return this.repo.hydrateRun(updated);
    } finally {
      this.running = false;
      this.abort = undefined;
    }
  }

  private recordSkipped(
    id: string,
    triggerSource: HeartbeatTriggerSource,
    startedAt: string,
    description: string,
    prompt: string,
    opts: { error: string; advance?: boolean },
  ): HeartbeatRun {
    const row = this.repo.insertHeartbeatRun({
      id,
      status: 'skipped',
      triggerSource,
      model: null,
      systemPrompt: description || null,
      prompt: prompt || null,
      output: null,
      error: opts.error,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    // Keep the loop quiet when AI is disabled: advance the clock so we don't
    // record a skip on every tick, but still leave an auditable trail.
    if (opts.advance) this.repo.advanceHeartbeat(startedAt, id);
    return this.repo.hydrateRun(row);
  }
}
