'use client';

import { Suspense } from 'react';

import { ProjectDetailContainer } from './project-detail-view';

// Static-export-friendly project detail page (Phase 55 A): id from `?id=`.
// `output: 'export'` can't prerender arbitrary runtime ids, so — like
// /tasks/view, /sessions/view, /councils/view — the view reads the id from the
// query string and fetches client-side. useSearchParams needs a Suspense boundary.
export default function ProjectViewPage() {
  return (
    <Suspense fallback={null}>
      <ProjectDetailContainer />
    </Suspense>
  );
}
