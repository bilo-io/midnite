import { describe, expect, it } from 'vitest';
import {
  ClientTerminalMessageSchema,
  PreToolUseHookRequestSchema,
  ServerTerminalMessageSchema,
} from './terminal.js';

describe('ClientTerminalMessageSchema', () => {
  it('round-trips an attach message', () => {
    const msg = {
      type: 'attach' as const,
      sessionId: 's1',
      token: 'tok',
      cols: 80,
      rows: 24,
    };
    expect(ClientTerminalMessageSchema.parse(msg)).toEqual(msg);
  });

  it('round-trips input and resize messages', () => {
    expect(
      ClientTerminalMessageSchema.parse({ type: 'input', data: 'bHM=' }),
    ).toEqual({ type: 'input', data: 'bHM=' });
    expect(
      ClientTerminalMessageSchema.parse({ type: 'resize', cols: 120, rows: 40 }),
    ).toEqual({ type: 'resize', cols: 120, rows: 40 });
  });

  it('round-trips an approval-response and rejects an unknown decision', () => {
    expect(
      ClientTerminalMessageSchema.parse({
        type: 'approval-response',
        requestId: 'r1',
        decision: 'allow-session',
      }),
    ).toEqual({ type: 'approval-response', requestId: 'r1', decision: 'allow-session' });
    expect(
      ClientTerminalMessageSchema.safeParse({
        type: 'approval-response',
        requestId: 'r1',
        decision: 'ask', // not a valid client decision
      }).success,
    ).toBe(false);
    expect(
      ClientTerminalMessageSchema.safeParse({
        type: 'approval-response',
        requestId: '',
        decision: 'allow',
      }).success,
    ).toBe(false);
  });

  it('rejects non-positive or oversized dimensions', () => {
    expect(
      ClientTerminalMessageSchema.safeParse({ type: 'resize', cols: 0, rows: 24 })
        .success,
    ).toBe(false);
    expect(
      ClientTerminalMessageSchema.safeParse({ type: 'resize', cols: 9999, rows: 24 })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(
      ClientTerminalMessageSchema.safeParse({ type: 'nope', data: 'x' }).success,
    ).toBe(false);
  });
});

describe('ServerTerminalMessageSchema', () => {
  it('round-trips output / status / error', () => {
    expect(
      ServerTerminalMessageSchema.parse({ type: 'output', data: 'aGk=', seq: 3 }),
    ).toEqual({ type: 'output', data: 'aGk=', seq: 3 });
    expect(
      ServerTerminalMessageSchema.parse({ type: 'status', phase: 'ready', pid: 42 }),
    ).toEqual({ type: 'status', phase: 'ready', pid: 42 });
    expect(
      ServerTerminalMessageSchema.parse({
        type: 'error',
        code: 'unauthorized',
        message: 'bad token',
      }),
    ).toEqual({ type: 'error', code: 'unauthorized', message: 'bad token' });
  });

  it('accepts a null exitCode on an exited status', () => {
    expect(
      ServerTerminalMessageSchema.parse({
        type: 'status',
        phase: 'exited',
        exitCode: null,
        signal: null,
      }),
    ).toMatchObject({ phase: 'exited', exitCode: null });
  });

  it('rejects an unknown error code and unknown type', () => {
    expect(
      ServerTerminalMessageSchema.safeParse({
        type: 'error',
        code: 'kaboom',
        message: 'x',
      }).success,
    ).toBe(false);
    expect(
      ServerTerminalMessageSchema.safeParse({ type: 'nope' }).success,
    ).toBe(false);
  });

  it('round-trips an approval-request, defaulting options', () => {
    expect(
      ServerTerminalMessageSchema.parse({
        type: 'approval-request',
        requestId: 'r1',
        toolName: 'Bash',
        summary: 'Bash: ls',
      }),
    ).toEqual({
      type: 'approval-request',
      requestId: 'r1',
      toolName: 'Bash',
      summary: 'Bash: ls',
      options: ['allow', 'allow-session', 'deny'],
    });
  });

  it('round-trips an approval-resolved with an automatic resolution', () => {
    expect(
      ServerTerminalMessageSchema.parse({
        type: 'approval-resolved',
        requestId: 'r1',
        decision: 'timeout',
      }),
    ).toEqual({ type: 'approval-resolved', requestId: 'r1', decision: 'timeout' });
  });
});

describe('PreToolUseHookRequestSchema', () => {
  it('requires tool_name and passes through extra fields', () => {
    const parsed = PreToolUseHookRequestSchema.parse({
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      cwd: '/repo',
      session_id: 's1',
      permission_mode: 'default',
    });
    expect(parsed.tool_name).toBe('Bash');
    expect((parsed as { permission_mode?: string }).permission_mode).toBe('default');
  });

  it('rejects a payload missing tool_name', () => {
    expect(PreToolUseHookRequestSchema.safeParse({ tool_input: {} }).success).toBe(false);
  });
});
