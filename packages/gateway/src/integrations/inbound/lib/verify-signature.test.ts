import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';

import { hmacHex, safeEqual, verifyGeneric, verifyGithub, verifyLinear } from './verify-signature';

const SECRET = 'insec_test';
const BODY = '{"hello":"world"}';

describe('safeEqual / hmacHex', () => {
  it('safeEqual is true only for equal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('hmacHex matches node crypto', () => {
    expect(hmacHex(SECRET, BODY)).toBe(createHmac('sha256', SECRET).update(BODY).digest('hex'));
  });
});

describe('verifyGithub', () => {
  it('accepts a genuine sha256= header, rejects tampering/absence', () => {
    const good = `sha256=${hmacHex(SECRET, BODY)}`;
    expect(verifyGithub(SECRET, BODY, good)).toBe(true);
    expect(verifyGithub(SECRET, `${BODY} `, good)).toBe(false); // body tampered
    expect(verifyGithub('other', BODY, good)).toBe(false); // wrong secret
    expect(verifyGithub(SECRET, BODY, undefined)).toBe(false);
  });
});

describe('verifyLinear', () => {
  it('accepts a bare hex header (no prefix)', () => {
    const good = hmacHex(SECRET, BODY);
    expect(verifyLinear(SECRET, BODY, good)).toBe(true);
    expect(verifyLinear(SECRET, BODY, `sha256=${good}`)).toBe(false); // wrong shape
    expect(verifyLinear(SECRET, BODY, undefined)).toBe(false);
  });
});

describe('verifyGeneric', () => {
  it('signs `${timestamp}.${body}` and needs both header + timestamp', () => {
    const ts = '1782839600000';
    const good = `sha256=${hmacHex(SECRET, `${ts}.${BODY}`)}`;
    expect(verifyGeneric(SECRET, BODY, good, ts)).toBe(true);
    expect(verifyGeneric(SECRET, BODY, good, '9999')).toBe(false); // timestamp not covered
    expect(verifyGeneric(SECRET, BODY, good, undefined)).toBe(false);
    expect(verifyGeneric(SECRET, BODY, undefined, ts)).toBe(false);
  });
});
