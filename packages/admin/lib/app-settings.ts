/**
 * The admin console's client-side settings, persisted to localStorage under the
 * SAME key `@midnite/shell` reads pre-paint (`SETTINGS_STORAGE_KEY`). Deliberately
 * lean: the synced `UserPreferences` appearance shape from `@midnite/shared` (minus
 * `theme`, which keeps its own store via the `@midnite/ui` theme-context) plus the
 * one device-local operational toggle admin needs — the screen lock.
 */

import { DEFAULT_USER_PREFERENCES, BRAND_ACCENT, SECONDARY_ACCENT_OFF, type UserPreferences } from '@midnite/shared';
import { SETTINGS_STORAGE_KEY } from '@midnite/shell';

export { SETTINGS_STORAGE_KEY, BRAND_ACCENT, SECONDARY_ACCENT_OFF };

/** Default primary accent — the brand gradient (mirrors web). */
export const ACCENT_DEFAULT = BRAND_ACCENT;

/** Inactivity before the screen lock kicks in, in seconds (clamp bounds). */
export const INACTIVITY_MIN_S = 10;
export const INACTIVITY_MAX_S = 14400; // 4 hours

/**
 * The full client settings blob persisted under `midnite.settings`: the synced
 * appearance preferences (minus `theme`) plus admin's device-local screen-lock
 * toggle. Every appearance field is populated from `DEFAULT_SETTINGS`, so readers
 * never see an `undefined` appearance value.
 */
export type AppSettings = Omit<UserPreferences, 'theme'> & {
  /** Enable the idle screen lock (screensaver on the starfield). */
  screenLock: boolean;
};

// The synced-field defaults come from the shared contract (single source of truth);
// `theme` is dropped (it lives in the theme-context store).
const { theme: _theme, ...SYNCED_DEFAULTS } = DEFAULT_USER_PREFERENCES;

export const DEFAULT_SETTINGS: AppSettings = {
  ...SYNCED_DEFAULTS,
  screenLock: false,
};
