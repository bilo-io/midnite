import { describe, expect, it } from 'vitest';
import { cleanPtyOutput, stripAnsi } from './clean-output';

describe('stripAnsi', () => {
  it('removes CSI color and cursor sequences', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m and \x1b[2K\x1b[1Gplain')).toBe('red and plain');
  });

  it('removes OSC title sequences (BEL- and ST-terminated)', () => {
    expect(stripAnsi('\x1b]0;my title\x07text')).toBe('text');
    expect(stripAnsi('\x1b]0;my title\x1b\\text')).toBe('text');
  });

  it('leaves plain text untouched', () => {
    expect(stripAnsi('no escapes here')).toBe('no escapes here');
  });
});

describe('cleanPtyOutput', () => {
  it('normalizes CRLF to LF', () => {
    expect(cleanPtyOutput('line one\r\nline two\r\n')).toBe('line one\nline two');
  });

  it('keeps only the final frame of CR-overwritten spinner lines', () => {
    expect(cleanPtyOutput('spinner |\rspinner /\rdone.\n')).toBe('done.');
  });

  it('drops stray control characters and collapses blank-line runs', () => {
    expect(cleanPtyOutput('a\x07\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips ANSI then trims', () => {
    expect(cleanPtyOutput('\x1b[1m  Position:\x1b[0m hold steady  \n')).toBe('Position: hold steady');
  });
});
