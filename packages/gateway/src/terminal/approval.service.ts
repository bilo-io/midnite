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
import { summarizeToolCall } from './lib/summarize-tool-call';
import { TerminalService, type TerminalSubscriber } from './terminal.service';
import { ApprovalEventBus } from './approval-event-bus';

interface PendingEntry {
  sessionId: string;
  taskId: string | null;
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
 * Phase 23 B: also emits `approval.requested`/`approval.resolved` events on the
 * ApprovalEventBus so the global inbox WS can fan out to all connected clients.
 */
@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);
  private readonly secrets = new Map<string, string>(); // sessionId -> secretHash
  private readonly pending = new Map<string, PendingEntry>(); // requestId -> pending
  private readonly allowList = new Map<string, Set<string>>(); // sessionId -> allowed toolNames

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(forwardRef(() => TerminalService)) private readonly terminal: TerminalService,
    @Optional() @Inject(HookSecretRepository) private readonly secretStore?: HookSecretRepository,
    @Optional() @Inject(ApprovalsService) private readonly approvalsService?: ApprovalsService,
    @Optional() @Inject(ApprovalEventBus) private readonly eventBus?: ApprovalEventBus,
  ) {}

  // ---- per-session secret ----

  mintSecret(sessionId: string): string {
    const secret = randomBytes(24).toString('base64url');
    const hash = hashToken(secret);
    this.secrets.set(sessionId, hash);
    this.secretStore?.upsert(sessionId, hash, new Date().toISOString());
    return secret;
  }

  verifySecret(sessionId: string, token: string): boolean {
    let hash = this.secrets.get(sessionId);
    if (!hash) {
      hash = this.secretStore?.find(sessionId);
      if (hash) this.secrets.set(sessionId, hash);
    }
    if (!hash) return false;
    return tokenMatches(token, hash);
  }

  willAutoApprove(sessionId: string, toolName: string): boolean {
    if (this.allowList.get(sessionId)?.has(toolName)) return true;
    if (this.terminal.subscriberCount(sessionId) === 0) return true;
    return false;
  }

  // ---- list pending (for REST GET + WS replay) ----

  listPending(sessionId?: string): PendingApproval[] {
    const entries = sessionId
      ? [...this.pending.values()].filter((e) => e.sessionId === sessionId)
      : [...this.pending.values()];
    return entries.map((e) => ({
      id: e.request.requestId,
      sessionId: e.sessionId,
      taskId: e.taskId,
      toolName: e.toolName,
      summary: e.request.summary,
      cwd: e.request.cwd ?? '',
      requestedAt: e.requestedAt,
      deadlineAt: e.deadlineAt,
    }));
  }

  // ---- the blocking bridge ----

  async requestDecision(
    sessionId: string,
    payload: PreToolUseHookRequest,
    signal: AbortSignal,
    taskId?: string | null,
  ): Promise<PreToolUseHookDecision> {
    const toolName = payload.tool_name;

    if (this.allowList.get(sessionId)?.has(toolName)) {
      return { decision: 'allow', reason: 'allowed for this session' };
    }

    // Policy engine (Phase 23 A2+C): evaluate durable rules before asking a human.
    if (this.approvalsService) {
      const summary = summarizeToolCall(toolName, payload.tool_input);
      const decision = this.approvalsService.evaluate(toolName, payload.tool_input);
      if (decision.verdict === 'auto-allow') {
        this.approvalsService.logDecision({
          sessionId,
          toolName,
          summary,
          resolution: 'auto-allow',
          decidedBy: 'policy',
          ruleId: decision.ruleId,
        });
        return { decision: 'allow', reason: 'allowed by policy rule' };
      }
      if (decision.verdict === 'auto-deny') {
        this.approvalsService.logDecision({
          sessionId,
          toolName,
          summary,
          resolution: 'auto-deny',
          decidedBy: 'policy',
          ruleId: decision.ruleId,
        });
        // A blast-radius guard (Phase 50 C) carries a specific reason; a plain
        // deny rule falls back to the generic message.
        return { decision: 'deny', reason: decision.reason ?? 'denied by policy rule' };
      }
    }

    if (this.terminal.subscriberCount(sessionId) === 0) {
      const fallback = this.config.terminal.approvals.onNoSubscriber;
      this.approvalsService?.logDecision({
        sessionId,
        toolName,
        summary: summarizeToolCall(toolName, payload.tool_input),
        resolution: fallback as import('@midnite/shared').ApprovalLogResolution,
        decidedBy: 'system',
      });
      return { decision: fallback, reason: 'no viewer connected' };
    }

    if (signal.aborted) return { decision: 'ask', reason: 'request aborted' };

    const requestId = randomUUID();
    const now = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + this.config.terminal.approvals.timeoutMs).toISOString();
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

      const entry: PendingEntry = {
        sessionId,
        taskId: taskId ?? null,
        toolName,
        request,
        requestedAt: now,
        deadlineAt,
        resolve: (decision) => {
          signal.removeEventListener('abort', onAbort);
          resolve(decision);
        },
        timer,
      };
      this.pending.set(requestId, entry);
      this.terminal.broadcastToSession(sessionId, request);

      this.eventBus?.emit({
        type: 'approval.requested',
        approval: {
          id: requestId,
          sessionId,
          taskId: taskId ?? null,
          toolName,
          summary: request.summary,
          cwd: request.cwd ?? '',
          requestedAt: now,
          deadlineAt,
        },
      });

      this.logger.log(`approval requested ${requestId} (${toolName}) on session ${sessionId}`);
    });
  }

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

  replayPending(sessionId: string, subscriber: TerminalSubscriber): void {
    for (const entry of this.pending.values()) {
      if (entry.sessionId === sessionId) subscriber.send(entry.request);
    }
  }

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

    this.eventBus?.emit({ type: 'approval.resolved', id: requestId, resolution });

    this.approvalsService?.logDecision({
      sessionId: entry.sessionId,
      toolName: entry.toolName,
      summary: entry.request.summary,
      resolution: resolution as import('@midnite/shared').ApprovalLogResolution,
      decidedBy: resolutionToDecidedBy(resolution),
    });

    entry.resolve(hookDecision);
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
