'use client';

import Link from 'next/link';
import { projectPageHref } from '@/lib/project-route';

/**
 * A project's name as it appears in an accordion header — a link to that
 * project's detail page. Clicks are stopped from bubbling so hitting the name
 * navigates instead of toggling the surrounding section (the accordion header
 * is a `role="button"` div precisely so it can host this nested link).
 *
 * `projectId` is optional: synthetic groups ("Unassigned", "Global") have no
 * project to navigate to and render as plain text.
 */
export function ProjectNameLink({ projectId, name }: { projectId?: string; name: string }) {
  if (!projectId) return <>{name}</>;
  return (
    <Link
      href={projectPageHref(projectId)}
      onClick={(e) => e.stopPropagation()}
      className="hover:underline"
    >
      {name}
    </Link>
  );
}
