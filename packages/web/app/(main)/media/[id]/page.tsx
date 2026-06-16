import { notFound } from 'next/navigation';
import { MediaDetailView } from './media-detail-view';
import { getMedia, getProjects } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let media;
  let projects = [];

  try {
    [media, projects] = await Promise.all([getMedia(id), getProjects()]);
  } catch {
    notFound();
  }

  if (!media) notFound();

  return <MediaDetailView mode="edit" initial={media} projects={projects} />;
}
