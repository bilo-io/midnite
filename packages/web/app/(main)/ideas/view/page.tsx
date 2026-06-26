'use client';

import { Suspense } from 'react';

import IdeaDetailView from '../[id]/idea-detail-view';

// Static-export-friendly replacement for /ideas/[id]: id from ?id=.
// `output: 'export'` can't prerender arbitrary runtime ids, so — like
// /media/view and /councils/view — the detail view reads the id from the
// query string and fetches client-side. useSearchParams needs a Suspense
// boundary to satisfy the static-export prerender.
export default function IdeaViewPage() {
  return (
    <Suspense fallback={null}>
      <IdeaDetailView />
    </Suspense>
  );
}
