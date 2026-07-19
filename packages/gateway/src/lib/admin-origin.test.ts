import { describe, expect, it } from 'vitest';
import { mergeAllowedOrigins, parseAdminOrigins } from './admin-origin';

describe('parseAdminOrigins', () => {
  it('returns [] for unset / empty input', () => {
    expect(parseAdminOrigins(undefined)).toEqual([]);
    expect(parseAdminOrigins(null)).toEqual([]);
    expect(parseAdminOrigins('')).toEqual([]);
    expect(parseAdminOrigins('   ')).toEqual([]);
  });

  it('parses a single origin', () => {
    expect(parseAdminOrigins('https://admin.midnite.example.com')).toEqual([
      'https://admin.midnite.example.com',
    ]);
  });

  it('parses a comma-separated list, trimming whitespace', () => {
    expect(parseAdminOrigins('https://admin.example.com, https://ops.example.com')).toEqual([
      'https://admin.example.com',
      'https://ops.example.com',
    ]);
  });

  it('drops blank entries and dedupes', () => {
    expect(parseAdminOrigins('https://a.com,,https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
});

describe('mergeAllowedOrigins', () => {
  it('appends new origins without reordering the base list', () => {
    expect(mergeAllowedOrigins(['https://web.example.com'], ['https://admin.example.com'])).toEqual([
      'https://web.example.com',
      'https://admin.example.com',
    ]);
  });

  it('drops duplicates already in the base list', () => {
    expect(
      mergeAllowedOrigins(['https://web.example.com'], ['https://web.example.com']),
    ).toEqual(['https://web.example.com']);
  });

  it('is a no-op when there is nothing to add', () => {
    expect(mergeAllowedOrigins(['https://web.example.com'], [])).toEqual([
      'https://web.example.com',
    ]);
  });
});
