'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TeamDetailView } from '../[teamId]/team-detail-view';

function TeamDetailPageContent() {
  const params = useSearchParams();
  const teamId = params.get('id') ?? '';
  return <TeamDetailView teamId={teamId} />;
}

export default function SettingsTeamDetailPage() {
  return (
    <Suspense>
      <TeamDetailPageContent />
    </Suspense>
  );
}
