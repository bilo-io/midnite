import type { SetupItemId, SetupItemState } from '@midnite/shared';

// Shared presentation bits for the setup-readiness checklist (Phase 19), used by
// both the soft first-run nudge (Theme C) and the ongoing Status panel (Theme D)
// so the two surfaces stay visually + behaviourally in lock-step.

// Status-dot colours mirror the system toolchain checker (env-tool-card).
export const SETUP_DOT: Record<SetupItemState, string> = {
  ok: 'hsl(142 71% 45%)',
  warn: 'hsl(38 92% 50%)',
  missing: 'hsl(0 72% 55%)',
};

// Where each checklist item is fixed — deep-links into the existing settings
// surfaces (the dedicated guided wizard is Theme B, not built yet).
export const SETUP_ITEM_HREF: Record<SetupItemId, string> = {
  provider: '/settings/agents',
  'secret-key': '/settings/system',
  'agent-cli': '/settings/system',
  'agent-pool': '/settings/agents',
  repo: '/settings/repos',
};
