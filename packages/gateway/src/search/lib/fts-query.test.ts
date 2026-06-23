import { describe, expect, it } from 'vitest';
import { toFtsMatchQuery } from './fts-query';

describe('toFtsMatchQuery', () => {
  it('quotes each term as a prefix match joined by implicit AND', () => {
    expect(toFtsMatchQuery('oauth login')).toBe('"oauth"* "login"*');
  });

  it('neutralises FTS5 syntax characters that would otherwise error', () => {
    // quotes, parens, NEAR, column filters, `-` — all become plain prefix terms
    expect(toFtsMatchQuery('foo* "bar" -baz (qux) a:b')).toBe(
      '"foo"* "bar"* "baz"* "qux"* "a"* "b"*',
    );
  });

  it('keeps unicode letters and digits', () => {
    expect(toFtsMatchQuery('café 2024')).toBe('"café"* "2024"*');
  });

  it('returns null when there is nothing searchable', () => {
    expect(toFtsMatchQuery('   ')).toBeNull();
    expect(toFtsMatchQuery('!!!')).toBeNull();
    expect(toFtsMatchQuery('')).toBeNull();
  });

  it('caps the number of terms', () => {
    const many = Array.from({ length: 50 }, (_, i) => `t${i}`).join(' ');
    const terms = toFtsMatchQuery(many)!.split(' ');
    expect(terms).toHaveLength(16);
  });
});
