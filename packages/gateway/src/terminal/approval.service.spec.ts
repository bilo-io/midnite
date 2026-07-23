import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import { ApprovalService } from './approval.service';
import type { HookSecretRepository } from './hook-secret.repository';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from './terminal.service';

/** In-memory stand-in for the durable hook-secret store. */
class FakeSecretStore {
  readonly rows = new Map<string, string>();
  upsert(sessionId: string, secretHash: string): void {
    this.rows.set(sessionId, secretHash);
  }
  find(sessionId: string): string | undefined {
    return this.rows.get(sessionId);
  }
  delete(sessionId: string): void {
    this.rows.delete(sessionId);
  }
}

class FakeTerminal {
  subscribers = 1;
  readonly broadcasts: Array<{ sessionId: string; message: ServerTerminalMessage }> = [];
  subscriberCount(): number {
    return this.subscribers;
  }
  broadcastToSession(sessionId: string, message: ServerTerminalMessage): void {
    this.broadcasts.push({ sessionId, message });
  }
  requests(): Extract<ServerTerminalMessage, { type: 'approval-request' }>[] {
    return this.broadcasts
      .map((b) => b.message)
      .filter((m): m is Extract<ServerTerminalMessage, { type: 'approval-request' }> =>
        m.type === 'approval-request',
      );
  }
  lastRequestId(): string {
    const reqs = this.requests();
    return reqs[reqs.length - 1]!.requestId;
  }
  resolved(): Extract<ServerTerminalMessage, { type: 'approval-resolved' }>[] {
    return this.broadcasts
      .map((b) => b.message)
      .filter((m): m is Extract<ServerTerminalMessage, { type: 'approval-resolved' }> =>
        m.type === 'approval-resolved',
      );
  }
}

function setup(approvals: Record<string, unknown> = {}): {
  service: ApprovalService;
  terminal: FakeTerminal;
  resumeFromWaiting: ReturnType<typeof vi.fn>;
} {
  const config: MidniteConfig = parseConfig({
    agent: {},
    terminal: { approvals: { enabled: true, timeoutMs: 50, ...approvals } },
    knowledge: {},
    gateway: {},
  });
  const terminal = new FakeTerminal();
  // Only resumeFromWaiting is exercised here; the rest of TasksService is unused.
  const resumeFromWaiting = vi.fn();
  const tasks = { resumeFromWaiting } as unknown as TasksService;
  const service = new ApprovalService(
    config,
    terminal as unknown as TerminalService,
    undefined,
    undefined,
    undefined,
    tasks,
  );
  return { service, terminal, resumeFromWaiting };
}

const SID = 's1';
const bash = { tool_name: 'Bash', tool_input: { command: 'ls' } };

describe('ApprovalService secrets', () => {
  it('verifies a minted secret and rejects wrong/unknown', () => {
    const { service } = setup();
    const secret = service.mintSecret(SID);
    expect(service.verifySecret(SID, secret)).toBe(true);
    expect(service.verifySecret(SID, 'nope')).toBe(false);
    expect(service.verifySecret('other', secret)).toBe(false);
  });

  it('persists the hash so a restarted gateway can still verify (Phase 17 §C2)', () => {
    const config = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
    const store = new FakeSecretStore();
    const first = new ApprovalService(
      config,
      new FakeTerminal() as unknown as TerminalService,
      store as unknown as HookSecretRepository,
    );
    const secret = first.mintSecret(SID);
    expect(store.rows.has(SID)).toBe(true);

    // A fresh instance over the same store models a gateway restart: the
    // in-memory map is empty, but the persisted hash rehydrates verification.
    const afterRestart = new ApprovalService(
      config,
      new FakeTerminal() as unknown as TerminalService,
      store as unknown as HookSecretRepository,
    );
    expect(afterRestart.verifySecret(SID, secret)).toBe(true);
    expect(afterRestart.verifySecret(SID, 'wrong')).toBe(false);

    // clearSession forgets it from the durable store too.
    afterRestart.clearSession(SID);
    expect(store.rows.has(SID)).toBe(false);
    expect(afterRestart.verifySecret(SID, secret)).toBe(false);
  });
});

describe('ApprovalService.requestDecision', () => {
  it('prompts, then resolves allow when a viewer accepts', async () => {
    const { service, terminal } = setup();
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    // a prompt was broadcast
    expect(terminal.requests()).toHaveLength(1);
    service.resolveByUser(SID, terminal.lastRequestId(), 'allow');
    await expect(p).resolves.toEqual({ decision: 'allow', reason: 'allowed by user' });
    expect(terminal.resolved().at(-1)).toMatchObject({ decision: 'allow' });
  });

  it('denies when a viewer denies', async () => {
    const { service, terminal } = setup();
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.resolveByUser(SID, terminal.lastRequestId(), 'deny');
    await expect(p).resolves.toEqual({ decision: 'deny', reason: 'denied by user' });
  });

  it('caches allow-session and short-circuits the next same-tool request', async () => {
    const { service, terminal } = setup();
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.resolveByUser(SID, terminal.lastRequestId(), 'allow-session');
    await p;
    expect(terminal.requests()).toHaveLength(1);

    // Second Bash request resolves immediately, no new prompt broadcast.
    const p2 = await service.requestDecision(SID, bash, new AbortController().signal);
    expect(p2.decision).toBe('allow');
    expect(terminal.requests()).toHaveLength(1);
  });

  it('falls back per config when no viewer is connected', async () => {
    const { service, terminal } = setup({ onNoSubscriber: 'ask' });
    terminal.subscribers = 0;
    await expect(service.requestDecision(SID, bash, new AbortController().signal)).resolves.toEqual(
      { decision: 'ask', reason: 'no viewer connected' },
    );
    expect(terminal.requests()).toHaveLength(0);
  });

  it('times out to the fail-safe and broadcasts a resolution', async () => {
    const { service, terminal } = setup({ timeoutMs: 20, onTimeout: 'deny' });
    const decision = await service.requestDecision(SID, bash, new AbortController().signal);
    expect(decision.decision).toBe('deny');
    expect(terminal.resolved().at(-1)).toMatchObject({ decision: 'timeout' });
  });

  it('resolves to ask when the request is aborted', async () => {
    const { service } = setup({ timeoutMs: 10000 });
    const ac = new AbortController();
    const p = service.requestDecision(SID, bash, ac.signal);
    ac.abort();
    await expect(p).resolves.toEqual({ decision: 'ask', reason: 'request aborted' });
  });

  it('ignores a foreign/stale requestId, then resolves on the real one', async () => {
    const { service, terminal } = setup({ timeoutMs: 10000 });
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.resolveByUser(SID, 'bogus', 'allow'); // no-op
    service.resolveByUser('other-session', terminal.lastRequestId(), 'allow'); // wrong session, no-op
    service.resolveByUser(SID, terminal.lastRequestId(), 'allow');
    await expect(p).resolves.toMatchObject({ decision: 'allow' });
  });

  it('clearSession denies in-flight approvals and forgets the secret', async () => {
    const { service } = setup({ timeoutMs: 10000 });
    const secret = service.mintSecret(SID);
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.clearSession(SID);
    await expect(p).resolves.toMatchObject({ decision: 'deny' });
    expect(service.verifySecret(SID, secret)).toBe(false);
  });
});

// Regression: answering a permission modal must flip the task back to wip. The
// task is parked in `waiting` by the Notification hook while the PreToolUse hook
// blocks on the human; resolving it unblocks Claude mid-turn with no fresh prompt,
// so neither the UserPromptSubmit nor the (already-fired) PreToolUse resume runs —
// the resolve itself has to drive `waiting → wip`.
describe('ApprovalService — resolving resumes the blocked task', () => {
  it('resumes on a user allow', async () => {
    const { service, terminal, resumeFromWaiting } = setup({ timeoutMs: 10000 });
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.resolveByUser(SID, terminal.lastRequestId(), 'allow');
    await p;
    expect(resumeFromWaiting).toHaveBeenCalledWith(SID);
  });

  it('resumes on allow-session and on deny (Claude continues its turn either way)', async () => {
    for (const decision of ['allow-session', 'deny'] as const) {
      const { service, terminal, resumeFromWaiting } = setup({ timeoutMs: 10000 });
      const p = service.requestDecision(SID, bash, new AbortController().signal);
      service.resolveByUser(SID, terminal.lastRequestId(), decision);
      await p;
      expect(resumeFromWaiting).toHaveBeenCalledWith(SID);
    }
  });

  it('resumes on a timeout fail-safe (the decision is still handed to Claude)', async () => {
    const { service, resumeFromWaiting } = setup({ timeoutMs: 20, onTimeout: 'deny' });
    await service.requestDecision(SID, bash, new AbortController().signal);
    expect(resumeFromWaiting).toHaveBeenCalledWith(SID);
  });

  it('does NOT resume when the request is aborted (session/connection gone)', async () => {
    const { service, resumeFromWaiting } = setup({ timeoutMs: 10000 });
    const ac = new AbortController();
    const p = service.requestDecision(SID, bash, ac.signal);
    ac.abort();
    await p;
    expect(resumeFromWaiting).not.toHaveBeenCalled();
  });

  it('does NOT resume when clearSession tears down an in-flight approval', async () => {
    const { service, resumeFromWaiting } = setup({ timeoutMs: 10000 });
    const p = service.requestDecision(SID, bash, new AbortController().signal);
    service.clearSession(SID);
    await p;
    expect(resumeFromWaiting).not.toHaveBeenCalled();
  });
});
