import type { NotificationSeverity } from '@midnite/shared';

/**
 * Narrow in-app notification port (Phase 62 C). Lets the workflow `midnite.notify`
 * executor post a reporting notification WITHOUT importing `NotificationsModule`
 * (which imports `TasksModule`, which imports `WorkflowsModule` — the reverse edge
 * would be a module cycle). Bound to `NotificationsService.notifyReporting` behind
 * the `NOTIFIER` token by a `@Global` module that resolves the service lazily via
 * `ModuleRef`, so there is no construction-time cycle.
 */
export interface NotifierInput {
  kind: 'digest.generated' | 'retro.notable';
  severity: NotificationSeverity;
  title: string;
  body: string;
  /** Entity id the notification points at (task/digest id). */
  entityId: string;
  /** Client route to open. */
  route: string;
  teamId?: string | null;
}

export interface Notifier {
  notify(input: NotifierInput): Promise<void>;
}

export const NOTIFIER = Symbol('NOTIFIER');
