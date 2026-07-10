'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getWorkflow } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { DesktopOnly } from '@/components/desktop-only';
import { ResourceNotFound } from '@/components/resource-not-found';
import dynamic from 'next/dynamic';

const WorkflowEditor = dynamic(
  () => import('@/components/workflow-editor').then((m) => m.WorkflowEditor),
  { ssr: false },
);

// Static-export-friendly replacement for the old /workflows/[id] dynamic route:
// the id comes from ?id= and the workflow is fetched client-side.
function Editor() {
  const id = useSearchParams().get('id') ?? '';
  const { data: workflow, loading, error } = useApiData(() => getWorkflow(id), [id]);

  // Only bail to "not found" when we genuinely have no workflow to show. A bare
  // `error` check would also fire on a *background* refetch failure (useApiData now
  // re-fetches on every global invalidateData()), tearing down a fully-loaded
  // editor — and any unsaved canvas edits — over a transient blip. As long as a
  // workflow is in hand, keep rendering the editor.
  if (!id || (!workflow && (error || !loading))) {
    return <ResourceNotFound feature="workflows" singular="workflow" />;
  }
  if (!workflow) return null;
  return <WorkflowEditor workflow={workflow} />;
}

export default function WorkflowEditPage() {
  return (
    <DesktopOnly label="The workflow editor">
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </DesktopOnly>
  );
}
