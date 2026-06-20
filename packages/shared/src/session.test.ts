import { describe, expect, it } from 'vitest';
import {
  SessionStatusSchema,
  SessionSummarySchema,
  SessionTranscriptSchema,
  TranscriptMessageSchema,
} from './session.js';

describe('SessionStatusSchema', () => {
  it('accepts the declared statuses and rejects others', () => {
    for (const s of ['running', 'waiting', 'completed', 'idle']) {
      expect(SessionStatusSchema.parse(s)).toBe(s);
    }
    expect(SessionStatusSchema.safeParse('crashed').success).toBe(false);
  });
});

describe('SessionSummarySchema', () => {
  const base = {
    id: 's1',
    projectSlug: 'midnite',
    projectDisplay: 'midnite',
    title: 'Fix bug',
    subtitle: 'on main',
    status: 'running' as const,
    lastActivity: 1_700_000_000,
  };

  it('round-trips a minimal summary', () => {
    expect(SessionSummarySchema.parse(base)).toEqual(base);
  });

  it('rejects a negative contextTokens', () => {
    expect(SessionSummarySchema.safeParse({ ...base, contextTokens: -1 }).success).toBe(false);
  });
});

describe('TranscriptMessageSchema', () => {
  it('rejects an invalid role', () => {
    expect(
      TranscriptMessageSchema.safeParse({
        uuid: 'u1',
        role: 'tool',
        timestamp: 1,
        text: 'hi',
      }).success,
    ).toBe(false);
  });
});

describe('SessionTranscriptSchema', () => {
  it('round-trips a transcript with tool calls', () => {
    const transcript = {
      id: 's1',
      title: 'Fix bug',
      projectDisplay: 'midnite',
      status: 'completed' as const,
      messages: [
        {
          uuid: 'u1',
          role: 'assistant' as const,
          timestamp: 1,
          text: 'editing',
          toolCalls: [{ name: 'Edit', summary: 'patched file' }],
        },
      ],
    };
    expect(SessionTranscriptSchema.parse(transcript)).toEqual(transcript);
  });
});
