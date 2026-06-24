/**
 * Integration node executor unit tests (Phase 14 Theme C).
 *
 * Tests use mocked fetch / nodemailer transport so no real network calls are
 * made. The credential service is replaced with a lightweight fake that returns
 * a pre-built credential data object.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { WorkflowCredentialData } from '@midnite/shared';
import type { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import { SlackMessageExecutor } from './slack-message.executor';
import { EmailSendExecutor } from './email-send.executor';
import type { NodeRunContext } from '../node-executor';

// ---- helpers ---------------------------------------------------------------

function fakeCredentials(data: WorkflowCredentialData | null): WorkflowCredentialsService {
  return { resolve: (_id: string) => data } as unknown as WorkflowCredentialsService;
}

function makeCtx(params: Record<string, unknown>): NodeRunContext {
  return {
    params,
    input: {},
    signal: new AbortController().signal,
    log: vi.fn(),
  } as unknown as NodeRunContext;
}

// ---- SlackMessageExecutor --------------------------------------------------

describe('SlackMessageExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new SlackMessageExecutor(fakeCredentials(null));
    const ctx = makeCtx({ credentialId: 'missing', channel: '#general', text: 'hi' });
    await expect(exec.execute(ctx)).rejects.toThrow(/not found or could not be decrypted/);
  });

  it('throws when the credential type is wrong', async () => {
    const exec = new SlackMessageExecutor(
      fakeCredentials({ type: 'http-bearer', token: 'tok' }),
    );
    const ctx = makeCtx({ credentialId: 'c1', channel: '#general', text: 'hi' });
    await expect(exec.execute(ctx)).rejects.toThrow(/expected a 'slack' credential/);
  });

  it('calls chat.postMessage and returns ok + ts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, ts: '123.456', channel: 'C1234' }),
      }),
    );

    const exec = new SlackMessageExecutor(
      fakeCredentials({ type: 'slack', token: 'xoxb-test' }),
    );
    const result = await exec.execute(makeCtx({ credentialId: 'c1', channel: '#general', text: 'hello' }));
    expect(result).toEqual({ ok: true, ts: '123.456', channel: 'C1234' });

    const [url, opts] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect((opts.headers as Record<string, string>)['authorization']).toBe('Bearer xoxb-test');
    const body = JSON.parse(opts.body as string) as { channel: string; text: string };
    expect(body).toEqual({ channel: '#general', text: 'hello' });
  });

  it('throws when Slack API returns ok: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, error: 'channel_not_found' }),
      }),
    );
    const exec = new SlackMessageExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    await expect(exec.execute(makeCtx({ credentialId: 'c1', channel: '#bad', text: 'hi' }))).rejects.toThrow(
      /channel_not_found/,
    );
  });
});

// ---- EmailSendExecutor -----------------------------------------------------

describe('EmailSendExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new EmailSendExecutor(fakeCredentials(null));
    const ctx = makeCtx({ credentialId: 'x', to: 'a@b.com', subject: 'Hi', text: 'body' });
    await expect(exec.execute(ctx)).rejects.toThrow(/not found or could not be decrypted/);
  });

  it('throws when the credential type is wrong', async () => {
    const exec = new EmailSendExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    const ctx = makeCtx({ credentialId: 'x', to: 'a@b.com', subject: 'Hi', text: 'body' });
    await expect(exec.execute(ctx)).rejects.toThrow(/expected an 'smtp' credential/);
  });

  it('calls sendMail and returns ok + messageId', async () => {
    // Stub nodemailer at the module level.
    vi.mock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: vi.fn().mockResolvedValue({
            messageId: '<abc@example.com>',
            accepted: ['dest@example.com'],
          }),
        }),
      },
    }));

    const { EmailSendExecutor: Fresh } = await import('./email-send.executor');
    const smtpCred: WorkflowCredentialData = {
      type: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      username: 'user',
      password: 'pass',
    };
    const exec = new Fresh(fakeCredentials(smtpCred));
    const result = await exec.execute(
      makeCtx({ credentialId: 'c1', to: 'dest@example.com', subject: 'Hello', text: 'World' }),
    );
    expect(result).toMatchObject({ ok: true, messageId: '<abc@example.com>' });
  });
});
