import { describe, expect, it } from 'vitest';

import {
  NonInteractiveError,
  canPrompt,
  confirmPrompt,
  passwordPrompt,
  pickTask,
  selectStatus,
  textPrompt,
} from './prompts';

// Vitest runs with no TTY on stdin/stdout, so `canPrompt()` is false and every
// flow that stands in for a required value must throw rather than hang.

describe('prompts — non-interactive gate', () => {
  it('canPrompt() is false without a TTY', () => {
    expect(canPrompt()).toBe(false);
  });

  it('confirmPrompt returns its fallback instead of prompting', async () => {
    expect(await confirmPrompt('ok?')).toBe(false);
    expect(await confirmPrompt('ok?', true)).toBe(true);
  });

  it('required-value prompts throw NonInteractiveError', async () => {
    await expect(passwordPrompt()).rejects.toBeInstanceOf(NonInteractiveError);
    await expect(textPrompt('Email', { required: true })).rejects.toBeInstanceOf(NonInteractiveError);
    await expect(selectStatus()).rejects.toBeInstanceOf(NonInteractiveError);
    await expect(
      pickTask([{ id: 't1', title: 'x', status: 'todo', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [] }]),
    ).rejects.toBeInstanceOf(NonInteractiveError);
  });
});
