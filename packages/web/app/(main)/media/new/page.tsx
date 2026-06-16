import type { MediaType } from '@midnite/shared';
import { MEDIA_TYPES } from '@midnite/shared';
import { MediaDetailView } from '../[id]/media-detail-view';
import { getProjects } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function NewMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: rawType } = await searchParams;
  const type: MediaType = MEDIA_TYPES.includes(rawType as MediaType)
    ? (rawType as MediaType)
    : 'image';

  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  try {
    projects = await getProjects();
  } catch {
    // non-fatal — projects are optional
  }

  return <MediaDetailView mode="create" initialType={type} projects={projects} />;
}
