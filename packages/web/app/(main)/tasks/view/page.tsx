'use client';

import { Suspense } from 'react';

import { TaskDetailView } from '../[id]/task-detail-view';

// Static-export-friendly task detail page (Phase 42 Theme A): id from ?id=.
// `output: 'export'` can't prerender arbitrary runtime ids, so — like
// /ideas/view, /councils/view, /media/view — the detail view reads the id from
// the query string and fetches client-side. useSearchParams needs a Suspense
// boundary to satisfy the static-export prerender.
export default function TaskViewPage() {
  return (
    <Suspense fallback={null}>
      <TaskDetailView />
    </Suspense>
  );
}
