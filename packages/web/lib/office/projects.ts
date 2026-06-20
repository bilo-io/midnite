/**
 * Shaping for the board room's project list. The board room is the office's
 * projects hub: it lists the live projects and opens the full project modal on
 * click. Pure data shaping (no Phaser, no React) so it's easy to test/reuse.
 */

import type { Project } from '@midnite/shared';

/** Active (non-archived) projects for the board room, alphabetised by name. */
export function boardroomProjects(projects: Project[]): Project[] {
  return projects
    .filter((p) => !p.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}
