'use client';

import type { Dispatch, SetStateAction } from 'react';
import { LOCALE_CHANGE_EVENT } from '@midnite/shell';
import type { Locale } from '@midnite/shared';

import type { AppSettings } from '@/lib/app-settings';

type SetSettings = Dispatch<SetStateAction<AppSettings>>;

/**
 * The single write path for the active locale (Phase 79 Theme C).
 *
 * Both entry points — the sidenav-footer switcher and the Settings → Appearance
 * picker — call this with their *own* `setSettings` (never a second
 * `useLocalStorage` on the same key, which would clobber the host component's other
 * pref writes). It persists `prefs.locale` (Theme A — local mirror + Phase 43 sync)
 * and fires `LOCALE_CHANGE_EVENT` so the shell `LocaleProvider` re-resolves in the
 * same tab (a same-tab `localStorage` write emits no `storage` event).
 */
export function setLocalePreference(setSettings: SetSettings, next: Locale): void {
  setSettings((prev) => ({ ...prev, locale: next }));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }
}
