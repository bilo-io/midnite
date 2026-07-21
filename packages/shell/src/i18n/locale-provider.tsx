'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALE_CODES,
  resolveLocale,
  type Locale,
} from '@midnite/shared';

import { SETTINGS_STORAGE_KEY } from '../appearance/constants';

/** A next-intl message catalog: nested namespaces of string values. */
export type LocaleMessages = Record<string, unknown>;

/**
 * The event the language switcher (Phase 79 Theme C) dispatches after writing the
 * new `locale` into the settings blob, so the provider re-resolves immediately
 * (same-tab `storage` events don't fire). Exported so the switcher and the
 * provider agree on one name.
 */
export const LOCALE_CHANGE_EVENT = 'midnite:locale-change';

export type LocaleProviderProps = {
  /**
   * The host app's message catalogs, keyed by locale. The catalogs live in the
   * app (`web/messages/`), not in shell — the provider only composes them. Missing
   * locales (or missing keys within a locale) fall back to `DEFAULT_LOCALE`.
   */
  catalogs: Partial<Record<Locale, LocaleMessages>>;
  children: ReactNode;
  /**
   * Force a locale, bypassing localStorage/navigator resolution. For tests and
   * SSR/story contexts where the persisted preference shouldn't be read.
   */
  initialLocale?: Locale;
};

/** Read the persisted `locale` out of the AppSettings localStorage blob, if any. */
function readStoredLocale(): string | null {
  // Defensive: a corrupt or absent blob is an expected client-storage state, not
  // an error to surface — fall back to null so resolution moves on to navigator.
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { locale?: unknown };
    return typeof parsed.locale === 'string' ? parsed.locale : null;
  } catch {
    return null;
  }
}

/** Shallow-per-namespace merge so missing keys in `active` fall back to `base`. */
function mergeCatalogs(base: LocaleMessages, active: LocaleMessages): LocaleMessages {
  const out: LocaleMessages = { ...base };
  for (const [key, value] of Object.entries(active)) {
    const prior = out[key];
    if (
      prior &&
      typeof prior === 'object' &&
      !Array.isArray(prior) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      out[key] = mergeCatalogs(prior as LocaleMessages, value as LocaleMessages);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * The locale runtime both `web` and `admin` mount (Phase 79 Theme B). Owns the
 * active-locale state and its resolution + reactivity so the apps only supply
 * their catalogs:
 *
 * - **SSR / first client render** use `DEFAULT_LOCALE` (or an explicit
 *   `initialLocale`) so hydration always matches; the persisted locale is read on
 *   mount and applied, which is invisible while no copy is translated yet.
 * - **Reactive**: re-resolves on `storage` events (other tabs) and on the
 *   `LOCALE_CHANGE_EVENT` the switcher fires (this tab).
 * - **Fallback**: the active catalog is merged over `DEFAULT_LOCALE`'s, so an
 *   untranslated key renders the source (en-GB) string rather than the raw key.
 */
export function LocaleProvider({ catalogs, children, initialLocale }: LocaleProviderProps) {
  const resolve = (): Locale =>
    initialLocale ??
    resolveLocale(
      typeof window === 'undefined' ? null : readStoredLocale(),
      typeof navigator === 'undefined' ? null : navigator.language,
      SUPPORTED_LOCALE_CODES,
      DEFAULT_LOCALE,
    );

  const [locale, setLocale] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(resolve());
    const update = () => setLocale(resolve());
    window.addEventListener('storage', update);
    window.addEventListener(LOCALE_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(LOCALE_CHANGE_EVENT, update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

  const base = catalogs[DEFAULT_LOCALE] ?? {};
  const active = catalogs[locale] ?? {};
  const messages = locale === DEFAULT_LOCALE ? base : mergeCatalogs(base, active);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
