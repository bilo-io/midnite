import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UsageAttributionResponse, UsageSummaryResponse } from '@midnite/shared';
import type { UsageService } from './usage.service';
import { UsageController } from './usage.controller';

const fakeSummary = { groupBy: 'day', rows: [], total: {} } as unknown as UsageSummaryResponse;
const fakeAttribution = {
  groupBy: 'repo',
  buckets: [],
} as unknown as UsageAttributionResponse;

function build() {
  const service = {
    summary: vi.fn(() => fakeSummary),
    attribution: vi.fn(() => fakeAttribution),
  } as unknown as UsageService;
  return { controller: new UsageController(service), service };
}

describe('UsageController', () => {
  it('rejects an unknown groupBy (400)', () => {
    const { controller } = build();
    expect(() => controller.summary({ groupBy: 'galaxy' })).toThrow(BadRequestException);
  });

  it('delegates with the parsed query (groupBy defaults to day)', () => {
    const { controller, service } = build();
    expect(controller.summary({})).toEqual(fakeSummary);
    expect(service.summary).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'day' }));
  });

  it('forwards from/to/groupBy through', () => {
    const { controller, service } = build();
    controller.summary({ from: '2026-06-01', to: '2026-06-30', groupBy: 'provider' });
    expect(service.summary).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-06-01', to: '2026-06-30', groupBy: 'provider' }),
    );
  });
});

describe('UsageController.attribution (Phase 61 B)', () => {
  it('rejects an unknown attribution groupBy (400)', () => {
    const { controller } = build();
    // day is valid for summary but NOT for attribution
    expect(() => controller.attribution({ groupBy: 'day' })).toThrow(BadRequestException);
  });

  it('defaults groupBy to repo and delegates', () => {
    const { controller, service } = build();
    expect(controller.attribution({})).toEqual(fakeAttribution);
    expect(service.attribution).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'repo' }));
  });

  it('forwards the attribution dimensions through', () => {
    const { controller, service } = build();
    controller.attribution({ from: '2026-06-01', to: '2026-06-30', groupBy: 'project' });
    expect(service.attribution).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-06-01', to: '2026-06-30', groupBy: 'project' }),
    );
  });
});
