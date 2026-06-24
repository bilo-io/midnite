/**
 * Maps live gateway sessions to office desk occupants. Keeps the office palette
 * in lockstep with the Sessions page by deriving everything from the same
 * `SESSION_STATUS_*` constants, so a status looks identical in both places.
 */

import type { SessionSummary, Status, Task } from '@midnite/shared';
import { SESSION_STATUS_HUE, SESSION_STATUS_LABEL } from '@/components/session-card';

export type OfficeStatus = SessionSummary['status']; // 'running' | 'waiting' | 'completed' | 'idle'

export interface OfficeAgent {
  /** Session id — also the desk/agent id the player walks up to. */
  id: string;
  /** Display name (session title). */
  name: string;
  /** Project the session belongs to. */
  project: string;
  status: OfficeStatus;
  /**
   * Task status driving room routing (Phase 31 B). Present when the session
   * is linked to a task; absent for orphaned sessions (treated as `wip`).
   * Determines desk/board/lounge placement — see `statusToRoom` in layout.ts.
   */
  taskStatus?: Status;
  /** One-liner of what they're up to. */
  activity: string;
  /**
   * Live activity patch from `agent.activity` WS events (Phase 31 C/D).
   * Absent until the first event; cleared on idle/stop.
   */
  liveActivity?: {
    phase: 'running' | 'blocked' | 'idle';
    tool?: string;
    label?: string;
  };
  /**
   * Set when the agent needs user input (`agent.attention` event, Phase 31 D).
   * Drives the orange pulse in the scene and the HUD badge.
   * Cleared when the agent resumes (next activity with phase 'running'/'idle').
   */
  attention?: {
    reason: 'approval' | 'waiting';
    summary?: string;
  };
  /** The underlying session — used to open the live terminal / transcript. */
  session: SessionSummary;
}

/** Parse a `"142 71% 45%"` HSL triplet into 0xRRGGBB for Phaser tints. */
export function hslTripletToInt(triplet: string): number {
  const parts = triplet.split(/\s+/);
  const h = parseFloat(parts[0] ?? '0') / 360;
  const s = parseFloat(parts[1] ?? '0') / 100;
  const l = parseFloat(parts[2] ?? '0') / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return (v << 16) | (v << 8) | v;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(h) * 255);
  const b = Math.round(hue2rgb(h - 1 / 3) * 255);
  return (r << 16) | (g << 8) | b;
}

const STATUSES = Object.keys(SESSION_STATUS_HUE) as OfficeStatus[];

/** Phaser tint per status (numeric). */
export const STATUS_TINT = Object.fromEntries(
  STATUSES.map((k) => [k, hslTripletToInt(SESSION_STATUS_HUE[k])]),
) as Record<OfficeStatus, number>;

/** CSS colour per status, for the React HUD. */
export const STATUS_CSS = Object.fromEntries(
  STATUSES.map((k) => [k, `hsl(${SESSION_STATUS_HUE[k]})`]),
) as Record<OfficeStatus, string>;

export const STATUS_LABEL = SESSION_STATUS_LABEL;

/**
 * Active (non-archived) sessions → desk occupants, most-recently-active first so
 * desk assignment is stable across refetches. Activity falls back to the linked
 * task's title when the session has no subtitle.
 */
export function sessionsToOfficeAgents(sessions: SessionSummary[], tasks: Task[]): OfficeAgent[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  return sessions
    .filter((s) => !s.archivedAt)
    .slice()
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .map((s) => {
      const task = s.linkedTaskId ? taskById.get(s.linkedTaskId) : undefined;
      return {
        id: s.id,
        name: s.title || s.projectDisplay || 'Session',
        project: s.projectDisplay,
        status: s.status,
        taskStatus: task?.status,
        activity: s.subtitle || task?.title || '—',
        session: s,
      };
    });
}
