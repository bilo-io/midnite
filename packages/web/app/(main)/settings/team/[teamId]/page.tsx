import { TeamDetailView } from './team-detail-view';

// Returns [] so next build (output:export) succeeds; client-side navigation
// to /settings/team/[teamId] still works as long as the static file server
// falls back to the app shell (index.html).
export async function generateStaticParams() {
  return [];
}

export default async function SettingsTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <TeamDetailView teamId={teamId} />;
}
