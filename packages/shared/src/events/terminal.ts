import { z } from 'zod';

/**
 * WebSocket protocol for the live session terminal stream.
 *
 * A single endpoint (`/ws/terminal`) carries one PTY per connection. The
 * `sessionId` is supplied only in the first `attach` message; subsequent
 * `input`/`resize` messages are implicitly scoped to that connection's PTY.
 *
 * Terminal bytes (`input.data`, `output.data`) are **base64-encoded** so the
 * channel is binary-safe for ANSI escape sequences, control bytes, and
 * multibyte UTF-8 — none of which survive losslessly as raw JSON strings.
 */

const dimension = z.number().int().positive().max(1000);

// ---- approvals (human-in-the-loop tool gating) ----

/**
 * The choice a viewer makes on an approval prompt. `allow-session` means "stop
 * asking for this tool for the rest of the session". This is the UI/wire
 * vocabulary — distinct from what the gateway hands back to Claude Code's
 * PreToolUse hook (allow/deny/ask); that mapping lives in the gateway.
 */
export const ApprovalDecisionSchema = z.enum(['allow', 'allow-session', 'deny']);
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

/** How a pending approval ended: a viewer's choice, or an automatic resolution. */
export const ApprovalResolutionSchema = z.enum([
  'allow',
  'allow-session',
  'deny',
  'ask',
  'timeout',
  'expired',
  'auto-allow',
  'auto-deny',
]);
export type ApprovalResolution = z.infer<typeof ApprovalResolutionSchema>;

// ---- client -> gateway ----

export const TerminalAttachMessageSchema = z.object({
  type: z.literal('attach'),
  sessionId: z.string().min(1),
  token: z.string().min(1),
  cols: dimension,
  rows: dimension,
});

/**
 * Reconnect to an existing PTY carrying the last output `seq` the client
 * rendered (Phase 56 F — aligns the terminal with the board channels'
 * `subscribe`/`resume` vocabulary). The gateway replays ring frames the client
 * missed; if the ring rolled past `lastSeq` (a long disconnect overflowed the
 * scrollback buffer), it answers `resync-required` instead of a silent partial
 * replay. A fresh connection still uses `attach`.
 */
export const TerminalResumeMessageSchema = z.object({
  type: z.literal('resume'),
  sessionId: z.string().min(1),
  token: z.string().min(1),
  cols: dimension,
  rows: dimension,
  /** The highest output `seq` the client has already rendered. */
  lastSeq: z.number().int().nonnegative(),
});

export const TerminalInputMessageSchema = z.object({
  type: z.literal('input'),
  data: z.string(), // base64 keystrokes
});

export const TerminalResizeMessageSchema = z.object({
  type: z.literal('resize'),
  cols: dimension,
  rows: dimension,
});

/** A viewer answering a pending approval prompt. Scoped to the socket's PTY. */
export const TerminalApprovalResponseMessageSchema = z.object({
  type: z.literal('approval-response'),
  requestId: z.string().min(1),
  decision: ApprovalDecisionSchema,
});

export const ClientTerminalMessageSchema = z.discriminatedUnion('type', [
  TerminalAttachMessageSchema,
  TerminalResumeMessageSchema,
  TerminalInputMessageSchema,
  TerminalResizeMessageSchema,
  TerminalApprovalResponseMessageSchema,
]);

// ---- gateway -> client ----

export const TERMINAL_STATUS_PHASES = [
  'spawning',
  'ready',
  'reattached',
  'exited',
] as const;
export const TerminalStatusPhaseSchema = z.enum(TERMINAL_STATUS_PHASES);

export const TERMINAL_ERROR_CODES = [
  'unauthorized',
  'bad-message',
  'session-not-found',
  'spawn-failed',
  'limit',
  'internal',
] as const;
export const TerminalErrorCodeSchema = z.enum(TERMINAL_ERROR_CODES);

/**
 * A PTY output frame. Carries the `SequencedEnvelope` identity (`seq` + `ts`,
 * Phase 56 A) so the terminal shares the board channels' sequenced-stream
 * vocabulary — flattened alongside the `type` tag rather than nested under
 * `event`, because this socket multiplexes sequenced output with un-sequenced
 * control messages (status/error/approval) in one discriminated union. `seq` is
 * monotonic per PTY; the client tracks the highest it rendered to dedup replays
 * and to `resume`.
 */
export const TerminalOutputMessageSchema = z.object({
  type: z.literal('output'),
  seq: z.number().int().nonnegative(),
  /** Epoch ms when the gateway emitted the frame (envelope timestamp). */
  ts: z.number().int().nonnegative(),
  data: z.string(), // base64 pty output chunk
});

/** Why the gateway told a resuming client to resync (Phase 56 F). */
export const TERMINAL_RESYNC_REASONS = ['ring-overflow'] as const;
export const TerminalResyncReasonSchema = z.enum(TERMINAL_RESYNC_REASONS);

/**
 * The gateway can't replay a continuous stream from the client's `lastSeq` — the
 * scrollback ring rolled past it during a long disconnect. The client clears its
 * screen, drops its `lastSeq`, and re-renders from the fresh ring the gateway
 * replays next (the PTY ring *is* the recoverable transcript). Mirrors the board
 * channels' `resync-required` (Theme B) rather than delivering a drift-prone
 * partial replay.
 */
export const TerminalResyncRequiredMessageSchema = z.object({
  type: z.literal('resync-required'),
  reason: TerminalResyncReasonSchema,
  /** The stale `seq` the client resumed from (for logs + connection-status UI). */
  fromSeq: z.number().int().nonnegative(),
});

export const TerminalStatusMessageSchema = z.object({
  type: z.literal('status'),
  phase: TerminalStatusPhaseSchema,
  pid: z.number().int().optional(),
  /** The command backing this PTY (e.g. the shell path or `claude`), for honest UI labelling. */
  command: z.string().optional(),
  exitCode: z.number().int().nullable().optional(),
  signal: z.number().int().nullable().optional(),
});

export const TerminalErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: TerminalErrorCodeSchema,
  message: z.string(),
});

/** The agent is about to use a tool that needs approval — prompt the viewer(s). */
export const TerminalApprovalRequestMessageSchema = z.object({
  type: z.literal('approval-request'),
  requestId: z.string().min(1),
  toolName: z.string(),
  /** Human-readable one-liner, e.g. "Bash: rm -rf build/". */
  summary: z.string(),
  cwd: z.string().optional(),
  options: z.array(ApprovalDecisionSchema).default(['allow', 'allow-session', 'deny']),
});

/** A pending approval was resolved (by a viewer, the allow-list, or a timeout) — clear any overlay. */
export const TerminalApprovalResolvedMessageSchema = z.object({
  type: z.literal('approval-resolved'),
  requestId: z.string().min(1),
  decision: ApprovalResolutionSchema,
});

export const ServerTerminalMessageSchema = z.discriminatedUnion('type', [
  TerminalOutputMessageSchema,
  TerminalResyncRequiredMessageSchema,
  TerminalStatusMessageSchema,
  TerminalErrorMessageSchema,
  TerminalApprovalRequestMessageSchema,
  TerminalApprovalResolvedMessageSchema,
]);

// ---- token mint (REST) ----

export const TerminalTokenResponseSchema = z.object({
  token: z.string(),
  wsUrl: z.string(),
});

// ---- PreToolUse hook bridge (hook script <-> gateway, REST) ----

/**
 * Body the hook script POSTs to the gateway — Claude Code's PreToolUse stdin
 * payload. Kept permissive (`.passthrough()`) because the shape can drift; we
 * only need `tool_name` plus enough to summarize the call.
 */
export const PreToolUseHookRequestSchema = z
  .object({
    tool_name: z.string(),
    tool_input: z.unknown().optional(),
    cwd: z.string().optional(),
    session_id: z.string().optional(),
  })
  .passthrough();
export type PreToolUseHookRequest = z.infer<typeof PreToolUseHookRequestSchema>;

/** What the gateway returns to the hook script, which prints it to stdout for Claude. */
export const PreToolUseHookDecisionSchema = z.object({
  decision: z.enum(['allow', 'deny', 'ask']),
  reason: z.string().optional(),
});
export type PreToolUseHookDecision = z.infer<typeof PreToolUseHookDecisionSchema>;

// ---- inferred types ----

export type TerminalAttachMessage = z.infer<typeof TerminalAttachMessageSchema>;
export type TerminalResumeMessage = z.infer<typeof TerminalResumeMessageSchema>;
export type TerminalInputMessage = z.infer<typeof TerminalInputMessageSchema>;
export type TerminalResizeMessage = z.infer<typeof TerminalResizeMessageSchema>;
export type TerminalApprovalResponseMessage = z.infer<
  typeof TerminalApprovalResponseMessageSchema
>;
export type ClientTerminalMessage = z.infer<typeof ClientTerminalMessageSchema>;

export type TerminalOutputMessage = z.infer<typeof TerminalOutputMessageSchema>;
export type TerminalResyncReason = z.infer<typeof TerminalResyncReasonSchema>;
export type TerminalResyncRequiredMessage = z.infer<
  typeof TerminalResyncRequiredMessageSchema
>;
export type TerminalStatusMessage = z.infer<typeof TerminalStatusMessageSchema>;
export type TerminalErrorMessage = z.infer<typeof TerminalErrorMessageSchema>;
export type TerminalApprovalRequestMessage = z.infer<
  typeof TerminalApprovalRequestMessageSchema
>;
export type TerminalApprovalResolvedMessage = z.infer<
  typeof TerminalApprovalResolvedMessageSchema
>;
export type ServerTerminalMessage = z.infer<typeof ServerTerminalMessageSchema>;

export type TerminalStatusPhase = z.infer<typeof TerminalStatusPhaseSchema>;
export type TerminalErrorCode = z.infer<typeof TerminalErrorCodeSchema>;
export type TerminalTokenResponse = z.infer<typeof TerminalTokenResponseSchema>;

export const TERMINAL_WS_PATH = '/ws/terminal';
