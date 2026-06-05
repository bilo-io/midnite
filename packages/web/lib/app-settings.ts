/**
 * Client-side settings & profile, persisted to localStorage for now. These will
 * eventually be backed by the gateway config (`midnite.json`) and a user record,
 * but the shapes here are the source of truth the UI reads from.
 */

export const AGENT_POOL_MIN = 1;
export const AGENT_POOL_DEFAULT = 4;
export const AGENT_POOL_MAX = 16;

export type AppSettings = {
  /** Number of Claude Code sessions allowed to run in parallel. */
  agentPoolSize: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  agentPoolSize: AGENT_POOL_DEFAULT,
};

export const SETTINGS_STORAGE_KEY = 'midnite.settings';

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
