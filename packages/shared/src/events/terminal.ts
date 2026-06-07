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

// ---- client -> gateway ----

export const TerminalAttachMessageSchema = z.object({
  type: z.literal('attach'),
  sessionId: z.string().min(1),
  token: z.string().min(1),
  cols: dimension,
  rows: dimension,
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

export const ClientTerminalMessageSchema = z.discriminatedUnion('type', [
  TerminalAttachMessageSchema,
  TerminalInputMessageSchema,
  TerminalResizeMessageSchema,
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

export const TerminalOutputMessageSchema = z.object({
  type: z.literal('output'),
  data: z.string(), // base64 pty output chunk
  seq: z.number().int().nonnegative(),
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

export const ServerTerminalMessageSchema = z.discriminatedUnion('type', [
  TerminalOutputMessageSchema,
  TerminalStatusMessageSchema,
  TerminalErrorMessageSchema,
]);

// ---- token mint (REST) ----

export const TerminalTokenResponseSchema = z.object({
  token: z.string(),
  wsUrl: z.string(),
});

// ---- inferred types ----

export type TerminalAttachMessage = z.infer<typeof TerminalAttachMessageSchema>;
export type TerminalInputMessage = z.infer<typeof TerminalInputMessageSchema>;
export type TerminalResizeMessage = z.infer<typeof TerminalResizeMessageSchema>;
export type ClientTerminalMessage = z.infer<typeof ClientTerminalMessageSchema>;

export type TerminalOutputMessage = z.infer<typeof TerminalOutputMessageSchema>;
export type TerminalStatusMessage = z.infer<typeof TerminalStatusMessageSchema>;
export type TerminalErrorMessage = z.infer<typeof TerminalErrorMessageSchema>;
export type ServerTerminalMessage = z.infer<typeof ServerTerminalMessageSchema>;

export type TerminalStatusPhase = z.infer<typeof TerminalStatusPhaseSchema>;
export type TerminalErrorCode = z.infer<typeof TerminalErrorCodeSchema>;
export type TerminalTokenResponse = z.infer<typeof TerminalTokenResponseSchema>;

export const TERMINAL_WS_PATH = '/ws/terminal';
