import { describe, expect, it } from 'vitest';
import { AGENT_CLIS } from '@midnite/shared';
import { oneshotCommand } from './oneshot-command';

describe('oneshotCommand', () => {
  it('passes the prompt as a single argv entry for every CLI', () => {
    const prompt = 'a topic with "quotes" and $vars and\nnewlines';
    for (const cli of AGENT_CLIS) {
      const { command, args } = oneshotCommand(cli, prompt);
      expect(command).toBeTruthy();
      expect(args).toContain(prompt);
    }
  });

  it('uses print mode for claude', () => {
    expect(oneshotCommand('claude', 'topic')).toEqual({
      command: 'claude',
      args: ['-p', 'topic'],
    });
  });

  it('uses exec for codex and run for opencode', () => {
    expect(oneshotCommand('codex', 'topic').args[0]).toBe('exec');
    expect(oneshotCommand('opencode', 'topic').args[0]).toBe('run');
  });

  it('uses the -z scripted one-shot flag for hermes', () => {
    expect(oneshotCommand('hermes', 'topic')).toEqual({
      command: 'hermes',
      args: ['-z', 'topic'],
    });
  });
});
