import { TeamDetailView } from './team-detail-view';

export default function SettingsTeamDetailPage({ params }: { params: { teamId: string } }) {
  return <TeamDetailView teamId={params.teamId} />;
}
