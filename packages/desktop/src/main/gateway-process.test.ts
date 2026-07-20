import { describe, expect, it } from 'vitest';

import { parseEnvFile } from './gateway-process';

describe('parseEnvFile', () => {
  it('parses KEY=VALUE lines', () => {
    expect(parseEnvFile('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('skips blank lines and # comments', () => {
    expect(parseEnvFile('# a comment\n\nFOO=bar\n   # indented comment\n')).toEqual({ FOO: 'bar' });
  });

  it('strips surrounding single and double quotes', () => {
    expect(parseEnvFile(`A="one two"\nB='three'`)).toEqual({ A: 'one two', B: 'three' });
  });

  it('keeps `=` characters inside the value (e.g. base64 secrets)', () => {
    expect(parseEnvFile('JWT_SECRET=aGVsbG8=world=')).toEqual({ JWT_SECRET: 'aGVsbG8=world=' });
  });

  it('trims whitespace around key and value', () => {
    expect(parseEnvFile('  FOO =  bar  ')).toEqual({ FOO: 'bar' });
  });

  it('ignores lines with no key before the `=`', () => {
    expect(parseEnvFile('=novalue\nFOO=bar')).toEqual({ FOO: 'bar' });
  });
});
