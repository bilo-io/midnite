'use client';

import { useSearchParams } from 'next/navigation';
import { TeamDetailView } from '../[teamId]/team-detail-view';

export default function SettingsTeamDetailPage() {
  const params = useSearchParams();
  const teamId = params.get('id') ?? '';
  return <TeamDetailView teamId={teamId} />;
}
