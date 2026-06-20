import { describe, expect, it } from 'vitest';
import { TriggerSchema } from './trigger.js';

describe('TriggerSchema (discriminated union)', () => {
  it('narrows a manual trigger on its type', () => {
    const t = TriggerSchema.parse({ type: 'manual' });
    expect(t.type).toBe('manual');
  });

  it('defaults a schedule trigger timezone to UTC', () => {
    const t = TriggerSchema.parse({ type: 'schedule', cron: '0 * * * *' });
    if (t.type !== 'schedule') throw new Error('expected schedule');
    expect(t.timezone).toBe('UTC');
  });

  it('rejects a schedule trigger with an empty cron', () => {
    expect(TriggerSchema.safeParse({ type: 'schedule', cron: '' }).success).toBe(false);
  });

  it('defaults a webhook trigger method to POST and hasSecret to false', () => {
    const t = TriggerSchema.parse({ type: 'webhook' });
    if (t.type !== 'webhook') throw new Error('expected webhook');
    expect(t.method).toBe('POST');
    expect(t.hasSecret).toBe(false);
  });

  it('rejects an unknown discriminant', () => {
    expect(TriggerSchema.safeParse({ type: 'cron' }).success).toBe(false);
  });

  it('rejects a webhook trigger with an invalid method', () => {
    expect(TriggerSchema.safeParse({ type: 'webhook', method: 'TRACE' }).success).toBe(false);
  });
});
