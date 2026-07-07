import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCycleTime, getGaugeHistory } from './api';

function mockJson(body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => '',
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const CYCLE_BODY = {
  from: 'a',
  to: 'b',
  groupBy: 'repo',
  groups: [
    {
      key: 'acme/api',
      taskCount: 2,
      wait: { p50Ms: 1000, p90Ms: 2000, count: 2 },
      work: { p50Ms: 3000, p90Ms: 4000, count: 2 },
      endToEnd: { p50Ms: 5000, p90Ms: 6000, count: 2 },
      retryOverheadMsTotal: 0,
      tasksWithRetries: 0,
    },
  ],
};

describe('getCycleTime', () => {
  it('builds the query string and parses the response', async () => {
    const fetchMock = mockJson(CYCLE_BODY);
    const res = await getCycleTime({ groupBy: 'repo', windowDays: 7 });
    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/metrics/cycle-time?');
    expect(url).toContain('groupBy=repo');
    expect(url).toContain('windowDays=7');
    expect(res.groups[0]?.key).toBe('acme/api');
  });

  it('omits params when none are given', async () => {
    const fetchMock = mockJson({ ...CYCLE_BODY, groupBy: 'none' });
    await getCycleTime();
    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toMatch(/\/metrics\/cycle-time$/);
  });
});

describe('getGaugeHistory', () => {
  it('passes from/to and parses samples', async () => {
    const fetchMock = mockJson({
      samples: [{ at: 't', queueDepth: 1, slotsUsed: 0, slotsTotal: 4, tickLatencyMs: 5 }],
      truncated: false,
    });
    const res = await getGaugeHistory({ from: '2026-07-01T00:00:00.000Z' });
    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/metrics/gauges/history?');
    expect(url).toContain('from=2026-07-01');
    expect(res.samples).toHaveLength(1);
  });
});
