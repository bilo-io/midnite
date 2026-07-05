'use client';

import { PhaseDocsTab } from '@/components/projects/phase-docs/PhaseDocsTab';

type Props = {
  projectId: string;
};

/**
 * The project's GitHub-backed phase docs (Phase 55 B) — a thin wrapper over the
 * existing {@link PhaseDocsTab} so the modal + detail page share one surface.
 */
export function ProjectPhaseDocsPanel({ projectId }: Props) {
  return <PhaseDocsTab projectId={projectId} />;
}
