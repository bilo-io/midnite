import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { OpsSummary, OpsQuery } from '@midnite/shared';
import type { Db } from '../db/db.module';
import { DB } from '../db/db.module';
import { GaugeStore } from './gauge-store';
import { MetricsRepository } from './metrics.repository';

const DEFAULT_WINDOW_DAYS = 30;

function defaultFrom(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - DEFAULT_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly gauges = new GaugeStore();

  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() @Inject(MetricsRepository) private readonly repo?: MetricsRepository,
  ) {}

  recordQueueDepth(depth: number): void {
    this.gauges.recordQueueDepth(depth, new Date().toISOString());
  }

  recordSlotChange(used: number, total: number): void {
    this.gauges.recordSlotChange(used, total, new Date().toISOString());
  }

  recordTickLatency(ms: number): void {
    this.gauges.recordTickLatency(ms, new Date().toISOString());
  }

  recordRunStart(taskId: string, repo?: string | null): string {
    const id = randomUUID();
    try {
      this.repo?.insertStart({ id, taskId, repo: repo ?? null, startedAt: new Date().toISOString() });
    } catch (err) {
      this.logger.warn({ err }, 'metrics: recordRunStart failed');
    }
    return id;
  }

  recordRunEnd(runId: string, outcome: 'done' | 'abandoned' | 'failed' | 'cancelled', retryCount: number): void {
    const endedAt = new Date().toISOString();
    try {
      this.repo?.recordEnd(runId, outcome, retryCount, endedAt);
    } catch (err) {
      this.logger.warn({ err }, 'metrics: recordRunEnd failed');
    }
  }

  getOpsSummary(query: OpsQuery = {}): OpsSummary {
    const from = query.from ?? defaultFrom();
    const to = query.to ?? defaultTo();
    return {
      gauges: this.gauges.snapshot(),
      throughput: this.repo?.countByDay(from, to) ?? [],
      durations: this.repo?.durationBuckets(from, to) ?? { under30s: 0, under2m: 0, under10m: 0, under30m: 0, over30m: 0 },
      outcomes: this.repo?.outcomeCounts(from, to) ?? { done: 0, abandoned: 0, failed: 0, cancelled: 0 },
      window: { from, to },
    };
  }
}
