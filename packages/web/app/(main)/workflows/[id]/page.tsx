import { notFound } from 'next/navigation';
import { getWorkflow } from '@/lib/api';
import { WorkflowEditor } from '@/components/workflow-editor';

export const dynamic = 'force-dynamic';

export default async function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = await getWorkflow(id).catch(() => null);
  if (!workflow) notFound();
  return <WorkflowEditor workflow={workflow} />;
}
