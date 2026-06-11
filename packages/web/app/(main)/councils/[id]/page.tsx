import { notFound } from 'next/navigation';
import type { CouncilRun } from '@midnite/shared';
import { getCouncil, listCouncilRuns } from '@/lib/api';
import { CouncilDetailView } from './council-detail-view';

export const dynamic = 'force-dynamic';

export default async function CouncilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const council = await getCouncil(id).catch(() => null);
  if (!council) notFound();
  const runs: CouncilRun[] = await listCouncilRuns(id).catch(() => []);
  return <CouncilDetailView initial={council} initialRuns={runs} />;
}
