import type { Media, Project } from '@midnite/shared';
import { MediaView } from './media-view';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getProjects, listMedia } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  let items: Media[] = [];
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    [items, projects] = await Promise.all([listMedia(), getProjects()]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load media';
  }

  return (
    <>
      <PageHeader
        title="Media"
        icon="Images"
        actions={<SearchBar placeholder="Search media" />}
      />
      <MediaView items={items} projects={projects} error={error} />
    </>
  );
}
