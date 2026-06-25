import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type {
  ApprovalDecision,
  ApprovalResolution,
  MidniteConfig,
  PendingApproval,
  PreToolUseHookDecision,
  PreToolUseHookRequest,
  TerminalApprovalRequestMessage,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { ApprovalsService } from '../approvals/approvals.service';
import { hashToken, tokenMatches } from '../lib/token-hash';
import { HookSecretRepository } from './hook-secret.repository';
import { ApprovalEventBus } from './approval-event-bus';
import { summarizeToolCall } from './lib/summarize-tool-call';
import { TerminalService, type TerminalSubscriber } from './terminal.service';

interface PendingEntry {
  sessionId: string;
  toolName: string;
  request: TerminalApprovalRequestMessage;
  requestedAt: string;
  deadlineAt: string | null;
  /** Resolves the blocked hook HTTP request; also detaches the abort listener. */
  resolve: (decision: PreToolUseHookDecision) => void;
  timer: NodeJS.Timeout | null;
}

/**
 * Human-in-the-loop tool approvals. Bridges the in-PTY PreToolUse hook (a blocking
 * HTTP call, authenticated by a per-session secret) to the browser over the existing
 * terminal WS: broadcasts an `approval-request`, waits for a viewer's `approval-response`,
 * and resolves the held HTTP request with the decision Claude Code expects.
 *
 * The UI/wire vocabulary (allow / allow-session / deny) is mapped here to Claude's
 * hook vocabulary (allow / deny / ask); fallbacks fail safe.
 */
@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);
  private readonly secrets = new Map<string, string>(); // sessionId -> secretHash
  private readonly pending = new Map<string, PendingEntry>(); // requestId -> pending
  private readonly allowList = new Map<string, Set<string>>(); // sessionId -> allowed toolNames

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    // TerminalService <-> ApprovalService form a lifecycle/broadcast cycle within
    // the terminal module; forwardRef breaks the DI ordering.
    @Inject(forwardRef(() => TerminalService)) private readonly terminal: TerminalService,
    // Durable secret store (Phase 17 §C2). Optional so direct construction in
    // specs keeps the pre-existing in-memory-only behaviour; Nest always injects it.
    @Optional() @Inject(HookSecretRepository) private readonly secretStore?: HookSecretRepository,
    // Policy engine (Phase 23 A2). Optional so terminal specs need no change.
    @Optional() @Inject(ApprovalsService) private readonly approvalsService?: ApprovalsService,
    // Cross-session inbox event bus (Phase 23 B). Optional so terminal specs need no change.
    @Optional() @Inject(ApprovalEventBus) private readonly eventBus?: ApprovalEventBus,
  ) {}

  // ---- per-session secret (authenticates the in-PTY hook callback) ----

  /** Mint a long-lived secret for a session's PTY; returns plaintext (stored
   *  hashed). The hash is also persisted so a durable session reattached after a
   *  gateway restart can still authenticate its hooks (the in-memory map is gone,
   *  but the running process keeps the plaintext in its env). */
  mintSecret(sessionId: string): string {
    const secret = randomBytes(24).toString('base64url');
    const hash = hashToken(secret);
    this.secrets.set(sessionId, hash);
    this.secretStore?.upsert(sessionId, hash, new Date().toISOString());
    return secret;
  }

  verifySecret(sessionId: string, token: string): boolean {
    // Rehydrate from the durable store on a cache miss — after a restart the map
    // is empty but a reattached session's secret is still on disk.
    let hash = this.secrets.get(sessionId);
    if (!hash) {
      hash = this.secretStore?.find(sessionId);
      if (hash) this.secrets.set(sessionId, hash);
    }
    if (!hash) return false;
    return tokenMatches(token, hash);
  }

  // Whether this tool call will be auto-approved without blocking on the user.
  // True when the tool is already on the session allow-list, or when there are
  // no terminal subscribers (so requestDecision would fall back immediately).
  willAutoApprove(sessionId: string, toolName: string): boolean {
    if (this.allowList.get(sessionId)?.has(toolName)) return true;
    if (this.terminal.subscriberCount(sessionId) === 0) return true;
    return false;
  }

  // ---- the blocking bridge: hook request -> WS prompt -> decision ----

  async requestDecision(
    sessionId: string,
    payload: PreToolUseHookRequest,
    signal: AbortSignal,
  ): Promise<PreToolUseHookDecision> {
    const toolName = payload.tool_name;

    // Already approved for the whole session — don't prompt again.
    if (this.allowList.get(sessionId)?.has(toolName)) {
      return { decision: 'allow', reason: 'allowed for this session' };
    }

    // Policy engine (Phase 23 A2+C): evaluate durable rules before asking a human.
    if (this.approvalsService) {
      const summary = summarizeToolCall(toolName, payload.tool_input);
      const verdict = this.approvalsService.evaluate(toolName, payload.tool_input);
      if (verdict === 'auto-allow') {
        this.approvalsService.logDecision({
          sessionId,
          toolName,
          summary,
          resolution: 'auto-allow',
          decidedBy: 'policy',
        });
        return { decision: 'allow', reason: 'allowed by policy rule' };
      }
      if (verdict === 'auto-deny') {
        this.approvalsService.logDecision({
          sessionId,
          toolName,
          summary,
          resolution: 'auto-deny',
          decidedBy: 'policy',
        });
        return { decision: 'deny', reason: 'denied by policy rule' };
      }
      // verdict === 'escalate' → fall through to human prompt
    }

    // No one is watching — fall back so an unattended session isn't wedged.
    if (this.terminal.subscriberCount(sessionId) === 0) {
      const fallback = this.config.terminal.approvals.onNoSubscriber;
      return { decision: fallback, reason: 'no viewer connected' };
    }

    if (signal.aborted) return { decision: 'ask', reason: 'request aborted' };

    const requestId = randomUUID();
    const request: TerminalApprovalRequestMessage = {
      type: 'approval-request',
      requestId,
      toolName,
      summary: summarizeToolCall(toolName, payload.tool_input),
      cwd: payload.cwd,
      options: ['allow', 'allow-session', 'deny'],
    };

    return new Promise<PreToolUseHookDecision>((resolve) => {
      const onAbort = () =>
        this.settle(requestId, 'expired', { decision: 'ask', reason: 'request aborted' });
      signal.addEventListener('abort', onAbort, { once: true });

      const timer = setTimeout(
        () =>
          this.settle(requestId, 'timeout', {
            decision: this.config.terminal.approvals.onTimeout,
            reason: 'approval timed out',
          }),
        this.config.terminal.approvals.timeoutMs,
      );
      timer.unref?.();

      const requestedAt = new Date().toISOString();
      const deadlineAt = new Date(
        Date.now() + this.config.terminal.approvals.timeoutMs,
      ).toISOString();
      this.pending.set(requestId, {
        sessionId,
        toolName,
        request,
        requestedAt,
        deadlineAt,
        resolve: (decision) => {
          signal.removeEventListener('abort', onAbort);
          resolve(decision);
        },
        timer,
      });
      this.eventBus?.emit({
        type: 'approval.requested',
        approval: {
          id: requestId,
          sessionId,
          taskId: sessionId,
          toolName,
          summary: request.summary,
          cwd: request.cwd ?? '',
          requestedAt,
          deadlineAt,
        },
      });
      this.terminal.broadcastToSession(sessionId, request);
      this.logger.log(`approval requested ${requestId} (${toolName}) on session ${sessionId}`);
    });
  }

  /** Resolve from a viewer's WS answer. No-op if the request is stale or foreign. */
  resolveByUser(sessionId: string, requestId: string, decision: ApprovalDecision): void {
    const entry = this.pending.get(requestId);
    if (!entry || entry.sessionId !== sessionId) return;
    if (decision === 'allow-session') {
      let set = this.allowList.get(sessionId);
      if (!set) {
        set = new Set();
        this.allowList.set(sessionId, set);
      }
      set.add(entry.toolName);
    }
    this.settle(requestId, decision, this.toHookDecision(decision));
  }

  /** Re-send still-pending prompts to a (re)attaching subscriber so the overlay survives a reconnect. */
  replayPending(sessionId: string, subscriber: TerminalSubscriber): void {
    for (const entry of this.pending.values()) {
      if (entry.sessionId === sessionId) subscriber.send(entry.request);
    }
  }

  /** PTY reaped — resolve everything safely (deny) and forget the session. */
  clearSession(sessionId: string): void {
    for (const [requestId, entry] of [...this.pending]) {
      if (entry.sessionId !== sessionId) continue;
      this.settle(requestId, 'expired', { decision: 'deny', reason: 'session ended' });
    }
    this.secrets.delete(sessionId);
    this.secretStore?.delete(sessionId);
    this.allowList.delete(sessionId);
  }

  // ---- internals ----

  /** Remove the pending entry, clear its timer, broadcast the resolution, resolve the HTTP wait. */
  private settle(
    requestId: string,
    resolution: ApprovalResolution,
    hookDecision: PreToolUseHookDecision,
  ): void {
    const entry = this.pending.get(requestId);
    if (!entry) return;
    this.pending.delete(requestId);
    if (entry.timer) clearTimeout(entry.timer);
    this.terminal.broadcastToSession(entry.sessionId, {
      type: 'approval-resolved',
      requestId,
      decision: resolution,
    });
    this.approvalsService?.logDecision({
      sessionId: entry.sessionId,
      toolName: entry.toolName,
      summary: entry.request.summary,
      resolution: resolution as import('@midnite/shared').ApprovalLogResolution,
      decidedBy: resolutionToDecidedBy(resolution),
    });
    this.eventBus?.emit({ type: 'approval.resolved', id: requestId, resolution });
    entry.resolve(hookDecision);
  }

  /** Expose the in-memory pending set for the cross-session inbox. */
  listPending(): PendingApproval[] {
    return [...this.pending.entries()].map(([id, entry]) => ({
      id,
      sessionId: entry.sessionId,
      taskId: entry.sessionId,
      toolName: entry.toolName,
      summary: entry.request.summary,
      cwd: entry.request.cwd ?? '',
      requestedAt: entry.requestedAt,
      deadlineAt: entry.deadlineAt,
    }));
  }

  private toHookDecision(decision: ApprovalDecision): PreToolUseHookDecision {
    if (decision === 'deny') return { decision: 'deny', reason: 'denied by user' };
    return {
      decision: 'allow',
      reason: decision === 'allow-session' ? 'allowed for this session' : 'allowed by user',
    };
  }
}

function resolutionToDecidedBy(
  resolution: ApprovalResolution,
): import('@midnite/shared').ApprovalDecidedBy {
  if (resolution === 'allow' || resolution === 'allow-session' || resolution === 'deny') {
    return 'user';
  }
  if (resolution === 'timeout') return 'timeout';
  return 'system'; // expired, ask
}
