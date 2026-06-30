import chalk from 'chalk';
import { afterEach, describe, expect, it } from 'vitest';

import {
  colourBool,
  colourKind,
  colourPriority,
  colourStatus,
  dim,
  error,
  success,
} from './palette.js';

/**
 * Run `fn` with stdout pretending to be (or not be) a TTY. chalk does its own
 * colour-support detection and disables under the (non-TTY) test runner, so we
 * also pin `chalk.level` to mirror what a real terminal would do.
 */
function withTty(tty: boolean, fn: () => void): void {
  const desc = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const prevNoColor = process.env.NO_COLOR;
  const prevLevel = chalk.level;
  delete process.env.NO_COLOR;
  Object.defineProperty(process.stdout, 'isTTY', { value: tty, configurable: true });
  chalk.level = tty ? 3 : 0;
  try {
    fn();
  } finally {
    if (desc) Object.defineProperty(process.stdout, 'isTTY', desc);
    else delete (process.stdout as { isTTY?: boolean }).isTTY;
    if (prevNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = prevNoColor;
    chalk.level = prevLevel;
  }
}

const ESC = '\x1b[';

afterEach(() => {
  delete process.env.NO_COLOR;
});

describe('non-interactive (piped)', () => {
  it('returns every token plain — no ANSI', () => {
    withTty(false, () => {
      expect(colourStatus('wip')).toBe('wip');
      expect(colourKind('bug')).toBe('bug');
      expect(colourPriority(3)).toBe('3');
      expect(colourBool(true)).toBe('yes');
      expect(success('ok')).toBe('ok');
    });
  });
});

describe('interactive (TTY)', () => {
  it('wraps known statuses/kinds in ANSI', () => {
    withTty(true, () => {
      expect(colourStatus('wip')).toContain(ESC);
      expect(colourStatus('wip')).toContain('wip');
      expect(colourKind('bug')).toContain(ESC);
    });
  });

  it('leaves unknown status/kind values plain', () => {
    withTty(true, () => {
      expect(colourStatus('frobnicate')).toBe('frobnicate');
      expect(colourKind('mystery')).toBe('mystery');
    });
  });

  it('colours priority by level (0 dim, 1 plain, 3 urgent)', () => {
    withTty(true, () => {
      expect(colourPriority(0)).toContain(ESC);
      expect(colourPriority(1)).toBe('1'); // normal priority is uncoloured
      expect(colourPriority(3)).toContain(ESC);
    });
  });

  it('separates a custom display string from the semantic key', () => {
    withTty(true, () => {
      // Padded display text, coloured by the underlying status key.
      const padded = colourStatus('wip   ', 'wip');
      expect(padded).toContain('wip   ');
      expect(padded).toContain(ESC);
    });
  });

  it('colours booleans green/dim', () => {
    withTty(true, () => {
      expect(colourBool(true)).toContain(ESC);
      expect(colourBool(false)).toContain(ESC);
      expect(colourBool(true)).toContain('yes');
      expect(colourBool(false)).toContain('no');
    });
  });

  it('generic accents wrap text', () => {
    withTty(true, () => {
      expect(error('boom')).toContain(ESC);
      expect(dim('quiet')).toContain(ESC);
    });
  });
});
