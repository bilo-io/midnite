import { z } from 'zod';
import { StatusSchema } from './task.js';

/**
 * Operator-console contracts (Phase 73 D). The cross-tenant read shapes the
 * standalone `admin` app consumes over the operator-gated `GET /admin/*` routes.
 * These are **summaries** — deliberately leaner than the full domain entities —
 * composed by the gateway from existing services; no new tables. Operator access
 * is gated by `@RequiresOperator` (see `isOperatorEmail` in `config.ts`).
 */

/** One row in the platform-wide user list (`GET /admin/users`). */
export const AdminUserSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  /** SSO avatar when known; absent for password-only users. */
  avatarUrl: z.string().url().optional(),
  /** How many teams this user belongs to. */
  teamCount: z.number().int().nonnegative(),
});
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;

/** One row in the platform-wide team list (`GET /admin/teams`). */
export const AdminTeamSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.string(),
  /** Number of members in the team. */
  memberCount: z.number().int().nonnegative(),
});
export type AdminTeamSummary = z.infer<typeof AdminTeamSummarySchema>;

/**
 * Platform KPIs for the operator console's Overview (`GET /admin/overview`) —
 * a cross-tenant roll-up composed from existing services. `costUsd` is the
 * all-time estimated spend (gateway LLM + agent-session cost); `activeSessions`
 * is the count of running agents (tasks in `wip`, which are 1:1 with a live session).
 */
export const PlatformOverviewSchema = z.object({
  users: z.number().int().nonnegative(),
  teams: z.number().int().nonnegative(),
  projects: z.number().int().nonnegative(),
  /** Task counts keyed by lifecycle status (backlog/todo/wip/waiting/done/abandoned). */
  tasks: z.record(StatusSchema, z.number().int().nonnegative()),
  /** Running agent sessions (= `tasks.wip`). */
  activeSessions: z.number().int().nonnegative(),
  /** All-time estimated spend in USD (gateway LLM + measured/estimated session cost). */
  costUsd: z.number().nonnegative(),
});
export type PlatformOverview = z.infer<typeof PlatformOverviewSchema>;
