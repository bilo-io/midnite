import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  LocaleSchema,
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_CODES,
  resolveLocale,
} from './i18n.js';
import { DEFAULT_USER_PREFERENCES, UserPreferencesSchema } from './preferences.js';

describe('LocaleSchema', () => {
  it('accepts every supported locale code', () => {
    for (const code of SUPPORTED_LOCALE_CODES) {
      expect(LocaleSchema.parse(code)).toBe(code);
    }
  });

  it('rejects an unsupported code', () => {
    expect(LocaleSchema.safeParse('en-US').success).toBe(false);
    expect(LocaleSchema.safeParse('jp').success).toBe(false);
  });

  it('lists metadata for exactly the supported codes', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual([...SUPPORTED_LOCALE_CODES]);
  });
});

describe('UserPreferences.locale', () => {
  it('defaults to en-GB', () => {
    expect(DEFAULT_USER_PREFERENCES.locale).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe('en-GB');
  });

  it('hydrates a legacy blob with no locale to the default (additive field)', () => {
    // A pre-Phase-79 stored prefs object omits `locale` entirely.
    const legacy = { theme: 'dark', navMode: 'expanded' };
    expect(UserPreferencesSchema.parse(legacy).locale).toBe(DEFAULT_LOCALE);
  });

  it('coerces an unknown/removed locale value back to the default rather than failing', () => {
    expect(UserPreferencesSchema.parse({ locale: 'en-US' }).locale).toBe(DEFAULT_LOCALE);
  });

  it('preserves a valid explicit locale', () => {
    expect(UserPreferencesSchema.parse({ locale: 'fr-FR' }).locale).toBe('fr-FR');
  });
});

describe('resolveLocale', () => {
  const codes = SUPPORTED_LOCALE_CODES;

  it('prefers the stored preference when it is supported', () => {
    expect(resolveLocale('fr-FR', 'de-DE', codes, DEFAULT_LOCALE)).toBe('fr-FR');
  });

  it('falls back to the browser language when there is no stored pref', () => {
    expect(resolveLocale(null, 'de-DE', codes, DEFAULT_LOCALE)).toBe('de-DE');
  });

  it('matches a browser language by prefix (de-AT → de-DE)', () => {
    expect(resolveLocale(null, 'de-AT', codes, DEFAULT_LOCALE)).toBe('de-DE');
    expect(resolveLocale(undefined, 'fr', codes, DEFAULT_LOCALE)).toBe('fr-FR');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('FR-fr', null, codes, DEFAULT_LOCALE)).toBe('fr-FR');
  });

  it('falls back to the default when nothing matches', () => {
    expect(resolveLocale('jp', 'ja-JP', codes, DEFAULT_LOCALE)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null, null, codes, DEFAULT_LOCALE)).toBe(DEFAULT_LOCALE);
  });
});
