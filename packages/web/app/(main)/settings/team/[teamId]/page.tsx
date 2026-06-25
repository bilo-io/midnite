import { TeamDetailView } from './team-detail-view';

// Returns [] so next build (output:export) succeeds; client-side navigation
// still works when the static file server falls back to the app shell.
export function generateStaticParams() {
  return [];
}

export default function SettingsTeamDetailPage({ params }: { params: { teamId: string } }) {
  return <TeamDetailView teamId={params.teamId} />;
}
