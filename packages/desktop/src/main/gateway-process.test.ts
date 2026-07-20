import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { findFreePort, isPortFree, parseEnvFile, resolveGatewayPort } from './gateway-process';

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

describe('isPortFree', () => {
  const servers: import('node:net').Server[] = [];
  afterEach(() => {
    for (const s of servers.splice(0)) s.close();
  });

  it('is true for an unbound port and false once something is listening', async () => {
    const port = await findFreePort();
    expect(await isPortFree(port)).toBe(true);
    await new Promise<void>((resolve) => {
      const srv = createServer();
      servers.push(srv);
      srv.listen(port, '127.0.0.1', () => resolve());
    });
    expect(await isPortFree(port)).toBe(false);
  });
});

describe('resolveGatewayPort', () => {
  afterEach(() => {
    delete process.env['MIDNITE_GATEWAY_PORT'];
  });

  it('honours an explicit $MIDNITE_GATEWAY_PORT', async () => {
    process.env['MIDNITE_GATEWAY_PORT'] = '61234';
    expect(await resolveGatewayPort()).toBe(61234);
  });

  it('ignores a non-numeric $MIDNITE_GATEWAY_PORT and resolves a real port', async () => {
    process.env['MIDNITE_GATEWAY_PORT'] = 'not-a-port';
    const port = await resolveGatewayPort();
    expect(Number.isInteger(port)).toBe(true);
    expect(port).toBeGreaterThan(0);
  });
});
