'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getWorkflow } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { WorkflowEditor } from '@/components/workflow-editor';

// Static-export-friendly replacement for the old /workflows/[id] dynamic route:
// the id comes from ?id= and the workflow is fetched client-side.
function Editor() {
  const id = useSearchParams().get('id') ?? '';
  const { data: workflow, loading, error } = useApiData(() => getWorkflow(id), [id]);

  if (!id || error || (!loading && !workflow)) {
    return <div className="container py-12 text-sm text-muted-foreground">Workflow not found.</div>;
  }
  if (!workflow) return null;
  return <WorkflowEditor workflow={workflow} />;
}

export default function WorkflowEditPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
