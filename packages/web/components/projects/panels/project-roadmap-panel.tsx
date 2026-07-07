'use client';

import type { Project, TaskSummary } from '@midnite/shared';
import { RoadmapBoard } from '@/components/roadmap/roadmap-board';

type Props = {
  project: Project;
  onSelectTask: (task: TaskSummary) => void;
};

/**
 * Phase 58 E — the Roadmap tab on the project cockpit: milestones as lanes with
 * progress + a backlog, drag-to-assign, inline milestone CRUD. Thin wrapper so
 * the detail view stays declarative (mirrors the other project panels).
 */
export function ProjectRoadmapPanel({ project, onSelectTask }: Props) {
  const tagInfo = { tag: project.tag, color: project.color };
  return <RoadmapBoard projectId={project.id} project={tagInfo} onSelectTask={onSelectTask} />;
}
