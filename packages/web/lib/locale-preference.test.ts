import { LOCALE_CHANGE_EVENT } from '@midnite/shell';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/app-settings';
import { setLocalePreference } from './locale-preference';

describe('setLocalePreference (Phase 79 C — one write path)', () => {
  it('merges locale into settings via the provided setter', () => {
    const setSettings = vi.fn();
    setLocalePreference(setSettings, 'de-DE');

    expect(setSettings).toHaveBeenCalledTimes(1);
    const updater = setSettings.mock.calls[0]![0] as (prev: AppSettings) => AppSettings;
    const next = updater(DEFAULT_SETTINGS);
    expect(next.locale).toBe('de-DE');
    // Untouched fields survive (it merges, not replaces).
    expect(next.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('fires LOCALE_CHANGE_EVENT so the provider re-resolves in the same tab', () => {
    const onChange = vi.fn();
    window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
    setLocalePreference(vi.fn(), 'fr-FR');
    expect(onChange).toHaveBeenCalledTimes(1);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
  });
});
