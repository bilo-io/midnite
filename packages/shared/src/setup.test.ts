import { describe, expect, it } from 'vitest';
import {
  AGENT_POOL_SIZE_MAX,
  AGENT_POOL_SIZE_MIN,
  isSetupReady,
  SetupItemSchema,
  SetupStatusSchema,
  UpdateAgentPoolRequestSchema,
  type SetupItem,
  type SetupItemId,
  type SetupItemState,
} from './setup.js';

/** Build a full item set, overriding individual states. */
function items(overrides: Partial<Record<SetupItemId, SetupItemState>> = {}): SetupItem[] {
  const base: Record<SetupItemId, SetupItemState> = {
    provider: 'missing',
    'secret-key': 'missing',
    'agent-cli': 'missing',
    'agent-pool': 'warn',
    repo: 'warn',
    ...overrides,
  };
  return (Object.keys(base) as SetupItemId[]).map((id) => ({ id, label: id, state: base[id] }));
}

describe('SetupStatus schema', () => {
  it('validates a well-formed item (detail optional)', () => {
    expect(SetupItemSchema.safeParse({ id: 'provider', label: 'LLM provider', state: 'ok' }).success).toBe(
      true,
    );
    expect(
      SetupItemSchema.safeParse({ id: 'repo', label: 'Repo', state: 'warn', detail: 'none yet' }).success,
    ).toBe(true);
  });

  it('rejects unknown ids and states', () => {
    expect(SetupItemSchema.safeParse({ id: 'nope', label: 'x', state: 'ok' }).success).toBe(false);
    expect(SetupItemSchema.safeParse({ id: 'provider', label: 'x', state: 'green' }).success).toBe(false);
  });

  it('validates a full status payload', () => {
    expect(SetupStatusSchema.safeParse({ items: items(), ready: false }).success).toBe(true);
  });
});

describe('isSetupReady (Decision §3)', () => {
  it('is false on a fresh install (no secret key, no provider/CLI)', () => {
    expect(isSetupReady(items())).toBe(false);
  });

  it('needs the secret key even when a provider has a key', () => {
    expect(isSetupReady(items({ provider: 'ok' }))).toBe(false);
  });

  it('is ready with a secret key + a provider key', () => {
    expect(isSetupReady(items({ 'secret-key': 'ok', provider: 'ok' }))).toBe(true);
  });

  it('accepts a working agent CLI in place of a provider key', () => {
    expect(isSetupReady(items({ 'secret-key': 'ok', 'agent-cli': 'ok' }))).toBe(true);
  });

  it('is not ready with a secret key alone (no model reachable)', () => {
    expect(isSetupReady(items({ 'secret-key': 'ok' }))).toBe(false);
  });

  it('ignores warn items (pool/repo never block ready)', () => {
    expect(
      isSetupReady(items({ 'secret-key': 'ok', provider: 'ok', 'agent-pool': 'warn', repo: 'warn' })),
    ).toBe(true);
  });
});
