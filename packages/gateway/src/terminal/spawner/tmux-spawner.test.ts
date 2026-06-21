import { describe, expect, it } from 'vitest';
import {
  buildNewSessionArgs,
  buildSessionCommand,
  parsePaneStatus,
  parseSessionList,
  sessionName,
} from './tmux-spawner';
import type { SpawnSpec } from './spawner';

describe('tmux-spawner pure helpers', () => {
  it('names sessions deterministically from the session id', () => {
    expect(sessionName('task-abc')).toBe('midnite-task-abc');
  });

  describe('buildSessionCommand', () => {
    it('execs the command via env with shell-quoted args + env values', () => {
      const cmd = buildSessionCommand({
        command: 'claude',
        args: ['--foo', 'a b'],
        env: { PATH: '/usr/bin', TOK: "it's" },
      });
      expect(cmd).toBe("exec env PATH='/usr/bin' TOK='it'\\''s' 'claude' '--foo' 'a b'");
    });

    it('quotes a command containing spaces so the shell keeps it as one program', () => {
      const cmd = buildSessionCommand({ command: '/bin/odd cmd', args: [], env: {} });
      expect(cmd).toBe("exec env '/bin/odd cmd'");
    });
  });

  describe('buildNewSessionArgs', () => {
    const spec: SpawnSpec = {
      command: 'sh',
      args: ['-c', 'echo hi'],
      cwd: '/work',
      env: { A: '1' },
      cols: 100,
      rows: 40,
    };

    it('builds a detached, sized, cwd-rooted new-session with the exec command last', () => {
      const args = buildNewSessionArgs('midnite-x', spec);
      expect(args.slice(0, 11)).toEqual([
        'new-session',
        '-d',
        '-s',
        'midnite-x',
        '-x',
        '100',
        '-y',
        '40',
        '-c',
        '/work',
        buildSessionCommand(spec),
      ]);
    });

    it('falls back to default geometry when cols/rows are omitted', () => {
      const args = buildNewSessionArgs('midnite-x', { ...spec, cols: undefined, rows: undefined });
      expect(args).toContain('120');
      expect(args).toContain('32');
    });
  });

  describe('parseSessionList', () => {
    it('keeps only midnite-* sessions and strips the prefix', () => {
      const out = 'midnite-task-1\nmidnite-council-2\nmy-other-session\n\n';
      expect(parseSessionList(out)).toEqual(['task-1', 'council-2']);
    });

    it('returns nothing for empty output', () => {
      expect(parseSessionList('')).toEqual([]);
    });
  });

  describe('parsePaneStatus', () => {
    it('reads a dead pane and its exit status', () => {
      expect(parsePaneStatus('1|7')).toEqual({ dead: true, status: 7 });
    });

    it('treats a live pane as not dead', () => {
      expect(parsePaneStatus('0|')).toEqual({ dead: false, status: 0 });
    });

    it('defaults a dead pane with no recorded status to exit 0', () => {
      expect(parsePaneStatus('1|')).toEqual({ dead: true, status: 0 });
    });
  });
});
