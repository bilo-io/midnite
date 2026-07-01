import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isJsonMode, printJson, printJsonError, setJsonMode } from './output';

const origNoColor = process.env.NO_COLOR;

beforeEach(() => {
  setJsonMode(false);
  delete process.env.NO_COLOR;
});

afterEach(() => {
  setJsonMode(false);
  if (origNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = origNoColor;
  vi.restoreAllMocks();
});

describe('json mode flag', () => {
  it('defaults off and toggles on', () => {
    expect(isJsonMode()).toBe(false);
    setJsonMode(true);
    expect(isJsonMode()).toBe(true);
  });

  it('enabling forces NO_COLOR so the shared chrome gate goes silent', () => {
    expect(process.env.NO_COLOR).toBeUndefined();
    setJsonMode(true);
    expect(process.env.NO_COLOR).toBe('1');
  });

  it('disabling does not clear NO_COLOR (caller/env owns it)', () => {
    setJsonMode(true);
    setJsonMode(false);
    expect(process.env.NO_COLOR).toBe('1');
  });
});

describe('printJson', () => {
  it('writes one pretty JSON value + newline to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    printJson({ id: 't1', nested: [1, 2] });
    expect(spy).toHaveBeenCalledTimes(1);
    const out = spy.mock.calls[0]![0] as string;
    expect(out.endsWith('\n')).toBe(true);
    expect(JSON.parse(out)).toEqual({ id: 't1', nested: [1, 2] });
    expect(out).toContain('\n  '); // pretty-printed (indented)
  });
});

describe('printJsonError', () => {
  it('writes { error } to stderr from an Error', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    printJsonError(new Error('boom'));
    const out = spy.mock.calls[0]![0] as string;
    expect(JSON.parse(out)).toEqual({ error: 'boom' });
  });

  it('coerces a non-Error to a string message', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    printJsonError('not authenticated');
    expect(JSON.parse(spy.mock.calls[0]![0] as string)).toEqual({ error: 'not authenticated' });
  });
});
