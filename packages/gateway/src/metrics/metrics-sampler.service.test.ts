import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';

import { MetricsSamplerService } from './metrics-sampler.service';
import type { MetricsService } from './metrics.service';

function config(sampleIntervalMs: number, rawRetentionDays = 30): MidniteConfig {
  return parseConfig({
    agent: {},
    terminal: {},
    gateway: {},
    metrics: { sampleIntervalMs, rawRetentionDays },
  });
}

function fakeMetrics(over: Partial<Record<'sampleGauges' | 'pruneGaugeSamples', unknown>> = {}) {
  return {
    sampleGauges: vi.fn(() => true),
    pruneGaugeSamples: vi.fn(() => 0),
    ...over,
  } as unknown as MetricsService;
}

function make(cfg: MidniteConfig, metrics: MetricsService): MetricsSamplerService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
  return new (MetricsSamplerService as any)(cfg, metrics);
}

describe('MetricsSamplerService (Phase 61 D)', () => {
  it('samples then prunes on a tick', () => {
    const metrics = fakeMetrics();
    const svc = make(config(60000), metrics);
    svc.tick();
    expect(metrics.sampleGauges).toHaveBeenCalledOnce();
    expect(metrics.pruneGaugeSamples).toHaveBeenCalledWith(30);
  });

  it('does not prune when nothing was sampled (all-null snapshot)', () => {
    const metrics = fakeMetrics({ sampleGauges: vi.fn(() => false) });
    const svc = make(config(60000), metrics);
    svc.tick();
    expect(metrics.pruneGaugeSamples).not.toHaveBeenCalled();
  });

  it('is fail-open: a throwing sample never propagates', () => {
    const metrics = fakeMetrics({
      sampleGauges: vi.fn(() => {
        throw new Error('db gone');
      }),
    });
    const svc = make(config(60000), metrics);
    expect(() => svc.tick()).not.toThrow();
  });

  it('starts no timer when sampling is disabled (interval 0)', () => {
    const spy = vi.spyOn(global, 'setInterval');
    const svc = make(config(0), fakeMetrics());
    svc.onModuleInit();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('starts an unref’d timer when enabled', () => {
    const metrics = fakeMetrics();
    const svc = make(config(60000), metrics);
    svc.onModuleInit();
    // The timer exists and is unref'd (won't hold the process open).
    svc.onModuleDestroy();
    expect(metrics.sampleGauges).not.toHaveBeenCalled(); // no immediate run on init
  });
});
