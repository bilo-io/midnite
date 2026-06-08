import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import { ApprovalService } from './approval.service';
import type { TerminalService } from './terminal.service';

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
} {
  const config: MidniteConfig = parseConfig({
    agent: {},
    terminal: { approvals: { enabled: true, timeoutMs: 50, ...approvals } },
    knowledge: {},
    gateway: {},
  });
  const terminal = new FakeTerminal();
  const service = new ApprovalService(config, terminal as unknown as TerminalService);
  return { service, terminal };
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
