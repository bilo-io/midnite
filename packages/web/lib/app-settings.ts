/**
 * Client-side settings & profile, persisted to localStorage for now. These will
 * eventually be backed by the gateway config (`midnite.json`) and a user record,
 * but the shapes here are the source of truth the UI reads from.
 */

export const AGENT_POOL_MIN = 1;
export const AGENT_POOL_DEFAULT = 4;
export const AGENT_POOL_MAX = 16;

// Inactivity before the screensaver kicks in, in seconds.
export const INACTIVITY_MIN_S = 10;
export const INACTIVITY_DEFAULT_S = 30;
export const INACTIVITY_MAX_S = 14400; // 4 hours

/**
 * Snap points for the inactivity slider, ascending — quick locks through to
 * multi-hour waits. The slider steps across these by index rather than scrubbing
 * a continuous range, which would be unusable across a 10s–4h span.
 */
export const INACTIVITY_PRESETS_S = [
  10, 15, 20, 30, 45, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600, 7200, 10800, 14400,
] as const;

/** Index of the preset nearest to `seconds` (handles legacy non-preset values). */
export function nearestInactivityPresetIndex(seconds: number): number {
  let best = 0;
  for (let i = 1; i < INACTIVITY_PRESETS_S.length; i++) {
    if (Math.abs(INACTIVITY_PRESETS_S[i]! - seconds) < Math.abs(INACTIVITY_PRESETS_S[best]! - seconds)) {
      best = i;
    }
  }
  return best;
}

// Primary-agent heartbeat cadence, in hours: the orchestrator's heartbeat
// prompt runs on this interval. Once an hour at the most frequent, roughly once
// a month at the least.
export const HEARTBEAT_MIN_H = 1;
export const HEARTBEAT_DEFAULT_H = 4;
export const HEARTBEAT_MAX_H = 720; // ~30 days

/** Selectable cadences shown in the settings dropdown, in ascending order. */
export const HEARTBEAT_PRESETS: { hours: number; label: string }[] = [
  { hours: 1, label: 'Every hour' },
  { hours: 4, label: 'Every 4 hours' },
  { hours: 8, label: 'Every 8 hours' },
  { hours: 12, label: 'Every 12 hours' },
  { hours: 24, label: 'Once a day' },
  { hours: 168, label: 'Once a week' },
  { hours: 720, label: 'Once a month' },
];

/** Human label for a heartbeat cadence, falling back to a terse "Every Nh/Nd". */
export function formatHeartbeatInterval(hours: number): string {
  const preset = HEARTBEAT_PRESETS.find((p) => p.hours === hours);
  if (preset) return preset.label;
  if (hours < 24) return `Every ${hours}h`;
  return `Every ${Math.round(hours / 24)}d`;
}

export type AppSettings = {
  /** Number of Claude Code sessions allowed to run in parallel. */
  agentPoolSize: number;
  /** Seconds of inactivity before the screensaver opens. */
  inactivityTimeoutS: number;
  /** Require a passcode to wake the screensaver. */
  requirePasscode: boolean;
  /**
   * Only enforce the passcode when the screensaver was opened deliberately via
   * the lock button — the idle screensaver wakes without one.
   */
  passcodeOnlyWhenLocked: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  agentPoolSize: AGENT_POOL_DEFAULT,
  inactivityTimeoutS: INACTIVITY_DEFAULT_S,
  requirePasscode: false,
  passcodeOnlyWhenLocked: false,
};

export const SETTINGS_STORAGE_KEY = 'midnite.settings';

/** Length of the screensaver passcode, in digits. */
export const PASSCODE_LENGTH = 4;

/**
 * Where the screensaver passcode is kept. Stored in plain localStorage so a
 * forgotten passcode can simply be cleared — this is a convenience lock, not a
 * security boundary.
 */
export const PASSCODE_STORAGE_KEY = 'midnite.passcode';

export type Profile = {
  /** Free-form "about me" the user writes about themselves. */
  about: string;
  /** Guidance injected into every session, on top of project-level guidelines. */
  guidelines: string;
};

export const DEFAULT_PROFILE: Profile = {
  about: '',
  guidelines: '',
};

export const PROFILE_STORAGE_KEY = 'midnite.profile';
