'use client';

import { Suspense } from 'react';

import { SessionDetailContainer } from './session-detail-view';

// Static-export-friendly session detail page (Phase 51 B): id from `?id=`.
// `output: 'export'` can't prerender arbitrary runtime ids, so — like
// /tasks/view, /councils/view, /ideas/view — the view reads the id from the query
// string and fetches client-side. useSearchParams needs a Suspense boundary.
export default function SessionViewPage() {
  return (
    <Suspense fallback={null}>
      <SessionDetailContainer />
    </Suspense>
  );
}
