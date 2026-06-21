import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UsageSummaryResponse } from '@midnite/shared';
import type { UsageService } from './usage.service';
import { UsageController } from './usage.controller';

const fakeSummary = { groupBy: 'day', rows: [], total: {} } as unknown as UsageSummaryResponse;

function build() {
  const service = { summary: vi.fn(() => fakeSummary) } as unknown as UsageService;
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
