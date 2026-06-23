import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { OpsSummary } from '@midnite/shared';
import { MetricsController } from './metrics.controller';
import type { MetricsService } from './metrics.service';

const emptySummary: OpsSummary = {
  gauges: {
    queueDepth: null,
    slotsUsed: null,
    slotsTotal: null,
    lastTickLatencyMs: null,
    updatedAt: null,
  },
  throughputByDay: [],
  durationBuckets: { lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0 },
  outcomeCounts: { done: 0, abandoned: 0, failed: 0, cancelled: 0 },
};

function makeController() {
  const service = {
    getOpsSummary: vi.fn().mockReturnValue(emptySummary),
  } as unknown as MetricsService;
  return { controller: new MetricsController(service), service };
}

describe('MetricsController', () => {
  it('GET /metrics/ops with no query returns the ops summary', () => {
    const { controller } = makeController();
    expect(controller.ops({})).toEqual(emptySummary);
  });

  it('passes a valid from/to window to the service', () => {
    const { controller, service } = makeController();
    controller.ops({ from: '2026-06-01T00:00:00.000Z', to: '2026-06-07T00:00:00.000Z' });
    expect(service.getOpsSummary).toHaveBeenCalledWith({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-07T00:00:00.000Z',
    });
  });

  it('strips unknown query params (zod passthrough off)', () => {
    const { controller, service } = makeController();
    controller.ops({ from: '2026-06-01T00:00:00.000Z', unknown: 'ignored' });
    const called = (service.getOpsSummary as ReturnType<typeof vi.fn>).mock.calls[0]![0] as object;
    expect(called).not.toHaveProperty('unknown');
  });

  it('throws BadRequestException on invalid query', () => {
    const { controller } = makeController();
    expect(() => controller.ops(null)).toThrow(BadRequestException);
  });
});
