import { afterEach, describe, expect, it } from 'vitest';

import { BRAND_ACCENT, accent, banner, getVersion, isInteractive, logoLines } from './brand.js';

/** Run `fn` with stdout pretending to be (or not be) a TTY and a chosen NO_COLOR. */
function withTerminal(opts: { tty: boolean; noColor?: string }, fn: () => void): void {
  const desc = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const prevNoColor = process.env.NO_COLOR;
  Object.defineProperty(process.stdout, 'isTTY', { value: opts.tty, configurable: true });
  if (opts.noColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = opts.noColor;
  try {
    fn();
  } finally {
    if (desc) Object.defineProperty(process.stdout, 'isTTY', desc);
    else delete (process.stdout as { isTTY?: boolean }).isTTY;
    if (prevNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = prevNoColor;
  }
}

afterEach(() => {
  delete process.env.NO_COLOR;
});

describe('logoLines', () => {
  it('renders a rectangular grid of the right size (cols = 2× rows)', () => {
    const lines = logoLines(8);
    expect(lines).toHaveLength(8);
    for (const line of lines) expect(line).toHaveLength(16);
  });

  it('draws the split disc with both quadrant tones and blank corners', () => {
    const joined = logoLines(8).join('\n');
    expect(joined).toContain('█'); // solid quadrants
    expect(joined).toContain('▒'); // light quadrants
    expect(joined).toContain(' '); // outside the disc
  });

  it('is deterministic', () => {
    expect(logoLines(6)).toEqual(logoLines(6));
  });
});

describe('isInteractive', () => {
  it('is true on a TTY without NO_COLOR', () => {
    withTerminal({ tty: true }, () => expect(isInteractive()).toBe(true));
  });

  it('is false when piped (no TTY)', () => {
    withTerminal({ tty: false }, () => expect(isInteractive()).toBe(false));
  });

  it('is false when NO_COLOR is set, even on a TTY', () => {
    withTerminal({ tty: true, noColor: '1' }, () => expect(isInteractive()).toBe(false));
  });
});

describe('accent', () => {
  it('wraps in ANSI when interactive', () => {
    withTerminal({ tty: true }, () => {
      const out = accent('midnite');
      expect(out).toContain('midnite');
      expect(out).toContain('\x1b['); // an escape sequence is present
      expect(out).not.toBe('midnite');
    });
  });

  it('returns bare text when not interactive', () => {
    withTerminal({ tty: false }, () => expect(accent('midnite')).toBe('midnite'));
  });
});

describe('getVersion', () => {
  it('reads a semver string from package.json', () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('banner', () => {
  it('includes the wordmark, version and tagline', () => {
    withTerminal({ tty: false }, () => {
      const out = banner();
      expect(out).toContain('midnite');
      expect(out).toContain(`v${getVersion()}`);
      expect(out).toContain('multitask orchestrator for Claude Code');
      expect(out).not.toContain('\x1b['); // plain when not interactive
    });
  });
});

describe('BRAND_ACCENT', () => {
  it('is the Claude burnt-orange hex', () => {
    expect(BRAND_ACCENT).toBe('#D97757');
  });
});
