import { describe, expect, it } from 'vitest';
import {
  NotificationHookRequestSchema,
  StopHookRequestSchema,
} from './hooks.js';

describe('lifecycle hook request schemas', () => {
  it('parses a Stop payload and preserves unknown fields', () => {
    const parsed = StopHookRequestSchema.parse({
      session_id: 's1',
      stop_hook_active: true,
      transcript_path: '/tmp/t.jsonl',
      extra_field: 'kept',
    });
    expect(parsed.session_id).toBe('s1');
    expect(parsed.stop_hook_active).toBe(true);
    expect((parsed as Record<string, unknown>)['extra_field']).toBe('kept');
  });

  it('parses a Notification payload', () => {
    const parsed = NotificationHookRequestSchema.parse({
      session_id: 's2',
      message: 'Claude needs your input',
    });
    expect(parsed.message).toBe('Claude needs your input');
  });

  it('tolerates an empty payload (all fields optional)', () => {
    expect(() => StopHookRequestSchema.parse({})).not.toThrow();
  });
});
