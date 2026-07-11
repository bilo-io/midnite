import type { TaskSummary } from '@midnite/shared';

import type { DigestBlock } from './lib/build-digest';

/**
 * Narrow digest-build port (Phase 62 C). Lets the workflow `midnite.build-digest`
 * executor build + persist a digest WITHOUT importing `DigestsModule` (which
 * imports `TasksModule → WorkflowsModule` — the reverse edge would be a module
 * cycle). Bound to `DigestBuilderService` behind the `DIGEST_BUILDER` token by a
 * `@Global` module that resolves the service lazily via `ModuleRef`.
 */
export interface DigestBuildRequest {
  /** Window start (inclusive ISO). */
  from: string;
  /** Window end (inclusive ISO). */
  to: string;
  repo?: string;
  projectId?: string;
  /** Terminal-task summaries from an upstream `list-completed-tasks`; when absent
   *  the builder queries the window itself. */
  tasks?: TaskSummary[];
}

export interface DigestBuildResult {
  digestId: string;
  headline: string;
  markdown: string;
  blocks: DigestBlock[];
}

export interface DigestBuilderPort {
  build(req: DigestBuildRequest): Promise<DigestBuildResult>;
}

export const DIGEST_BUILDER = Symbol('DIGEST_BUILDER');
